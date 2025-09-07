import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient, getMongoUriInfo, parseMongoUri } from "@/server/db/mongo";
import dns from "dns/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { base, token, paths } = getBotConfig();
    const { dbName, tokenCalls, users } = getDbAndCollections();

    const uriInfo = getMongoUriInfo();
    const parsed = uriInfo.uri ? parseMongoUri(uriInfo.uri) : ({ kind: null, host: null } as any);

    let srvLookup: any = undefined;
    if (parsed?.kind === "srv" && parsed?.host) {
      try {
        const records = await dns.resolveSrv(`_mongodb._tcp.${parsed.host}`);
        srvLookup = { ok: true, records: records.length };
      } catch (e: unknown) {
        srvLookup = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }

    const result: any = {
      ok: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      mongodb: {
        hasPublicUrl: Boolean(process.env.MONGO_PUBLIC_URL),
        hasInternalUrl: Boolean(process.env.MONGO_URL),
        hasMongodbUri: Boolean(process.env.MONGODB_URI),
        uriSource: uriInfo.source,
        uriKind: parsed?.kind || null,
        hostPreview: parsed?.host || null,
        srvLookup,
        dbName,
        collections: { tokenCalls, users },
      },
      botApi: {
        base,
        hasToken: Boolean(token),
        paths,
      },
    };

    // Test MongoDB connection
    try {
      const client = await getMongoClient();
      const admin = client.db().admin();
      await admin.ping();
      result.mongodb.connectionTest = "SUCCESS";
    } catch (error) {
      result.mongodb.connectionTest = "FAILED";
      result.mongodb.connectionError = error instanceof Error ? error.message : String(error);
    }

    // Test external API endpoints (stats, users, token-calls)
    try {
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) } as Record<string, string>;
      const test = async (p: string) => {
        const url = new URL(p, base).toString();
        const res = await fetch(url, { headers, cache: "no-store" });
        const contentType = res.headers.get("content-type") || "";
        const body = await res.text();
        return {
          url,
          status: res.status,
          ok: res.ok,
          contentType,
          bodyPreview: body.slice(0, 160),
        };
      };
      result.botApi.tests = {
        stats: await test(paths.stats),
        users: await test(paths.users),
        tokenCalls: await test(paths.tokenCalls),
      };
    } catch (error) {
      result.botApi.tests = "FAILED";
      result.botApi.testError = error instanceof Error ? error.message : String(error);
    }

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
      status: 200,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}


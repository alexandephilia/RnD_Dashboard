import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient, getMongoUriInfo, parseMongoUri } from "@/server/db/mongo";
import dns from "dns/promises";

type SrvLookup = { ok: boolean; records?: number; error?: string };
type URISource = "MONGO_PUBLIC_URL" | "MONGO_URL" | "MONGODB_URI" | null;
type EndpointTest = { url: string; status: number; ok: boolean; contentType: string; bodyPreview: string };
type DebugResponse = {
  ok: boolean;
  timestamp: string;
  environment: { NODE_ENV?: string; VERCEL?: string; VERCEL_ENV?: string };
  mongodb: {
    hasPublicUrl: boolean;
    hasInternalUrl: boolean;
    hasMongodbUri: boolean;
    uriSource: URISource;
    uriKind: "srv" | "standard" | null;
    hostPreview: string | null;
    srvLookup?: SrvLookup;
    dbName: string;
    collections: { tokenCalls: string; users: string };
    connectionTest?: "SUCCESS" | "FAILED";
    connectionError?: string;
  };
  botApi: {
    base: string;
    hasToken: boolean;
    paths: { stats: string; tokenCalls: string; users: string; sse: string };
    tests?: { stats: EndpointTest; users: EndpointTest; tokenCalls: EndpointTest } | "FAILED";
    testError?: string;
  };
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { base, token, paths } = getBotConfig();
    const { dbName, tokenCalls, users } = getDbAndCollections();

    const uriInfo = getMongoUriInfo();
    const parsed: { kind: "srv" | "standard" | null; host: string | null } = uriInfo.uri
      ? parseMongoUri(uriInfo.uri)
      : { kind: null, host: null };

    let srvLookup: SrvLookup | undefined = undefined;
    if (parsed?.kind === "srv" && parsed?.host) {
      try {
        const records = await dns.resolveSrv(`_mongodb._tcp.${parsed.host}`);
        srvLookup = { ok: true, records: records.length };
      } catch (e: unknown) {
        srvLookup = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    }

    const result: DebugResponse = {
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
        uriSource: uriInfo.source as URISource,
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
      const test = async (p: string): Promise<EndpointTest> => {
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

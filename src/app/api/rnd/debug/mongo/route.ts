import { getDbAndCollections, getMongoClient, getMongoUriInfo, parseMongoUri } from "@/server/db/mongo";
import dns from "dns/promises";

type SrvLookup = { ok: boolean; records?: number; error?: string };
type URISource = "MONGO_PUBLIC_URL" | "MONGO_URL" | "MONGODB_URI" | null;
type DebugMongoResponse = {
  ok: boolean;
  env: {
    MONGO_DB_NAME: string;
    MONGO_COLLECTION_TOKEN_CALLS: string;
    MONGO_COLLECTION_USERS: string;
    hasPublicUrl: boolean;
    hasInternalUrl: boolean;
    hasMongodbUri: boolean;
    uriSource: URISource;
    uriKind: "srv" | "standard" | null;
    hostPreview: string | null;
    srvLookup?: SrvLookup;
  };
  databases?: { name: string; sizeOnDisk?: number }[];
  collections?: string[];
  sampleTokenCalls?: unknown[];
  sampleTokenCallsError?: string;
  sampleUsers?: unknown[];
  sampleUsersError?: string;
  connectionTest?: "SUCCESS" | "FAILED";
  error?: string;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

  const base: DebugMongoResponse = {
    ok: true,
    env: {
      MONGO_DB_NAME: dbName,
      MONGO_COLLECTION_TOKEN_CALLS: tokenCalls,
      MONGO_COLLECTION_USERS: users,
      hasPublicUrl: Boolean(process.env.MONGO_PUBLIC_URL),
      hasInternalUrl: Boolean(process.env.MONGO_URL),
      hasMongodbUri: Boolean(process.env.MONGODB_URI),
      uriSource: uriInfo.source as URISource,
      uriKind: parsed?.kind || null,
      hostPreview: parsed?.host || null,
      srvLookup,
    },
  };

  try {
    const client = await getMongoClient();
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();

    const db = client.db(dbName);
    const cols = await db.listCollections({}, { nameOnly: true }).toArray();

    base.databases = dbs.databases?.map((d) => ({ name: d.name, sizeOnDisk: d.sizeOnDisk }));
    base.collections = cols.map((c) => c.name);
    base.connectionTest = "SUCCESS";

    // Try small samples to confirm presence
    try {
      const sampleCalls = await db
        .collection(tokenCalls)
        .find({}, { limit: 1, sort: { updatedAt: -1 } })
        .toArray();
      base.sampleTokenCalls = sampleCalls;
    } catch (e: unknown) {
      base.sampleTokenCallsError = e instanceof Error ? e.message : String(e);
    }

    try {
      const sampleUsers = await db
        .collection(users)
        .find({}, { limit: 1, sort: { updatedAt: -1 } })
        .toArray();
      base.sampleUsers = sampleUsers;
    } catch (e: unknown) {
      base.sampleUsersError = e instanceof Error ? e.message : String(e);
    }

    return Response.json(base, { headers: { "Cache-Control": "no-store" } });
  } catch (e: unknown) {
    base.ok = false;
    base.connectionTest = "FAILED";
    base.error = e instanceof Error ? e.message : String(e);
    return Response.json(base, { status: 500 });
  }
}

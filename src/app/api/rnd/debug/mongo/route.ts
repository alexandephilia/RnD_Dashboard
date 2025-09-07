import { getDbAndCollections, getMongoClient, getMongoUriInfo, parseMongoUri } from "@/server/db/mongo";
import dns from "dns/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

  const base = {
    ok: true,
    env: {
      MONGO_DB_NAME: dbName,
      MONGO_COLLECTION_TOKEN_CALLS: tokenCalls,
      MONGO_COLLECTION_USERS: users,
      hasPublicUrl: Boolean(process.env.MONGO_PUBLIC_URL),
      hasInternalUrl: Boolean(process.env.MONGO_URL),
      hasMongodbUri: Boolean(process.env.MONGODB_URI),
      uriSource: uriInfo.source,
      uriKind: parsed?.kind || null,
      hostPreview: parsed?.host || null,
      srvLookup,
    },
  } as any;

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


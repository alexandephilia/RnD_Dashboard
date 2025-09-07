import { NextRequest } from "next/server";
import { getMongoClient } from "@/server/db/mongo";
import { getDbAndCollections } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  try {
    const client = await getMongoClient();
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();

    const { dbName, tokenCalls, users } = getDbAndCollections();
    const db = client.db(dbName);
    const cols = await db.listCollections({}, { nameOnly: true }).toArray();

    const result: any = {
      ok: true,
      env: {
        MONGO_DB_NAME: dbName,
        MONGO_COLLECTION_TOKEN_CALLS: tokenCalls,
        MONGO_COLLECTION_USERS: users,
        hasPublicUrl: Boolean(process.env.MONGO_PUBLIC_URL),
        hasInternalUrl: Boolean(process.env.MONGO_URL),
      },
      databases: dbs.databases?.map((d) => ({ name: d.name, sizeOnDisk: d.sizeOnDisk })),
      collections: cols.map((c) => c.name),
    };

    // Try small samples to confirm presence
    try {
      const sampleCalls = await db
        .collection(tokenCalls)
        .find({}, { limit: 1, sort: { updatedAt: -1 } })
        .toArray();
      result.sampleTokenCalls = sampleCalls;
    } catch (e: any) {
      result.sampleTokenCallsError = e?.message || String(e);
    }
    try {
      const sampleUsers = await db
        .collection(users)
        .find({}, { limit: 1, sort: { updatedAt: -1 } })
        .toArray();
      result.sampleUsers = sampleUsers;
    } catch (e: any) {
      result.sampleUsersError = e?.message || String(e);
    }

    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return Response.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}


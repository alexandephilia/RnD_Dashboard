import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const client = await getMongoClient();
        const admin = client.db().admin();
        const dbs = await admin.listDatabases();

        const { dbName, tokenCalls, users } = getDbAndCollections();
        const db = client.db(dbName);
        const cols = await db.listCollections({}, { nameOnly: true }).toArray();

        const result: {
            ok: boolean;
            env: {
                MONGO_DB_NAME: string;
                MONGO_COLLECTION_TOKEN_CALLS: string;
                MONGO_COLLECTION_USERS: string;
                hasPublicUrl: boolean;
                hasInternalUrl: boolean;
            };
            databases?: { name: string; sizeOnDisk?: number }[];
            collections: string[];
            sampleTokenCalls?: unknown[];
            sampleTokenCallsError?: string;
            sampleUsers?: unknown[];
            sampleUsersError?: string;
        } = {
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
        } catch (e: unknown) {
            result.sampleTokenCallsError = e instanceof Error ? e.message : String(e);
        }
        try {
            const sampleUsers = await db
                .collection(users)
                .find({}, { limit: 1, sort: { updatedAt: -1 } })
                .toArray();
            result.sampleUsers = sampleUsers;
        } catch (e: unknown) {
            result.sampleUsersError = e instanceof Error ? e.message : String(e);
        }

        return Response.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (e: unknown) {
        return Response.json(
            { ok: false, error: e instanceof Error ? e.message : String(e) },
            { status: 500 },
        );
    }
}


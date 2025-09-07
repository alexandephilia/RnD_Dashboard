import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { base, token, paths } = getBotConfig();
        const { dbName, tokenCalls, users } = getDbAndCollections();

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

        // Test external API
        try {
            const testUrl = new URL(paths.stats, base).toString();
            const response = await fetch(testUrl, {
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                cache: "no-store",
            });
            result.botApi.testResponse = {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
            };
            if (!response.ok) {
                const text = await response.text();
                result.botApi.testResponse.body = text.slice(0, 300);
            }
        } catch (error) {
            result.botApi.testResponse = "FAILED";
            result.botApi.testError = error instanceof Error ? error.message : String(error);
        }

        return Response.json(result, {
            headers: { "Cache-Control": "no-store" },
            status: 200
        });
    } catch (error) {
        return Response.json(
            {
                ok: false,
                error: error instanceof Error ? error.message : String(error),
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

import { getBotConfig } from "@/lib/config";
import { getDbAndCollections } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { base, token, paths } = getBotConfig();
        const { dbName, tokenCalls, users } = getDbAndCollections();

        const result = {
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

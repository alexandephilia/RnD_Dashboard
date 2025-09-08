import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        // Try MongoDB first
        if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
            const client = await getMongoClient();
            const { dbName, tokenCalls } = getDbAndCollections();
            const col = client.db(dbName).collection(tokenCalls);

            const since = req.nextUrl.searchParams.get('since');
            const limit = Math.min(50, Number(req.nextUrl.searchParams.get('limit') || 10));

            const query = since ? {
                $or: [
                    { updatedAt: { $gte: new Date(since) } },
                    { last_updated: { $gte: new Date(since) } }
                ]
            } : {};

            const docs = await col
                .find(query)
                .sort({ updatedAt: -1, last_updated: -1 })
                .limit(limit)
                .toArray();

            return Response.json({
                data: docs,
                timestamp: new Date().toISOString(),
                count: docs.length
            }, {
                headers: { "Cache-Control": "no-store" }
            });
        }
    } catch (error) {
        console.error("MongoDB error in latest token calls:", error);
        // Fall through to Bot API
    }

    // Fallback to Bot API
    const { base, token, paths } = getBotConfig();
    if (!base) {
        return Response.json(
            { error: "No data source configured" },
            { status: 500 }
        );
    }

    const upstream = new URL(paths.tokenCalls, base);
    for (const [k, v] of req.nextUrl.searchParams.entries()) {
        upstream.searchParams.set(k, v);
    }

    const res = await fetch(upstream.toString(), {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
    });

    const text = await res.text();
    try {
        const json = JSON.parse(text);
        return Response.json({
            data: json,
            timestamp: new Date().toISOString(),
            count: Array.isArray(json) ? json.length : 0
        }, {
            headers: { "Cache-Control": "no-store" },
            status: res.status,
        });
    } catch {
        return Response.json(
            { error: "Invalid JSON from upstream", upstream: text.slice(0, 300) },
            { status: 502 },
        );
    }
}

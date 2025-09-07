import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";
import type { Document, Filter } from "mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
    // Prefer Mongo if configured
    try {
        if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
            const client = await getMongoClient();
            const { dbName, tokenCalls, users } = getDbAndCollections();
            const callsCol = client.db(dbName).collection(tokenCalls);
            const usersCol = client.db(dbName).collection(users);

            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const lastWindowQuery: Filter<Document> = {
                $or: [
                    { updatedAt: { $gte: dayAgo } },
                    { last_updated: { $gte: dayAgo } },
                    { createdAt: { $gte: dayAgo } },
                    { "first_poster.posted_at": { $gte: dayAgo } },
                ],
            };

            const [groupsArr, tokensArr, usersCount, latestDoc, calls1h, calls24h, groups24hArr, tokens24hArr, users24h, callsTotal] = await Promise.all([
                callsCol.distinct("group_id"),
                callsCol.distinct("token_address"),
                usersCol.countDocuments({}),
                callsCol.find({}).sort({ last_updated: -1, updatedAt: -1 }).limit(1).toArray(),
                (async () => {
                    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                    return callsCol.countDocuments({
                        $or: [
                            { updatedAt: { $gte: hourAgo } },
                            { last_updated: { $gte: hourAgo } },
                            { createdAt: { $gte: hourAgo } },
                            { "first_poster.posted_at": { $gte: hourAgo } },
                        ],
                    });
                })(),
                (async () => callsCol.countDocuments(lastWindowQuery))(),
                callsCol.distinct("group_id", lastWindowQuery),
                callsCol.distinct("token_address", lastWindowQuery),
                usersCol.countDocuments({ $or: [{ updatedAt: { $gte: dayAgo } }, { createdAt: { $gte: dayAgo } }] }),
                callsCol.countDocuments({}),
            ]);

            const lastDoc = latestDoc[0];
            const last_event_ts =
                lastDoc?.updatedAt ||
                lastDoc?.last_updated ||
                lastDoc?.createdAt ||
                lastDoc?.first_poster?.posted_at ||
                null;

            return Response.json(
                {
                    group_count: groupsArr.filter(Boolean).length,
                    token_count: tokensArr.filter(Boolean).length,
                    users_count: usersCount,
                    users_24h: users24h,
                    last_event_ts,
                    calls_1h: calls1h,
                    calls_24h: calls24h,
                    calls_total: callsTotal,
                    groups_24h: groups24hArr.filter(Boolean).length,
                    tokens_24h: tokens24hArr.filter(Boolean).length,
                },
                { headers: { "Cache-Control": "no-store" } },
            );
        }
    } catch {
        // fall through
    }

    const { base, token, paths } = getBotConfig();
    if (!base) {
        return Response.json(
            { error: "BOT_API_URL not configured" },
            { status: 500 },
        );
    }
    const url = new URL(paths.stats, base).toString();
    const res = await fetch(url, {
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
    });
    const text = await res.text();
    try {
        const json = JSON.parse(text);
        return Response.json(json, {
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

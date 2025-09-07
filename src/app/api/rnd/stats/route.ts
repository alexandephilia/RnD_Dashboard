export const dynamic = "force-dynamic";

export async function GET() {
    // Return mock stats data
    const mockStats = {
        group_count: 15,
        token_count: 234,
        users_count: 1567,
        users_24h: 89,
        last_event_ts: new Date().toISOString(),
        calls_1h: 23,
        calls_24h: 156,
        calls_total: 5432,
        groups_24h: 8,
        tokens_24h: 67
    };

    return Response.json(mockStats, { headers: { "Cache-Control": "no-store" } });
}

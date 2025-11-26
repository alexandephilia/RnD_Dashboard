import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Limit to 30 seconds max

export async function GET(request: Request) {
    const encoder = new TextEncoder();
    const url = new URL(request.url);
    const since = url.searchParams.get('since');
    const limit = Math.min(10, Number(url.searchParams.get('limit') || 5));

    const stream = new ReadableStream({
        async start(controller) {
            let sent = 0;
            const maxMessages = limit;
            const startTime = Date.now();
            const maxDuration = 25000; // 25 seconds to stay under Vercel limit

            const sendData = async () => {
                try {
                    // Try MongoDB first
                    if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
                        const client = await getMongoClient();
                        const { dbName, tokenCalls } = getDbAndCollections();
                        const col = client.db(dbName).collection(tokenCalls);

                        const query = since ? {
                            $or: [
                                { updatedAt: { $gte: new Date(since) } },
                                { last_updated: { $gte: new Date(since) } }
                            ]
                        } : {};

                        const docs = await col
                            .find(query)
                            .sort({ updatedAt: -1, last_updated: -1 })
                            .limit(maxMessages - sent)
                            .toArray();

                        for (const doc of docs) {
                            if (sent >= maxMessages || Date.now() - startTime > maxDuration) {
                                break;
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(doc)}\n\n`));
                            sent++;
                        }

                        if (sent >= maxMessages || Date.now() - startTime > maxDuration) {
                            controller.close();
                            return;
                        }
                    }

                    // If no new data, send heartbeat
                    if (sent === 0) {
                        controller.enqueue(encoder.encode(`data: {"type":"heartbeat","timestamp":"${new Date().toISOString()}"}\n\n`));
                    }

                } catch (error) {
                    console.error("SSE stream error:", error);
                    controller.enqueue(encoder.encode(`data: {"type":"error","message":"${error}"}\n\n`));
                }
            };

            // Send initial data
            await sendData();

            // Send updates every 3 seconds, but stop after max duration or max messages
            const interval = setInterval(async () => {
                if (sent >= maxMessages || Date.now() - startTime > maxDuration) {
                    clearInterval(interval);
                    controller.close();
                    return;
                }
                await sendData();
            }, 3000);

            // Cleanup after max duration
            setTimeout(() => {
                clearInterval(interval);
                controller.close();
            }, maxDuration);
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Cache-Control",
        },
    });
}

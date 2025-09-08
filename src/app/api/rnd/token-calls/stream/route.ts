import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET() {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            let lastTimestamp = new Date();

            const sendLatestData = async () => {
                try {
                    // Try MongoDB first
                    if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
                        const client = await getMongoClient();
                        const { dbName, tokenCalls } = getDbAndCollections();
                        const col = client.db(dbName).collection(tokenCalls);

                        const latestDoc = await col
                            .findOne(
                                {
                                    $or: [
                                        { updatedAt: { $gte: lastTimestamp } },
                                        { last_updated: { $gte: lastTimestamp } }
                                    ]
                                },
                                { sort: { updatedAt: -1, last_updated: -1 } }
                            );

                        if (latestDoc) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(latestDoc)}\n\n`));
                            lastTimestamp = latestDoc.updatedAt || latestDoc.last_updated || new Date();
                            return;
                        }
                    }

                    // Fallback to Bot API
                    const { base, token, paths } = getBotConfig();
                    if (base) {
                        const url = new URL(paths.sse, base).toString();
                        const response = await fetch(url, {
                            headers: {
                                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                        });

                        if (response.ok && response.body) {
                            const reader = response.body.getReader();
                            const { value } = await reader.read();
                            if (value) {
                                controller.enqueue(value);
                            }
                        }
                    }
                } catch (error) {
                    console.error("SSE stream error:", error);
                }
            };

            // Send initial data
            await sendLatestData();

            // Send periodic updates
            const interval = setInterval(sendLatestData, 5000);

            // Clean up on close
            setTimeout(() => {
                clearInterval(interval);
            }, 300000); // Stop after 5 minutes
        }
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
        },
    });
}

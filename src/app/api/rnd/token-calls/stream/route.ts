export const dynamic = "force-dynamic";

export async function GET() {
    // Create a mock SSE stream
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            // Send initial mock data
            const mockData = {
                _id: `token_${Date.now()}`,
                token_address: `0x${Math.random().toString(16).substr(2, 40)}`,
                symbol: `TOKEN${Math.floor(Math.random() * 1000)}`,
                name: `Live Token ${Math.floor(Math.random() * 100)}`,
                market_cap: Math.floor(Math.random() * 10000000),
                price: Math.random() * 100,
                last_updated: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            controller.enqueue(encoder.encode(`data: ${JSON.stringify(mockData)}\n\n`));

            // Send periodic updates
            const interval = setInterval(() => {
                const newMockData = {
                    _id: `token_${Date.now()}`,
                    token_address: `0x${Math.random().toString(16).substr(2, 40)}`,
                    symbol: `TOKEN${Math.floor(Math.random() * 1000)}`,
                    name: `Live Token ${Math.floor(Math.random() * 100)}`,
                    market_cap: Math.floor(Math.random() * 10000000),
                    price: Math.random() * 100,
                    last_updated: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                try {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(newMockData)}\n\n`));
                } catch {
                    clearInterval(interval);
                }
            }, 5000); // Send new data every 5 seconds

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

import { getBotConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
    const { base, token, paths } = getBotConfig();
    if (!base) {
        return new Response("BOT_API_URL not configured", { status: 500 });
    }
    const url = new URL(paths.sse, base).toString();
    const upstream = await fetch(url, {
        headers: {
            Accept: "text/event-stream",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
        return new Response(`Upstream SSE error: ${upstream.status}`, {
            status: 502,
        });
    }

    // Proxy the upstream SSE body directly to the client.
    return new Response(upstream.body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            // Transfer-Encoding is set by runtime when streaming
        },
    });
}


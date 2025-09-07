import { NextRequest } from "next/server";
import { getBotConfig } from "@/lib/config";
import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Prefer Mongo if configured
  try {
    if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL) {
      const client = await getMongoClient();
      const { dbName, tokenCalls } = getDbAndCollections();
      const limit = Math.min(
        500,
        Number(req.nextUrl.searchParams.get("limit") ?? 100),
      );
      const col = client.db(dbName).collection(tokenCalls);
      const docs = await col
        .find({})
        .sort({ last_updated: -1, updatedAt: -1 })
        .limit(limit)
        .toArray();
      return Response.json(docs, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (e) {
    // fall through to upstream
  }

  const { base, token, paths } = getBotConfig();
  if (!base) {
    return Response.json(
      { error: "BOT_API_URL not configured" },
      { status: 500 },
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

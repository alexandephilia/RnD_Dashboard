import { getDbAndCollections, getMongoClient } from "@/server/db/mongo";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL || process.env.MONGODB_URI) {
      const client = await getMongoClient();
      const { dbName, groupMonthlyTokens } = getDbAndCollections();
      const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit") ?? 100));
      const col = client.db(dbName).collection(groupMonthlyTokens);

      // Return newest first (try common timestamp fields)
      const docs = await col
        .find({})
        .sort({ updatedAt: -1, last_updated: -1, createdAt: -1 })
        .limit(limit)
        .toArray();
      return Response.json(docs, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    console.error("MongoDB error in group-monthly-tokens:", error);
  }

  // If Mongo is not configured, return an empty list explicitly
  return Response.json([], { headers: { "Cache-Control": "no-store" } });
}


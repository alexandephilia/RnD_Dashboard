import { MongoClient } from "mongodb";

let client: MongoClient | null = null;
let promise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
  if (client) return client;
  if (!promise) {
    const uri = process.env.MONGO_PUBLIC_URL || process.env.MONGO_URL;
    if (!uri) throw new Error("MONGO_PUBLIC_URL or MONGO_URL not configured");
    promise = new MongoClient(uri, {
      maxPoolSize: 5,
    })
      .connect()
      .then((c) => {
        client = c;
        return c;
      });
  }
  return promise;
}

export function getDbAndCollections() {
  const dbName = process.env.MONGO_DB_NAME || "admin";
  // Default to "tokens" which matches Mongoose's pluralization for the Token model
  const tokenCalls = process.env.MONGO_COLLECTION_TOKEN_CALLS || "tokens";
  const users = process.env.MONGO_COLLECTION_USERS || "users";
  return { dbName, tokenCalls, users } as const;
}

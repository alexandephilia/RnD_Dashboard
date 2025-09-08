import { MongoClient } from "mongodb";

type MongoUriSource = "MONGO_PUBLIC_URL" | "MONGO_URL" | "MONGODB_URI" | null;

export function getMongoUriInfo(): { uri: string | null; source: MongoUriSource } {
    const env = process.env;
    if (env.MONGO_PUBLIC_URL) return { uri: env.MONGO_PUBLIC_URL, source: "MONGO_PUBLIC_URL" };
    if (env.MONGO_URL) return { uri: env.MONGO_URL, source: "MONGO_URL" };
    if (env.MONGODB_URI) return { uri: env.MONGODB_URI, source: "MONGODB_URI" };
    return { uri: null, source: null };
}

export function parseMongoUri(uri: string): { kind: "srv" | "standard"; host: string | null } {
    try {
        const url = new URL(uri);
        const kind = uri.startsWith("mongodb+srv://") ? "srv" : "standard";
        // For multi-host URIs, URL.host only returns the first; still useful for preview
        const host = url.host || null;
        return { kind, host };
    } catch {
        // Fallback if URL parsing fails (very rare)
        const kind = uri.startsWith("mongodb+srv://") ? "srv" : "standard";
        const host = uri.replace(/^mongodb(?:\+srv)?:\/\//, "").split("/")[0] || null;
        return { kind, host };
    }
}

let client: MongoClient | null = null;
let promise: Promise<MongoClient> | null = null;

export async function getMongoClient() {
    if (client) return client;
    if (!promise) {
        const { uri } = getMongoUriInfo();
        if (!uri) throw new Error("MONGO_PUBLIC_URL, MONGO_URL, or MONGODB_URI not configured");
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
    const dbName = process.env.MONGO_DB_NAME || "test"; // Changed from "admin" to "test"
    // Default to "tokens" which matches Mongoose's pluralization for the Token model
    const tokenCalls = process.env.MONGO_COLLECTION_TOKEN_CALLS || "tokens";
    const users = process.env.MONGO_COLLECTION_USERS || "users";
    return { dbName, tokenCalls, users } as const;
}

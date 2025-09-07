export function getBotConfig() {
  const base =
    process.env.BOT_API_URL ||
    "https://telegram-token-tracker-bot-production.up.railway.app";
  const token = process.env.BOT_API_TOKEN;
  const paths = {
    stats: process.env.BOT_STATS_PATH || "/api/stats",
    tokenCalls: process.env.BOT_TOKEN_CALLS_PATH || "/api/token-calls",
    users: process.env.BOT_USERS_PATH || "/api/users",
    sse: process.env.BOT_SSE_PATH || "/api/stream/token-calls",
  } as const;

  return { base, token, paths };
}

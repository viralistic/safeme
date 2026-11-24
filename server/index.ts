import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = process.env;
const dbPath = resolve(env.DATA_DIR ?? resolve(root, "data"), "safety-map.db");
mkdirSync(dirname(dbPath), { recursive: true });

const vapid =
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
    ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT ?? "mailto:privacy@example.nl" }
    : undefined;

const app = createApp({
  dbPath,
  staticDir: env.STATIC_DIR === "" ? undefined : resolve(env.STATIC_DIR ?? resolve(root, "dist")),
  tilesDir: env.TILES_DIR ? resolve(env.TILES_DIR) : undefined,
  adminToken: env.ADMIN_TOKEN || undefined,
  webhookUrl: env.N8N_WEBHOOK_URL || undefined,
  webhookSecret: env.N8N_WEBHOOK_SECRET || undefined,
  vapid,
  ai: env.MODERATION_AI_URL && env.MODERATION_AI_MODEL ? { url: env.MODERATION_AI_URL, model: env.MODERATION_AI_MODEL, key: env.MODERATION_AI_KEY || undefined } : undefined,
  telegram: env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID ? { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID } : undefined,
  trustProxy: env.TRUST_PROXY === "true",
});

const port = Number(env.PORT ?? 8787);
app.server.listen(port, () => console.log(`Safety Map API on http://localhost:${port} (db: ${dbPath})`));

for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (app.close(), process.exit(0)));

import app from "./app.js";
import { env } from "./config/env.js";
import { getRepository } from "./db/index.js";
import { disconnectMongo } from "./db/connect.js";

async function start() {
  // Initialise storage (and seed a fresh database) before accepting traffic.
  await getRepository();

  const server = app.listen(env.port, () => {
    console.log(`[api] Maison API listening on http://localhost:${env.port}`);
    console.log(`[api] Admin login: ${env.admin.email}`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectMongo();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  console.error("[api] failed to start", error);
  process.exit(1);
});

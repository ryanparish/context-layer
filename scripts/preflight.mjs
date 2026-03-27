import "dotenv/config";
import { Client } from "pg";
import Redis from "ioredis";

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✔ ${message}`);
}

function readEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) fail(`${name} is missing`);
  return value.trim();
}

async function checkDb(databaseUrl) {
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query("SELECT 1");
    ok("Database reachable");
  } catch (e) {
    fail(
      `Database unreachable. Check DATABASE_URL and make sure Postgres is running. ${
        e instanceof Error ? e.message : ""
      }`,
    );
  } finally {
    try {
      await client.end();
    } catch {
      // no-op
    }
  }
}

async function checkRedis(redisUrl) {
  const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: null });
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") fail("Redis did not respond to PING");
    ok("Redis reachable");
  } catch (e) {
    fail(
      `Redis unreachable. Start Redis or set REDIS_URL. ${e instanceof Error ? e.message : ""}`,
    );
  } finally {
    try {
      redis.disconnect();
    } catch {
      // no-op
    }
  }
}

async function main() {
  const mode = process.argv[2] ?? "app";
  const databaseUrl = readEnv("DATABASE_URL");
  readEnv("APP_ENCRYPTION_KEY");
  readEnv("SESSION_SECRET");
  ok("Required env vars present");

  await checkDb(databaseUrl);

  if (mode === "worker" || mode === "all") {
    const redisUrl = process.env.REDIS_URL?.trim() || "redis://localhost:6379";
    await checkRedis(redisUrl);
  }

  console.log("Preflight checks passed.");
}

main().catch((e) => fail(e instanceof Error ? e.message : "Preflight failed"));

import { NextResponse } from "next/server";
import { Client } from "pg";
import IORedis from "ioredis";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is missing");
    const client = new Client({ connectionString: databaseUrl });
    try {
      await withTimeout(client.connect(), 5000, "db connect");
      await withTimeout(client.query("SELECT 1"), 5000, "db query");
    } finally {
      await client.end().catch(() => {});
    }
    checks.db = { ok: true };
  } catch (e) {
    checks.db = { ok: false, detail: e instanceof Error ? e.message : "db check failed" };
  }

  let redis: IORedis | null = null;
  try {
    const redisUrl = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
    redis = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: true,
      connectTimeout: 5000,
      retryStrategy: () => null,
    });
    await withTimeout(
      (async () => {
        await redis!.connect();
        const pong = await redis!.ping();
        if (pong !== "PONG") throw new Error(`Unexpected PING reply: ${String(pong)}`);
      })(),
      8000,
      "redis",
    );
    checks.redis = { ok: true };
  } catch (e) {
    checks.redis = { ok: false, detail: e instanceof Error ? e.message : "redis check failed" };
  } finally {
    if (redis) {
      try {
        redis.disconnect();
      } catch {
        // ignore
      }
    }
  }

  const ok = Object.values(checks).every((c) => c.ok);
  return NextResponse.json(
    { ok, checks, timestamp: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}


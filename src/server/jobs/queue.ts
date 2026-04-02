import { Queue } from "bullmq";
import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisConnection: IORedis | undefined;
  // eslint-disable-next-line no-var
  var __workflowQueue: Queue | undefined;
  // eslint-disable-next-line no-var
  var __connectorQueue: Queue | undefined;
}

export function getRedisConnection() {
  if (!globalThis.__redisConnection) {
    // Prefer 127.0.0.1: on macOS, localhost can resolve to ::1 while Docker binds IPv4 only.
    const redisUrl = process.env.REDIS_URL?.trim() || "redis://127.0.0.1:6379";
    globalThis.__redisConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      connectTimeout: 5000,
      enableOfflineQueue: false,
      retryStrategy: () => 1500,
    });
    // Prevent noisy "Unhandled error event" spam when Redis is offline in local dev.
    globalThis.__redisConnection.on("error", () => {});
  }
  return globalThis.__redisConnection;
}

export function getWorkflowQueue() {
  if (!globalThis.__workflowQueue) {
    globalThis.__workflowQueue = new Queue("workflow", { connection: getRedisConnection() });
  }
  return globalThis.__workflowQueue;
}

export function getConnectorQueue() {
  if (!globalThis.__connectorQueue) {
    globalThis.__connectorQueue = new Queue("connector", { connection: getRedisConnection() });
  }
  return globalThis.__connectorQueue;
}


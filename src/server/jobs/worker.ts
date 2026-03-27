import { Worker } from "bullmq";

import { prisma } from "@/server/db";
import { getRedisConnection } from "@/server/jobs/queue";
import { decryptJson } from "@/server/crypto/secrets";
import { getConnectorAdapter } from "@/server/connectors/registry";
import { ConnectionCredentials } from "@/server/connectors/types";

type WorkflowJobData =
  | {
      kind: "workflow_action_webhook";
      workflowRunId: string;
      url: string;
      payload: unknown;
    }
  | {
      kind: "noop";
      workflowRunId: string;
    };

export function startWorkers() {
  const workflowWorker = new Worker<WorkflowJobData>(
    "workflow",
    async (job) => {
      const data = job.data;

      await prisma.workflowRun.update({
        where: { id: data.workflowRunId },
        data: { status: "RUNNING", startedAt: new Date() },
      });

      try {
        if (data.kind === "workflow_action_webhook") {
          const res = await fetch(data.url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(data.payload),
          });
          if (!res.ok) throw new Error(`Webhook failed: HTTP ${res.status}`);
        }

        await prisma.workflowRun.update({
          where: { id: data.workflowRunId },
          data: { status: "SUCCEEDED", finishedAt: new Date() },
        });

        return { ok: true };
      } catch (e) {
        await prisma.workflowRun.update({
          where: { id: data.workflowRunId },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            error: e instanceof Error ? e.message : "Job failed",
          },
        });
        throw e;
      }
    },
    { connection: getRedisConnection() },
  );

  const connectorWorker = new Worker<{ kind: "connector_sync"; connectionId: string }>(
    "connector",
    async (job) => {
      const { connectionId } = job.data;

      const connection = await prisma.connection.findFirst({
        where: { id: connectionId },
        include: { secret: true },
      });
      if (!connection || !connection.secret) throw new Error("Connection missing secret");

      const run = await prisma.connectorRun.create({
        data: { tenantId: connection.tenantId, connectionId: connection.id, status: "RUNNING", startedAt: new Date() },
      });

      try {
        const decrypted = await decryptJson<{ credentials: ConnectionCredentials; options: Record<string, unknown> }>(
          connection.secret.cipherText,
        );
        const adapter = getConnectorAdapter(connection.type);
        if (!adapter) throw new Error("Unknown connector type");

        const result = await adapter.test(decrypted.credentials, decrypted.options ?? {});
        if (!result.ok) throw new Error(result.error);

        await prisma.connection.update({
          where: { id: connection.id },
          data: { lastSyncAt: new Date(), status: "CONNECTED" },
        });

        await prisma.connectorRun.update({
          where: { id: run.id },
          data: { status: "SUCCEEDED", finishedAt: new Date() },
        });

        return { ok: true };
      } catch (e) {
        await prisma.connectorRun.update({
          where: { id: run.id },
          data: { status: "FAILED", finishedAt: new Date(), error: e instanceof Error ? e.message : "Sync failed" },
        });
        throw e;
      }
    },
    { connection: getRedisConnection() },
  );

  return { workflowWorker, connectorWorker };
}


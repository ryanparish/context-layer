import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { getConnectorQueue } from "@/server/jobs/queue";

const schema = z.object({
  enabled: z.boolean(),
  cron: z.string().min(1).max(120).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const connection = await prisma.connection.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, tenantId: true, syncEnabled: true, syncCron: true, type: true },
  });
  if (!connection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const enabled = parsed.data.enabled;
  const cron = parsed.data.cron?.trim();
  if (enabled && !cron) return NextResponse.json({ error: "cron required" }, { status: 400 });

  if (enabled && connection.type === "lrs_xapi_basic") {
    return NextResponse.json(
      {
        error:
          "LRS connections are event-driven (send/receive statements on demand). Scheduled sync does not apply to this connection type.",
      },
      { status: 400 },
    );
  }

  await prisma.connection.update({
    where: { id },
    data: { syncEnabled: enabled, syncCron: enabled ? cron : null },
  });

  const queue = getConnectorQueue();

  // Remove existing repeats for this connection.
  const repeats = await queue.getRepeatableJobs();
  for (const r of repeats) {
    if (r.name === "connector_sync" && (r.id ?? "").includes(id)) {
      await queue.removeRepeatableByKey(r.key);
    }
  }

  if (enabled && cron) {
    await queue.add(
      "connector_sync",
      { kind: "connector_sync", connectionId: id },
      {
        repeat: { pattern: cron },
        jobId: `connector_sync:${id}`,
      },
    );
  }

  return NextResponse.json({ ok: true });
}


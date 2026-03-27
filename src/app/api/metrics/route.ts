import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [statements24h, connections, workflowsEnabled] = await Promise.all([
    prisma.xapiStatement.count({ where: { tenantId: session.tenantId, createdAt: { gte: since24h } } }),
    prisma.connection.count({ where: { tenantId: session.tenantId } }),
    prisma.workflow.count({ where: { tenantId: session.tenantId, enabled: true } }),
  ]);

  // statements per minute, last 60 minutes
  const since60m = new Date(now.getTime() - 60 * 60 * 1000);
  const recent = await prisma.xapiStatement.findMany({
    where: { tenantId: session.tenantId, createdAt: { gte: since60m } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const buckets = new Map<string, number>();
  for (const r of recent) {
    const d = new Date(r.createdAt);
    d.setSeconds(0, 0);
    const key = d.toISOString();
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const series: { t: string; count: number }[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 1000);
    d.setSeconds(0, 0);
    const key = d.toISOString();
    series.push({ t: key, count: buckets.get(key) ?? 0 });
  }

  return NextResponse.json({
    statements24h,
    connections,
    workflowsEnabled,
    statementsPerMinute: series,
  });
}


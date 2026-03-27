import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

const runsQuery = z.object({
  workflowId: z.string().optional(),
  take: z.coerce.number().int().min(1).max(200).optional(),
});

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const parsed = runsQuery.safeParse({
    workflowId: url.searchParams.get("workflowId") ?? undefined,
    take: url.searchParams.get("take") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const runs = await prisma.workflowRun.findMany({
    where: {
      tenantId: session.tenantId,
      ...(parsed.data.workflowId ? { workflowId: parsed.data.workflowId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: parsed.data.take ?? 50,
    select: {
      id: true,
      workflowId: true,
      status: true,
      error: true,
      startedAt: true,
      finishedAt: true,
      createdAt: true,
      log: true,
    },
  });

  return NextResponse.json({ runs });
}


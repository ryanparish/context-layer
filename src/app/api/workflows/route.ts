import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

const createWorkflowSchema = z.object({
  name: z.string().min(2).max(120),
  trigger: z.object({
    type: z.literal("xapi_match"),
    actorMbox: z.string().optional(),
    verbId: z.string().optional(),
    objectId: z.string().optional(),
  }),
  action: z.object({
    type: z.literal("webhook"),
    url: z.string().url(),
  }),
  enabled: z.boolean().optional(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workflows = await prisma.workflow.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, enabled: true, trigger: true, action: true, createdAt: true },
  });
  return NextResponse.json({ workflows });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const wf = await prisma.workflow.create({
    data: {
      tenantId: session.tenantId,
      name: parsed.data.name,
      enabled: parsed.data.enabled ?? true,
      trigger: parsed.data.trigger,
      action: parsed.data.action,
    },
    select: { id: true, name: true, enabled: true, trigger: true, action: true, createdAt: true },
  });

  return NextResponse.json({ workflow: wf }, { status: 201 });
}


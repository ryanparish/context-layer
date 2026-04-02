import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { statementPlanMappingSchema } from "@/server/statementPlanXapi";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(300).optional().nullable(),
  uriTemplateId: z.string().optional().nullable(),
  mapping: statementPlanMappingSchema.optional(),
  active: z.boolean().optional(),
});

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const existing = await prisma.xapiStatementPlan.findFirst({
    where: { id: planId, tenantId: session.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const data = parsed.data;
  const plan = await prisma.xapiStatementPlan.update({
    where: { id: planId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.uriTemplateId !== undefined ? { uriTemplateId: data.uriTemplateId || null } : {}),
      ...(data.mapping !== undefined ? { mapping: data.mapping as object } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });

  return NextResponse.json({ plan });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ planId: string }> }) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planId } = await params;

  const deleted = await prisma.xapiStatementPlan.deleteMany({
    where: { id: planId, tenantId: session.tenantId },
  });

  if (deleted.count === 0) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { statementPlanMappingSchema } from "@/server/xapiStatementPlan";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  uriTemplateId: z.string().nullable().optional(),
  mapping: statementPlanMappingSchema.optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.xapiStatementPlan.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await prisma.xapiStatementPlan.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      uriTemplateId: parsed.data.uriTemplateId,
      mapping: parsed.data.mapping as any,
      active: parsed.data.active,
    },
  });
  return NextResponse.json({ plan });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.xapiStatementPlan.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.xapiStatementPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


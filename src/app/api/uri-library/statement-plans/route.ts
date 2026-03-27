import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { statementPlanMappingSchema } from "@/server/xapiStatementPlan";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  uriTemplateId: z.string().optional(),
  mapping: statementPlanMappingSchema,
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.xapiStatementPlan.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const plan = await prisma.xapiStatementPlan.create({
    data: {
      tenantId: session.tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      uriTemplateId: parsed.data.uriTemplateId ?? null,
      mapping: parsed.data.mapping as any,
      active: parsed.data.active ?? true,
    },
  });
  return NextResponse.json({ plan }, { status: 201 });
}


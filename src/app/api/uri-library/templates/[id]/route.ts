import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { uriSegmentsSchema } from "@/server/uriLibrary";

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  category: z.string().max(80).nullable().optional(),
  sourceType: z.enum(["ANY", "API", "COURSE"]).optional(),
  baseUrl: z.string().url().optional(),
  segments: uriSegmentsSchema.optional(),
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
  const existing = await prisma.uriTemplate.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.uriTemplate.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      sourceType: parsed.data.sourceType,
      baseUrl: parsed.data.baseUrl,
      segments: parsed.data.segments as any,
      active: parsed.data.active,
    },
  });

  return NextResponse.json({ template: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.uriTemplate.findFirst({ where: { id, tenantId: session.tenantId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.uriTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


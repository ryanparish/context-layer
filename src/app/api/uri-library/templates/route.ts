import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { uriSegmentsSchema } from "@/server/uriLibrary";

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  category: z.string().max(80).optional(),
  sourceType: z.enum(["ANY", "API", "COURSE"]).default("ANY"),
  baseUrl: z.string().url(),
  segments: uriSegmentsSchema,
  active: z.boolean().optional(),
});

export async function GET(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.uriTemplate.findMany({
    where: { tenantId: session.tenantId },
    orderBy: [{ category: "asc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ templates: items });
}

export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const created = await prisma.uriTemplate.create({
    data: {
      tenantId: session.tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      sourceType: parsed.data.sourceType,
      baseUrl: parsed.data.baseUrl,
      segments: parsed.data.segments as any,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json({ template: created }, { status: 201 });
}


import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";
import { buildUriFromTemplate, uriSegmentsSchema } from "@/server/uriLibrary";

const resolveSchema = z.object({
  templateId: z.string().optional(),
  baseUrl: z.string().url().optional(),
  segments: uriSegmentsSchema.optional(),
  variables: z.record(z.string(), z.unknown()).default({}),
  label: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  catalogResolved: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const data = parsed.data;
  let baseUrl = data.baseUrl ?? "";
  let segments = data.segments ?? [];

  if (data.templateId) {
    const template = await prisma.uriTemplate.findFirst({
      where: { id: data.templateId, tenantId: session.tenantId },
    });
    if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    baseUrl = template.baseUrl;
    segments = uriSegmentsSchema.parse(template.segments);
  }

  if (!baseUrl || segments.length === 0) {
    return NextResponse.json({ error: "Provide templateId or baseUrl+segments" }, { status: 400 });
  }

  const iri = buildUriFromTemplate(baseUrl, segments, data.variables);
  let savedUriId: string | null = null;

  if (data.catalogResolved) {
    const uri = await prisma.xapiUri.upsert({
      where: { tenantId_iri: { tenantId: session.tenantId, iri } },
      update: {
        label: data.label ?? iri,
        kind: data.category ?? "RESOLVED",
      },
      create: {
        tenantId: session.tenantId,
        iri,
        label: data.label ?? iri,
        kind: data.category ?? "RESOLVED",
      },
      select: { id: true },
    });
    savedUriId = uri.id;
  }

  return NextResponse.json({ iri, savedUriId });
}


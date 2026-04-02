import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";

const createSchema = z.object({
  iri: z.string().url(),
  label: z.string().min(1).max(80),
  kind: z.string().min(1).max(40).optional(),
});

export async function GET(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const uris = await prisma.xapiUri.findMany({
    where: { tenantId: session.tenantId },
    orderBy: { updatedAt: "desc" },
    take: 200,
    select: { id: true, iri: true, label: true, kind: true, updatedAt: true },
  });

  return NextResponse.json({ uris });
}

export async function POST(req: Request) {
  const session = await resolveTenantContext(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const uri = await prisma.xapiUri.upsert({
    where: { tenantId_iri: { tenantId: session.tenantId, iri: parsed.data.iri } },
    update: { label: parsed.data.label, kind: parsed.data.kind ?? "CUSTOM" },
    create: {
      tenantId: session.tenantId,
      iri: parsed.data.iri,
      label: parsed.data.label,
      kind: parsed.data.kind ?? "CUSTOM",
    },
    select: { id: true, iri: true, label: true, kind: true },
  });

  return NextResponse.json({ uri }, { status: 201 });
}


import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";
import { defaultXapiVerbRegistry } from "@/server/xapi/verbs";

const upsertSchema = z.object({
  iri: z.string().url(),
  display: z.string().min(1).max(64),
  description: z.string().min(1).max(500),
});

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) {
    // Verbs are not sensitive; allow unsigned-in users to see the seeded registry
    // (custom tenant verbs require a session).
    const verbs = defaultXapiVerbRegistry
      .map((v) => ({ ...v, source: "default" as const }))
      .sort((a, b) => a.display.localeCompare(b.display));
    return NextResponse.json({ verbs });
  }

  let custom: Array<{ iri: string; display: string; description: string | null }> = [];
  try {
    custom = await prisma.xapiVerb.findMany({
      where: { tenantId: session.tenantId },
      orderBy: { display: "asc" },
      select: { iri: true, display: true, description: true, updatedAt: true },
    });
  } catch {
    // Keep registry usable even if custom-verb table/column is behind migration state.
    custom = [];
  }

  // Merge defaults + tenant custom (tenant custom wins by iri).
  const map = new Map<string, { iri: string; display: string; description: string; source: "default" | "custom" }>();
  for (const v of defaultXapiVerbRegistry) map.set(v.iri, { ...v, source: "default" });
  for (const v of custom) {
    map.set(v.iri, {
      iri: v.iri,
      display: v.display,
      description: v.description ?? "",
      source: "custom",
    });
  }

  const verbs = Array.from(map.values()).sort((a, b) => a.display.localeCompare(b.display));
  return NextResponse.json({ verbs });
}

export async function POST(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { iri, display, description } = parsed.data;
  const verb = await prisma.xapiVerb.upsert({
    where: { tenantId_iri: { tenantId: session.tenantId, iri } },
    update: { display, description },
    create: { tenantId: session.tenantId, iri, display, description },
    select: { iri: true, display: true, description: true },
  });

  return NextResponse.json({ verb }, { status: 201 });
}


import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

export const runtime = "nodejs";

/**
 * Revoke an API key (session only — OWNER or ADMIN).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "OWNER" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const updated = await prisma.tenantApiKey.updateMany({
    where: { id, tenantId: session.tenantId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

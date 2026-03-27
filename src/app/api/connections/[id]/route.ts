import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { requireSession } from "@/server/auth/requireSession";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.connection.findFirst({
    where: { id, tenantId: session.tenantId },
    select: { id: true, secretId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.connection.delete({ where: { id: existing.id } });

  if (existing.secretId) {
    await prisma.secret.delete({ where: { id: existing.secretId } }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}

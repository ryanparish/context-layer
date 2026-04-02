import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { resolveTenantContext } from "@/server/auth/tenantContext";

/**
 * Current user for the browser or for Postman (`Authorization: Bearer <tenant API key>`).
 */
export async function GET(req: Request) {
  const ctx = await resolveTenantContext(req);
  if (!ctx) return NextResponse.json({ user: null }, { status: 200 });

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      authVia: ctx.via,
    },
  });
}


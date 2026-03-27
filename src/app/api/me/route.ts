import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { getSessionCookieName, verifySession } from "@/server/auth/session";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(getSessionCookieName())?.value;
  if (!token) return NextResponse.json({ user: null }, { status: 200 });

  try {
    const session = await verifySession(token);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ user: null }, { status: 200 });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}


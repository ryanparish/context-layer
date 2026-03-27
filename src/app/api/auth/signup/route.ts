import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { signSession, getSessionCookieName } from "@/server/auth/session";
import { signupSchema } from "@/server/auth/schemas";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { tenantName, tenantSlug, email, password } = parsed.data;

  const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (existingTenant) {
    return NextResponse.json({ error: "Tenant slug already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      users: {
        create: {
          email,
          passwordHash,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });

  const user = tenant.users[0]!;
  const token = await signSession({
    userId: user.id,
    tenantId: tenant.id,
    role: user.role,
  });

  const jar = await cookies();
  jar.set(getSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}


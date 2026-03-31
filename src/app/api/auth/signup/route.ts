import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { signSession, getSessionCookieName } from "@/server/auth/session";
import { signupSchema } from "@/server/auth/schemas";

export const runtime = "nodejs";

const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export async function POST(req: Request) {
  try {
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

    const res = NextResponse.json({ ok: true });
    res.cookies.set(getSessionCookieName(), token, sessionCookieOptions);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[auth/signup]", e);
    return NextResponse.json(
      {
        error: "Signup failed",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";

import { prisma } from "@/server/db";
import { verifyPassword } from "@/server/auth/password";
import { signSession, getSessionCookieName } from "@/server/auth/session";
import { loginSchema } from "@/server/auth/schemas";

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
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { tenantSlug, email, password } = parsed.data;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const user = await prisma.user.findFirst({
      where: { tenantId: tenant.id, email: { equals: email, mode: "insensitive" } },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await signSession({ userId: user.id, tenantId: tenant.id, role: user.role });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(getSessionCookieName(), token, sessionCookieOptions);
    return res;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    console.error("[auth/login]", e);
    return NextResponse.json(
      {
        error: "Login failed",
        ...(process.env.NODE_ENV !== "production" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
}


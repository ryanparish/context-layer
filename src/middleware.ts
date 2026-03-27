import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSessionCookieName, verifySession } from "@/server/auth/session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/app")) return NextResponse.next();

  const token = req.cookies.get(getSessionCookieName())?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    await verifySession(token);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/app/:path*"],
};


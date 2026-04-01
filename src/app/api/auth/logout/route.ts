import { NextResponse } from "next/server";

import { getSessionCookieName, getSessionCookieOptions } from "@/server/auth/session";

export async function POST(req: Request) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(getSessionCookieName(), "", getSessionCookieOptions({ maxAge: 0 }));
  return res;
}


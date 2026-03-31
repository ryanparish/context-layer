import { NextResponse } from "next/server";

import { getSessionCookieName } from "@/server/auth/session";

const clearCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 0,
};

export async function POST(req: Request) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.set(getSessionCookieName(), "", clearCookieOptions);
  return res;
}


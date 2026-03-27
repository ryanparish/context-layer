import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionCookieName } from "@/server/auth/session";

export async function POST() {
  const jar = await cookies();
  jar.set(getSessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  const url = new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  return NextResponse.redirect(url, { status: 303 });
}


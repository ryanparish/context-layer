import { cookies } from "next/headers";

import { getSessionCookieName, verifySession } from "@/server/auth/session";

export async function requireSession() {
  const jar = await cookies();
  const token = jar.get(getSessionCookieName())?.value;
  if (!token) throw new Error("UNAUTHENTICATED");
  return await verifySession(token);
}


import { NextResponse } from "next/server";

import { requireSession } from "@/server/auth/requireSession";
import { OAUTH_STATE_COOKIE, encodeOAuthDraft, newOAuthState } from "@/server/oauth/state";

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "Google Workspace";

  const options: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k.startsWith("opt_")) options[k.slice(4)] = v;
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const redirectUri = new URL("/api/oauth/google/callback", url.origin).toString();
  if (!clientId) return NextResponse.json({ error: "GOOGLE_OAUTH_CLIENT_ID missing" }, { status: 500 });

  const state = newOAuthState();
  const draft = await encodeOAuthDraft({
    state,
    tenantId: session.tenantId,
    name,
    type: "google_workspace",
    options,
    createdAt: new Date().toISOString(),
  });

  const scope = (process.env.GOOGLE_OAUTH_SCOPES ?? "openid email profile").trim();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("scope", scope);
  authUrl.searchParams.set("state", state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, draft, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return res;
}


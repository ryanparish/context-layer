import { NextResponse } from "next/server";

import { requireSession } from "@/server/auth/requireSession";
import { OAUTH_STATE_COOKIE, encodeOAuthDraft, newOAuthState } from "@/server/oauth/state";

export async function GET(req: Request) {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "Microsoft Graph";

  const options: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k.startsWith("opt_")) options[k.slice(4)] = v;
  }

  const clientId = process.env.MS_OAUTH_CLIENT_ID ?? "";
  const tenant = process.env.MS_OAUTH_TENANT ?? "common";
  const redirectUri = new URL("/api/oauth/microsoft/callback", url.origin).toString();
  if (!clientId) return NextResponse.json({ error: "MS_OAUTH_CLIENT_ID missing" }, { status: 500 });

  const state = newOAuthState();
  const draft = await encodeOAuthDraft({
    state,
    tenantId: session.tenantId,
    name,
    type: "microsoft_graph",
    options,
    createdAt: new Date().toISOString(),
  });

  const authUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", (process.env.MS_OAUTH_SCOPES ?? "offline_access https://graph.microsoft.com/.default").trim());
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


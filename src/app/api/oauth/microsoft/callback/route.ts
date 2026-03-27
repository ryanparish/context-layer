import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/server/db";
import { encryptJson } from "@/server/crypto/secrets";
import { OAUTH_STATE_COOKIE, decodeOAuthDraft } from "@/server/oauth/state";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  if (err) {
    return NextResponse.redirect(
      new URL(`/app/connections?oauth_error=${encodeURIComponent(errDesc ?? err)}`, url.origin).toString(),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/app/connections?oauth_error=missing_code", url.origin).toString());
  }

  const jar = await cookies();
  const draftCipher = jar.get(OAUTH_STATE_COOKIE)?.value ?? "";
  if (!draftCipher) {
    return NextResponse.redirect(new URL("/app/connections?oauth_error=missing_state_cookie", url.origin).toString());
  }

  const draft = await decodeOAuthDraft(draftCipher).catch(() => null);
  if (!draft || draft.state !== state) {
    return NextResponse.redirect(new URL("/app/connections?oauth_error=state_mismatch", url.origin).toString());
  }

  const clientId = process.env.MS_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.MS_OAUTH_CLIENT_SECRET ?? "";
  const tenant = process.env.MS_OAUTH_TENANT ?? "common";
  const redirectUri = new URL("/api/oauth/microsoft/callback", url.origin).toString();

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/app/connections?oauth_error=server_misconfigured", url.origin).toString());
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const form = new URLSearchParams();
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("redirect_uri", redirectUri);

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const tokenJson = (await tokenRes.json().catch(() => null)) as any;
  if (!tokenRes.ok || !tokenJson?.access_token) {
    return NextResponse.redirect(
      new URL(`/app/connections?oauth_error=${encodeURIComponent("token_exchange_failed")}`, url.origin).toString(),
    );
  }

  const expiresAt = tokenJson.expires_in
    ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000).toISOString()
    : undefined;

  const cipherText = await encryptJson({
    credentials: {
      authType: "OAUTH2",
      accessToken: tokenJson.access_token,
      refreshToken: tokenJson.refresh_token,
      expiresAt,
    },
    options: draft.options ?? {},
  });

  const secret = await prisma.secret.create({
    data: {
      tenantId: draft.tenantId,
      label: `${draft.name} OAuth tokens`,
      cipherText,
    },
  });

  await prisma.connection.create({
    data: {
      tenantId: draft.tenantId,
      name: draft.name,
      type: draft.type,
      authType: "OAUTH2",
      secretId: secret.id,
      status: "CONNECTED",
    },
  });

  const res = NextResponse.redirect(new URL("/app/connections?oauth_success=1", url.origin).toString());
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}


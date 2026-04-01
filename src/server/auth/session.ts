import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "ctx_session";

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is required");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  tenantId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
};

export type StorylineValidationTokenPayload = {
  tenantId: string;
  purpose: "storyline_uri_validate";
};

export function getSessionCookieName() {
  return COOKIE_NAME;
}

/**
 * Session cookies use `Secure` in production by default so they only go over HTTPS.
 * On HTTP test hosts (plain IP or http://), set SESSION_COOKIE_SECURE=false so login works.
 * When unset: secure = NODE_ENV === "production".
 */
export function sessionCookieSecure(): boolean {
  const raw = process.env.SESSION_COOKIE_SECURE?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function getSessionCookieOptions(overrides?: { maxAge?: number }) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: sessionCookieSecure(),
    path: "/",
    maxAge: overrides?.maxAge ?? 60 * 60 * 24 * 7,
  };
}

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const userId = payload.userId;
  const tenantId = payload.tenantId;
  const role = payload.role;

  if (typeof userId !== "string") throw new Error("Invalid session userId");
  if (typeof tenantId !== "string") throw new Error("Invalid session tenantId");
  if (role !== "OWNER" && role !== "ADMIN" && role !== "MEMBER")
    throw new Error("Invalid session role");

  return { userId, tenantId, role };
}

export async function signStorylineValidationToken(tenantId: string) {
  return await new SignJWT({
    tenantId,
    purpose: "storyline_uri_validate",
  } satisfies StorylineValidationTokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());
}

export async function verifyStorylineValidationToken(
  token: string,
): Promise<StorylineValidationTokenPayload> {
  const { payload } = await jwtVerify(token, getSecretKey());
  const tenantId = payload.tenantId;
  const purpose = payload.purpose;
  if (typeof tenantId !== "string") throw new Error("Invalid validation token tenantId");
  if (purpose !== "storyline_uri_validate") {
    throw new Error("Invalid validation token purpose");
  }
  return { tenantId, purpose };
}


import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { hashTenantApiKey } from "@/server/auth/apiKeyCrypto";
import { requireSession } from "@/server/auth/requireSession";

export type TenantAuthContext = {
  tenantId: string;
  userId: string;
  role: UserRole;
  /** How this request was authenticated */
  via: "session" | "api_key";
};

function parseBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization")?.trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  const t = m?.[1]?.trim();
  return t || null;
}

/**
 * Resolves tenant + user from `Authorization: Bearer <tenant API key>` (RFC 6750), else from session cookie.
 * API keys inherit the creator's user id and role at verification time (revoked if user removed).
 */
export async function resolveTenantContext(req: Request): Promise<TenantAuthContext | null> {
  const bearer = parseBearerToken(req);
  if (bearer) {
    const keyHash = hashTenantApiKey(bearer);
    const row = await prisma.tenantApiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: { id: true, tenantId: true, createdByUserId: true },
    });
    if (!row) return null;

    const user = await prisma.user.findFirst({
      where: { id: row.createdByUserId, tenantId: row.tenantId },
      select: { id: true, role: true },
    });
    if (!user) return null;

    void prisma.tenantApiKey
      .update({
        where: { id: row.id },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});

    return {
      tenantId: row.tenantId,
      userId: user.id,
      role: user.role,
      via: "api_key",
    };
  }

  try {
    const session = await requireSession();
    return {
      tenantId: session.tenantId,
      userId: session.userId,
      role: session.role,
      via: "session",
    };
  } catch {
    return null;
  }
}

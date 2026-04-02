import { createHmac, randomBytes } from "node:crypto";

import { getEnv } from "@/server/env";

/** HMAC-SHA256 of the raw key; unique index for lookup (pepper = APP_ENCRYPTION_KEY). */
export function hashTenantApiKey(plainKey: string): string {
  const { APP_ENCRYPTION_KEY } = getEnv();
  return createHmac("sha256", APP_ENCRYPTION_KEY).update(`tenant_api_key_v1:${plainKey}`, "utf8").digest("hex");
}

/** Opaque secret suitable for Authorization: Bearer … (RFC 6750). */
export function generateTenantApiKeyPlaintext(): string {
  return `xapi_${randomBytes(32).toString("base64url")}`;
}

export function tenantApiKeyHintLast4(plainKey: string): string {
  const t = plainKey.trim();
  if (t.length <= 4) return t;
  return t.slice(-4);
}

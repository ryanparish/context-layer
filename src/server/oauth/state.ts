import { randomBytes } from "crypto";

import { decryptJson, encryptJson } from "@/server/crypto/secrets";

export type OAuthDraftConnection = {
  state: string;
  tenantId: string;
  name: string;
  type: string;
  options: Record<string, string>;
  createdAt: string;
};

export const OAUTH_STATE_COOKIE = "__cl_oauth_state";

export function newOAuthState() {
  return randomBytes(16).toString("hex");
}

export async function encodeOAuthDraft(draft: OAuthDraftConnection) {
  return await encryptJson(draft);
}

export async function decodeOAuthDraft(cipherText: string) {
  return await decryptJson<OAuthDraftConnection>(cipherText);
}


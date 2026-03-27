import { createHash, randomBytes } from "crypto";

function getAesKey() {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) throw new Error("APP_ENCRYPTION_KEY is required");
  // Derive a stable 32-byte key from arbitrary input.
  return createHash("sha256").update(raw, "utf8").digest();
}

export type EncryptedBlobV1 = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
};

export async function encryptJson(value: unknown): Promise<string> {
  const crypto = await import("crypto");
  const iv = randomBytes(12);
  const key = getAesKey();

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const blob: EncryptedBlobV1 = {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };

  return JSON.stringify(blob);
}

export async function decryptJson<T>(cipherText: string): Promise<T> {
  const crypto = await import("crypto");
  const blob = JSON.parse(cipherText) as EncryptedBlobV1;
  if (blob?.v !== 1 || blob?.alg !== "aes-256-gcm") throw new Error("Unknown secret format");

  const key = getAesKey();
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const data = Buffer.from(blob.data, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8")) as T;
}


import { createHash, timingSafeEqual } from "crypto";

export function hashStorylineToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function verifyStorylineToken(token: string, expectedHashHex: string) {
  const actual = Buffer.from(hashStorylineToken(token), "hex");
  const expected = Buffer.from(expectedHashHex, "hex");
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(actual, expected);
}


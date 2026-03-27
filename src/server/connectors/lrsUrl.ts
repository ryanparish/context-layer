import { ensureHttps } from "./lib";

/**
 * Builds the xAPI `POST /statements` URL from the LRS base the user saved
 * (e.g. SCORM Cloud `https://cloud.scorm.com/lrs/…/xAPI`).
 * Strips a trailing `/statements` so pasting a full statements URL does not become `…/statements/statements`.
 */
export function lrsStatementsPostUrl(lrsBaseUrl: string): string {
  let base = ensureHttps(lrsBaseUrl.trim()).replace(/\/+$/, "");
  if (!base) throw new Error("Invalid LRS endpoint");
  if (base.toLowerCase().endsWith("/statements")) {
    base = base.slice(0, -"/statements".length).replace(/\/+$/, "");
  }
  return `${base}/statements`;
}

/** Same base normalization for GET probes (e.g. `GET …/statements?limit=1`). */
export function lrsStatementsBaseUrl(lrsBaseUrl: string): string {
  let base = ensureHttps(lrsBaseUrl.trim()).replace(/\/+$/, "");
  if (!base) throw new Error("Invalid LRS endpoint");
  if (base.toLowerCase().endsWith("/statements")) {
    base = base.slice(0, -"/statements".length).replace(/\/+$/, "");
  }
  return base;
}

import { ConnectorAdapter, ConnectionCredentials } from "./types";
import { lrsStatementsBaseUrl } from "./lrsUrl";

/** xAPI 1.0.x LRS — Basic auth (SCORM Cloud: Key + Secret) against /statements */
export const lrsXapiBasicConnector: ConnectorAdapter = {
  type: "lrs_xapi_basic",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "BASIC") {
      return { ok: false, error: "LRS expects BASIC auth (Key as username, Secret as password)" };
    }
    const raw = typeof options?.lrsBaseUrl === "string" ? options.lrsBaseUrl : "";
    let base: string;
    try {
      base = lrsStatementsBaseUrl(raw);
    } catch {
      return { ok: false, error: "Missing LRS endpoint URL (e.g. https://cloud.scorm.com/…/xAPI)" };
    }

    const user = credentials.username.trim();
    const pass = credentials.password.trim();
    const basic = "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

    try {
      const url = new URL(`${base}/statements`);
      url.searchParams.set("limit", "1");
      url.searchParams.set("ascending", "false");

      const res = await fetch(url.toString(), {
        headers: {
          authorization: basic,
          "X-Experience-API-Version": "1.0.3",
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `LRS HTTP ${res.status}` };
      const text = await res.text();
      let parsed: unknown;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        return { ok: false, error: "LRS returned non-JSON for GET /statements" };
      }
      const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
      const stmts = obj?.statements;
      const latest =
        Array.isArray(stmts) && stmts.length > 0 ? stmts[0] : null;
      return { ok: true, lrsLatestStatement: latest, lrsStatementsResult: parsed };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

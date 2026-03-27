import { ConnectorAdapter, ConnectionCredentials } from "./types";
import { ensureHttps } from "./lib";

/** Salesforce REST — OAuth2 + My Domain instance URL */
export const salesforceRestConnector: ConnectorAdapter = {
  type: "salesforce_rest",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "OAUTH2") {
      return { ok: false, error: "Salesforce expects an OAuth2 access token" };
    }
    const raw = typeof options?.salesforceInstanceUrl === "string" ? options.salesforceInstanceUrl : "";
    const base = ensureHttps(raw);
    if (!base) return { ok: false, error: "Missing salesforceInstanceUrl (e.g. https://your-domain.my.salesforce.com)" };
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/services/data/v59.0/limits`, {
        headers: { authorization: `Bearer ${credentials.accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `Salesforce HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

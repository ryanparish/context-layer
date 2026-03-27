import { ConnectorAdapter, ConnectionCredentials } from "./types";
import { stripProtocol } from "./lib";

/** Okta — API token (SSWS) + Okta domain */
export const oktaApiConnector: ConnectorAdapter = {
  type: "okta_api",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "API_KEY") {
      return { ok: false, error: "Okta expects an API token (stored as API_KEY)" };
    }
    const domain = typeof options?.oktaDomain === "string" ? stripProtocol(options.oktaDomain) : "";
    if (!domain) return { ok: false, error: "Missing oktaDomain (e.g. dev-12345.okta.com)" };
    try {
      const res = await fetch(`https://${domain}/api/v1/users?limit=1`, {
        headers: {
          authorization: `SSWS ${credentials.apiKey}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `Okta HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

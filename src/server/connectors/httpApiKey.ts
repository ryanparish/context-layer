import { ConnectorAdapter, ConnectionCredentials } from "./types";

export const httpApiKeyConnector: ConnectorAdapter = {
  type: "http_api_key",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "API_KEY") return { ok: false, error: "Expected API_KEY credentials" };
    const url = typeof options?.healthUrl === "string" ? options.healthUrl : null;
    if (!url) return { ok: false, error: "Missing healthUrl option" };

    try {
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${credentials.apiKey}` },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};


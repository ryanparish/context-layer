import { ConnectorAdapter, ConnectionCredentials } from "./types";

/** Microsoft 365 / Entra ID — OAuth2 access token for Microsoft Graph */
export const microsoftGraphConnector: ConnectorAdapter = {
  type: "microsoft_graph",
  async test(credentials: ConnectionCredentials) {
    if (credentials.authType !== "OAUTH2") {
      return { ok: false, error: "Microsoft Graph expects an OAuth2 access token" };
    }
    try {
      const res = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: { authorization: `Bearer ${credentials.accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `Graph API HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

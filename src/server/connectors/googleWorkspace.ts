import { ConnectorAdapter, ConnectionCredentials } from "./types";

/** Google Workspace — OAuth2 access token (userinfo or Workspace-scoped) */
export const googleWorkspaceConnector: ConnectorAdapter = {
  type: "google_workspace",
  async test(credentials: ConnectionCredentials) {
    if (credentials.authType !== "OAUTH2") {
      return { ok: false, error: "Google Workspace expects an OAuth2 access token" };
    }
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { authorization: `Bearer ${credentials.accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `Google API HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

import { ConnectorAdapter, ConnectionCredentials } from "./types";

/** HubSpot — private app access token (Bearer) */
export const hubspotPrivateAppConnector: ConnectorAdapter = {
  type: "hubspot_private_app",
  async test(credentials: ConnectionCredentials) {
    if (credentials.authType !== "API_KEY") {
      return { ok: false, error: "HubSpot expects a private app access token (stored as API_KEY)" };
    }
    try {
      const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts?limit=1", {
        headers: {
          authorization: `Bearer ${credentials.apiKey}`,
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `HubSpot HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

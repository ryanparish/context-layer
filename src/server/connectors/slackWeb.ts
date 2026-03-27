import { ConnectorAdapter, ConnectionCredentials } from "./types";

/** Slack Bot User OAuth Token (xoxb-...) or legacy token — auth.test */
export const slackWebConnector: ConnectorAdapter = {
  type: "slack_web",
  async test(credentials: ConnectionCredentials) {
    if (credentials.authType !== "API_KEY") {
      return { ok: false, error: "Slack expects a bot token (API_KEY)" };
    }
    try {
      const body = new URLSearchParams({ token: credentials.apiKey });
      const res = await fetch("https://slack.com/api/auth.test", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!data.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

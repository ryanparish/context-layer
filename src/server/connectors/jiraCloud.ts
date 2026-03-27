import { ConnectorAdapter, ConnectionCredentials } from "./types";
import { ensureHttps, stripProtocol } from "./lib";

function basicAuth(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
}

/** Atlassian Jira Cloud — site + email + API token (HTTP Basic) */
export const jiraCloudConnector: ConnectorAdapter = {
  type: "jira_cloud",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "BASIC") {
      return { ok: false, error: "Jira Cloud expects BASIC: email as username, API token as password" };
    }
    const hostRaw = typeof options?.jiraSiteUrl === "string" ? options.jiraSiteUrl : "";
    const host = stripProtocol(hostRaw);
    if (!host) {
      return { ok: false, error: "Missing jiraSiteUrl (e.g. your-company.atlassian.net)" };
    }
    const base = ensureHttps(host).replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/rest/api/3/myself`, {
        headers: {
          authorization: basicAuth(credentials.username, credentials.password),
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `Jira HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

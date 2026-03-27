import { ConnectorAdapter, ConnectionCredentials } from "./types";
import { ensureHttps } from "./lib";

function basicAuth(user: string, pass: string) {
  return "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
}

/** ServiceNow — instance URL + Basic (integration user + password) */
export const servicenowBasicConnector: ConnectorAdapter = {
  type: "servicenow_basic",
  async test(credentials: ConnectionCredentials, options?: Record<string, unknown>) {
    if (credentials.authType !== "BASIC") {
      return { ok: false, error: "ServiceNow expects BASIC auth (username + password)" };
    }
    const raw = typeof options?.servicenowInstanceUrl === "string" ? options.servicenowInstanceUrl : "";
    const base = ensureHttps(raw);
    if (!base) {
      return { ok: false, error: "Missing servicenowInstanceUrl (e.g. https://your-instance.service-now.com)" };
    }
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/api/now/table/sys_user?sysparm_limit=1`, {
        headers: {
          authorization: basicAuth(credentials.username, credentials.password),
          accept: "application/json",
        },
        cache: "no-store",
      });
      if (!res.ok) return { ok: false, error: `ServiceNow HTTP ${res.status}` };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
    }
  },
};

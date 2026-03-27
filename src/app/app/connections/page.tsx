"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/ui/Reveal";
import type { IntegrationPreset } from "@/data/integrationPresets";

type ConnectionRow = {
  id: string;
  name: string;
  type: string;
  authType: "API_KEY" | "BASIC" | "OAUTH2";
  status: string;
  lastSyncAt: string | null;
  syncEnabled?: boolean;
  syncCron?: string | null;
  createdAt: string;
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [presets, setPresets] = useState<IntegrationPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [presetId, setPresetId] = useState("http_api_key");
  const [name, setName] = useState("");
  const [optionValues, setOptionValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [basicUser, setBasicUser] = useState("");
  const [basicPassword, setBasicPassword] = useState("");
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<ConnectionRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lrsPostLoadingId, setLrsPostLoadingId] = useState<string | null>(null);
  /** Last POST validation outcome per connection (green button when true). */
  const [lrsPostSuccessById, setLrsPostSuccessById] = useState<Record<string, boolean>>({});
  /** Shown panel after Validate (POST); null = dismissed. */
  const [lrsPostPanel, setLrsPostPanel] = useState<{
    connectionId: string;
    data: unknown;
    lrsHttpStatus: number;
    ok: boolean;
  } | null>(null);
  const [lrsPostJsonExpanded, setLrsPostJsonExpanded] = useState(false);
  const [connectionTestLoadingId, setConnectionTestLoadingId] = useState<string | null>(null);
  /** LRS GET /statements — latest statement + full StatementResult; null = dismissed. */
  const [lrsGetPanel, setLrsGetPanel] = useState<{
    connectionId: string;
    latestStatement: unknown | null;
    statementResult: unknown;
  } | null>(null);

  const preset = useMemo(
    () => presets.find((p) => p.id === presetId) ?? null,
    [presets, presetId],
  );

  const canCreate = useMemo(() => {
    if (!preset || name.trim().length < 2) return false;
    for (const f of preset.optionFields) {
      if (f.required && !(optionValues[f.key]?.trim().length)) return false;
    }
    if (preset.authMode === "api_key") return apiKey.trim().length > 0;
    if (preset.authMode === "oauth2_bearer") return accessToken.trim().length > 0;
    if (preset.authMode === "basic") {
      return basicUser.trim().length > 0 && basicPassword.trim().length > 0;
    }
    return false;
  }, [preset, name, optionValues, apiKey, accessToken, basicUser, basicPassword]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/connections", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load connections");
      const data = (await res.json()) as { connections: ConnectionRow[] };
      setConnections(data.connections);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load connections");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setScheduleDrafts((prev) => {
      const next = { ...prev };
      for (const c of connections) {
        if (!next[c.id]) next[c.id] = c.syncCron ?? "0 * * * *";
      }
      return next;
    });
  }, [connections]);

  useEffect(() => {
    void fetch("/api/integrations/presets")
      .then((r) => r.json())
      .then((data: { presets: IntegrationPreset[] }) => setPresets(data.presets ?? []))
      .catch(() => setPresets([]));
  }, []);

  function onPresetChange(id: string) {
    setPresetId(id);
    setOptionValues({});
    setApiKey("");
    setAccessToken("");
    setBasicUser("");
    setBasicPassword("");
  }

  async function createConnection(e: React.FormEvent) {
    e.preventDefault();
    if (!preset || !canCreate) return;

    setError(null);

    const options: Record<string, string> = {};
    for (const f of preset.optionFields) {
      const v = optionValues[f.key]?.trim() ?? "";
      if (v) options[f.key] = v;
    }

    let authType: "API_KEY" | "BASIC" | "OAUTH2";
    let credentials: Record<string, unknown>;

    if (preset.authMode === "api_key") {
      authType = "API_KEY";
      credentials = { authType: "API_KEY", apiKey: apiKey.trim() };
    } else if (preset.authMode === "oauth2_bearer") {
      authType = "OAUTH2";
      credentials = { authType: "OAUTH2", accessToken: accessToken.trim() };
    } else {
      authType = "BASIC";
      credentials = {
        authType: "BASIC",
        username: basicUser.trim(),
        password: basicPassword.trim(),
      };
    }

    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: preset.id,
          authType,
          credentials,
          options,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create connection");
      }
      setName("");
      onPresetChange(preset.id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create connection");
    }
  }

  function startOAuthRedirect() {
    if (!preset?.oauthRedirect) return;
    const qs = new URLSearchParams();
    qs.set("name", name.trim() || preset.name);
    // Option fields become connection secret `options` during callback.
    for (const f of preset.optionFields) {
      const v = optionValues[f.key]?.trim() ?? "";
      if (v) qs.set(`opt_${f.key}`, v);
    }
    window.location.href = `/api/oauth/${preset.oauthRedirect.provider}/start?${qs.toString()}`;
  }

  async function testConnection(id: string) {
    setError(null);
    setLrsPostPanel(null);
    setConnectionTestLoadingId(id);
    try {
      const res = await fetch(`/api/connections/${id}/test`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        lrsLatestStatement?: unknown | null;
        lrsStatementsResult?: unknown;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Test failed");
      if (data?.ok) {
        if (data.lrsStatementsResult !== undefined) {
          setLrsGetPanel({
            connectionId: id,
            latestStatement: data.lrsLatestStatement ?? null,
            statementResult: data.lrsStatementsResult,
          });
          return;
        }
        alert("Connection test OK");
        return;
      }
      throw new Error(data?.error ?? "Test failed");
    } catch (e) {
      setLrsGetPanel(null);
      setError(e instanceof Error ? e.message : "Test failed");
    } finally {
      setConnectionTestLoadingId(null);
    }
  }

  async function testLrsPostStatement(id: string) {
    setError(null);
    setLrsGetPanel(null);
    setLrsPostJsonExpanded(false);
    setLrsPostSuccessById((prev) => ({ ...prev, [id]: false }));
    setLrsPostLoadingId(id);
    try {
      const res = await fetch(`/api/connections/${id}/test-lrs-post`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const httpStatus = typeof data?.httpStatus === "number" ? data.httpStatus : 0;
      /** LRS success: 200 with body, or 204 No Content (common for xAPI POST). */
      const lrsOk =
        res.ok && data?.ok === true && (httpStatus === 200 || httpStatus === 204);
      setLrsPostSuccessById((prev) => ({ ...prev, [id]: lrsOk }));
      if (data) {
        setLrsPostPanel({
          connectionId: id,
          data,
          lrsHttpStatus: httpStatus,
          ok: lrsOk,
        });
      } else {
        setLrsPostPanel(null);
      }
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "LRS POST validation failed");
        return;
      }
    } catch (e) {
      setLrsPostSuccessById((prev) => ({ ...prev, [id]: false }));
      setLrsPostPanel(null);
      setError(e instanceof Error ? e.message : "LRS POST validation failed");
    } finally {
      setLrsPostLoadingId(null);
    }
  }

  function dismissLrsPostPanel() {
    setLrsPostPanel(null);
    setLrsPostJsonExpanded(false);
  }

  function dismissLrsGetPanel() {
    setLrsGetPanel(null);
  }

  async function confirmDeleteConnection() {
    if (!deleteTarget) return;
    setError(null);
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/connections/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete connection");
      setDeleteTarget(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete connection");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function saveSchedule(id: string, enabled: boolean, cron: string) {
    setError(null);
    try {
      const res = await fetch(`/api/connections/${id}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled, cron }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to update schedule");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update schedule");
    }
  }

  function isLikelyCron(value: string) {
    const parts = value.trim().split(/\s+/);
    return parts.length === 5 || parts.length === 6;
  }

  return (
    <div className="space-y-6">
      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-connection-title"
        >
          <div className="panel w-full max-w-md p-5">
            <h2 id="delete-connection-title" className="text-lg font-semibold">
              Delete connection?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes <span className="font-semibold text-slate-800">{deleteTarget.name}</span> and its stored
              credentials. Scheduled syncs and any Storyline bridges using this connection will stop working. This
              cannot be undone.
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={deleteLoading}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-300 bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
                disabled={deleteLoading}
                onClick={() => void confirmDeleteConnection()}
              >
                {deleteLoading ? "Deleting…" : "Delete connection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Connections</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Built-in connectors for common enterprise apps plus a custom HTTP probe. Bring your own OAuth tokens or API
          keys from each vendor&apos;s admin console.
        </p>
      </div>

      <Reveal delayMs={40}>
        <form onSubmit={createConnection} className="panel p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-sm">Integration</label>
              <select
                className="field"
                value={presetId}
                onChange={(e) => onPresetChange(e.target.value)}
              >
                {presets.length === 0 ? (
                  <option value="http_api_key">Loading presets…</option>
                ) : (
                  presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.category}
                    </option>
                  ))
                )}
              </select>
              {preset ? (
                <p className="mt-2 text-sm text-slate-600">{preset.description}</p>
              ) : null}
              {preset?.docsUrl ? (
                <a
                  className="mt-1 inline-block text-sm font-semibold text-orange-600 hover:text-orange-500"
                  href={preset.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Vendor documentation
                </a>
              ) : null}
              {preset?.id === "lrs_xapi_basic" ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold text-slate-900">SCORM Cloud (and similar)</p>
                  <p className="mt-1 leading-relaxed">
                    From your app&apos;s credentials: copy the <strong>LRS endpoint</strong> (the full xAPI base URL),
                    the <strong>Key</strong>, and the <strong>Secret</strong>. Those use HTTP Basic authentication—the Key
                    is sent as the Basic username and the Secret as the Basic password (never exposed to the browser
                    after you save).
                  </p>
                </div>
              ) : null}
            </div>

            <div>
              <label className="text-sm">Connection name</label>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Production Salesforce"
                required
              />
            </div>

            <div className="hidden md:block" aria-hidden />

            {preset?.optionFields.map((f) => (
              <div key={f.key} className={f.required ? "" : "md:col-span-1"}>
                <label className="text-sm">{f.label}</label>
                <input
                  className="field"
                  value={optionValues[f.key] ?? ""}
                  onChange={(e) => setOptionValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              </div>
            ))}

            {preset?.authMode === "api_key" ? (
              <div className="md:col-span-2">
                <label className="text-sm">API token / key</label>
                <input
                  className="field"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Paste token from the vendor"
                  autoComplete="off"
                  required
                />
              </div>
            ) : null}

            {preset?.authMode === "oauth2_bearer" ? (
              <div className="md:col-span-2">
                <label className="text-sm">OAuth2 access token</label>
                <textarea
                  className="field min-h-[88px] resize-y"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Paste a current access token (add full OAuth flow later)"
                  autoComplete="off"
                  required={!preset.oauthRedirect}
                />
                {preset.oauthRedirect ? (
                  <button
                    type="button"
                    className="btn-secondary mt-2"
                    onClick={startOAuthRedirect}
                    disabled={name.trim().length < 2}
                  >
                    Connect via OAuth redirect
                  </button>
                ) : null}
              </div>
            ) : null}

            {preset?.authMode === "basic" ? (
              <>
                <div>
                  <label className="text-sm">
                    {preset.id === "lrs_xapi_basic" ? "Key (Basic auth username)" : "Username"}
                  </label>
                  <input
                    className="field"
                    value={basicUser}
                    onChange={(e) => setBasicUser(e.target.value)}
                    placeholder={
                      preset.id === "lrs_xapi_basic"
                        ? "LRS application key"
                        : preset.id === "jira_cloud"
                          ? "Atlassian account email"
                          : "Integration username"
                    }
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm">
                    {preset.id === "lrs_xapi_basic" ? "Secret (Basic auth password)" : "Password / API token"}
                  </label>
                  <input
                    className="field"
                    type="password"
                    value={basicPassword}
                    onChange={(e) => setBasicPassword(e.target.value)}
                    placeholder={
                      preset.id === "lrs_xapi_basic"
                        ? "LRS secret"
                        : preset.id === "jira_cloud"
                          ? "Jira API token"
                          : "Password or secret"
                    }
                    autoComplete="off"
                    required
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button disabled={!canCreate} className="btn-primary" type="submit">
              Add connection
            </button>
            <button type="button" onClick={refresh} className="btn-secondary">
              Refresh list
            </button>
          </div>
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}
        </form>
      </Reveal>

      <Reveal delayMs={90}>
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
            Existing connections
          </div>
          <div className="p-4">
            {loading ? (
              <div className="text-sm text-slate-600">Loading…</div>
            ) : connections.length === 0 ? (
              <div className="text-sm text-slate-600">No connections yet.</div>
            ) : (
              <div className="space-y-3">
                {connections.map((c, index) => (
                  <Reveal key={c.id} delayMs={Math.min(index * 50, 300)}>
                    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-600">
                          {c.type} • {c.authType} • {c.status}
                        </div>
                        {c.type === "lrs_xapi_basic" ? (
                          <p className="mt-2 text-xs text-slate-600">
                            Event-driven xAPI only (statements on request). No scheduled sync or cron applies to this
                            connection type.
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">Sync</span>
                            <span>{c.syncEnabled ? "enabled" : "disabled"}</span>
                            <select
                              className="field !h-8 !w-[170px] !py-1 !text-xs"
                              onChange={(e) =>
                                setScheduleDrafts((prev) => ({ ...prev, [c.id]: e.target.value || prev[c.id] || "" }))
                              }
                              value=""
                            >
                              <option value="">Quick cron...</option>
                              <option value="*/15 * * * *">Every 15 minutes</option>
                              <option value="0 * * * *">Hourly</option>
                              <option value="0 */6 * * *">Every 6 hours</option>
                              <option value="0 0 * * *">Daily at midnight</option>
                            </select>
                            <input
                              className="field !h-8 !w-[220px] !py-1 !text-xs"
                              value={scheduleDrafts[c.id] ?? c.syncCron ?? "0 * * * *"}
                              placeholder="cron (e.g. 0 * * * *)"
                              onChange={(e) =>
                                setScheduleDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => {
                                const value = (scheduleDrafts[c.id] ?? "").trim();
                                if (!isLikelyCron(value)) {
                                  setError("Cron should have 5 or 6 fields, e.g. 0 * * * *");
                                  return;
                                }
                                void saveSchedule(c.id, true, value);
                              }}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => void saveSchedule(c.id, false, c.syncCron ?? "")}
                            >
                              Disable
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void testConnection(c.id)}
                          className="btn-secondary"
                          disabled={connectionTestLoadingId === c.id}
                        >
                          {connectionTestLoadingId === c.id ? "Testing…" : "Test (GET)"}
                        </button>
                        {c.type === "lrs_xapi_basic" ? (
                          <button
                            type="button"
                            onClick={() => void testLrsPostStatement(c.id)}
                            className={[
                              "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60",
                              lrsPostSuccessById[c.id]
                                ? "!border-emerald-500 !bg-emerald-600 !text-white hover:!bg-emerald-500"
                                : "btn-secondary",
                            ].join(" ")}
                            disabled={lrsPostLoadingId === c.id}
                            title="POST a minimal xAPI statement to your real LRS endpoint"
                          >
                            {lrsPostLoadingId === c.id ? "Posting…" : "Validate (POST)"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(c)}
                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
          {lrsGetPanel ? (
            <div className="border-t border-slate-200 bg-slate-50/90 px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-900">LRS GET — latest statement</div>
                  <div className="mt-1 text-xs text-slate-700">
                    Fetched <code className="rounded bg-slate-200/80 px-1">GET …/statements?limit=1&amp;ascending=false</code>{" "}
                    against your saved LRS endpoint (newest stored statement first).
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={dismissLrsGetPanel}
                  aria-label="Dismiss LRS GET result"
                >
                  Close
                </button>
              </div>
              <pre className="mt-2 max-h-[280px] overflow-auto rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-800">
                {JSON.stringify(
                  {
                    latestStatement: lrsGetPanel.latestStatement,
                    statementResult: lrsGetPanel.statementResult,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ) : null}
          {lrsPostPanel ? (
            <div
              className={[
                "border-t px-4 py-3",
                lrsPostPanel.ok ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-slate-50",
              ].join(" ")}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-900">LRS POST validation</div>
                  <div className="mt-1 text-xs text-slate-700">
                    {lrsPostPanel.ok ? (
                      <span className="font-medium text-emerald-800">
                        Success — LRS responded with HTTP {lrsPostPanel.lrsHttpStatus}
                      </span>
                    ) : (
                      <span className="font-medium text-red-800">
                        Not successful — HTTP {lrsPostPanel.lrsHttpStatus || "—"}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  onClick={dismissLrsPostPanel}
                  aria-label="Dismiss validation result"
                >
                  Close
                </button>
              </div>
              <button
                type="button"
                className="mt-2 text-xs font-medium text-orange-700 underline hover:text-orange-600"
                onClick={() => setLrsPostJsonExpanded((e) => !e)}
              >
                {lrsPostJsonExpanded ? "Hide response details" : "View response details (JSON)"}
              </button>
              {lrsPostJsonExpanded ? (
                <pre className="mt-2 max-h-[280px] overflow-auto rounded border border-slate-200 bg-white p-2 text-[11px] text-slate-800">
                  {JSON.stringify(lrsPostPanel.data, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </Reveal>
    </div>
  );
}

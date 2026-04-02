"use client";

import { useCallback, useEffect, useState } from "react";

type KeyRow = {
  id: string;
  name: string;
  hintLast4: string;
  createdAt: string;
  lastUsedAt: string | null;
  createdByUserId: string;
};

export function TenantApiKeysPanel() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [newName, setNewName] = useState("Integrations");
  const [plainOnce, setPlainOnce] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant-api-keys", { cache: "no-store", credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { keys?: KeyRow[]; error?: string } | null;
      if (res.status === 403) {
        setForbidden(true);
        setKeys([]);
        return;
      }
      setForbidden(false);
      if (!res.ok) throw new Error(data?.error ?? "Failed to load API keys");
      setKeys(data?.keys ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load API keys");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createKey() {
    setBusy(true);
    setError(null);
    setInfo(null);
    setPlainOnce(null);
    try {
      const res = await fetch("/api/tenant-api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() || "API key" }),
      });
      const raw = await res.text();
      type CreateKeyJson = {
        key?: { plaintext: string };
        error?: string;
        message?: string;
        issues?: unknown;
      };
      let data: CreateKeyJson | null = null;
      try {
        data = raw ? (JSON.parse(raw) as CreateKeyJson) : null;
      } catch {
        data = null;
      }
      if (!res.ok) {
        const fromIssues =
          Array.isArray(data?.issues) && data.issues.length
            ? JSON.stringify(data.issues)
            : "";
        const errMsg =
          typeof data?.error === "string"
            ? data.error
            : raw?.trim()
              ? raw.trim().slice(0, 400)
              : `Request failed (HTTP ${res.status})`;
        throw new Error(fromIssues ? `${errMsg} ${fromIssues}` : errMsg);
      }
      setPlainOnce(data?.key?.plaintext ?? null);
      setInfo(data?.message ?? null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create key");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (!globalThis.confirm("Revoke this API key? Integrations using it will stop working.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant-api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to revoke");
      setInfo("Key revoked.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setBusy(false);
    }
  }

  async function copyPlaintext() {
    if (!plainOnce) return;
    try {
      await navigator.clipboard.writeText(plainOnce);
      setInfo("Secret copied to clipboard.");
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  return (
    <div className="panel p-5">
      <div className="text-sm font-semibold text-slate-800">Tenant API keys</div>
      <p className="mt-1 text-sm text-slate-600">
        Use <code className="rounded bg-slate-100 px-1 text-xs">Authorization: Bearer &lt;secret&gt;</code> in Postman
        or server integrations (RFC 6750). Keys inherit the permissions of the user who created them. Store secrets
        safely; we only keep a one-way hash.
      </p>

      {forbidden ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Only <strong>owners</strong> and <strong>admins</strong> can create or revoke tenant API keys.
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {info && !plainOnce ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </div>
      ) : null}

      {plainOnce ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="text-sm font-semibold text-amber-950">Copy this secret now</div>
          <p className="mt-1 text-xs text-amber-900">{info}</p>
          <pre className="mt-2 overflow-auto rounded border border-amber-200 bg-white p-2 text-xs text-slate-900">
            {plainOnce}
          </pre>
          <button type="button" className="btn-secondary mt-2 text-sm" onClick={() => void copyPlaintext()}>
            Copy to clipboard
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="text-sm text-slate-700">Label</label>
          <input
            className="field mt-1"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Postman, n8n"
            disabled={busy || forbidden}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={busy || forbidden}
          onClick={() => void createKey()}
        >
          {busy ? "Working…" : "Create API key"}
        </button>
      </div>

      <div className="mt-6 text-sm font-semibold text-slate-800">Active keys</div>
      {loading ? (
        <p className="mt-2 text-sm text-slate-600">Loading…</p>
      ) : keys.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No active keys yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-slate-900">{k.name}</div>
                <div className="text-xs text-slate-600">
                  …{k.hintLast4} · created {new Date(k.createdAt).toLocaleString()}
                  {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleString()}` : " · never used"}
                </div>
              </div>
              <button
                type="button"
                className="rounded border border-red-200 bg-white px-3 py-1.5 text-sm text-red-800 hover:bg-red-50"
                disabled={busy}
                onClick={() => void revoke(k.id)}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

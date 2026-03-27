"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/ui/Reveal";

type Verb = { iri: string; display: string; source?: "default" | "custom" };
type Uri = { id: string; iri: string; label: string; kind: string };
type ConnectionRow = { id: string; name: string; type: string };

type BridgeVar = {
  id?: string;
  key: string;
  direction: "IN" | "OUT";
  storylineName: string;
  jsonPath?: string;
};

type Bridge = {
  id: string;
  name: string;
  connectionId: string;
  allowedOrigins: string[];
  enabled: boolean;
  variables: BridgeVar[];
};

export default function StorylinePage() {
  const [verbs, setVerbs] = useState<Verb[]>([]);
  const [uris, setUris] = useState<Uri[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [bridges, setBridges] = useState<Bridge[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Verb creator
  const [verbIri, setVerbIri] = useState("https://example.com/xapi/verbs/custom");
  const [verbDisplay, setVerbDisplay] = useState("custom");

  // URI creator
  const [uriIri, setUriIri] = useState("https://example.com/activity");
  const [uriLabel, setUriLabel] = useState("My activity");
  const [uriKind, setUriKind] = useState("ACTIVITY");

  // Bridge creator
  const [bridgeName, setBridgeName] = useState("Storyline → LRS");
  const [bridgeConnectionId, setBridgeConnectionId] = useState("");
  const [bridgeAllowedOrigins, setBridgeAllowedOrigins] = useState("");
  const [bridgeVars, setBridgeVars] = useState<BridgeVar[]>([
    { key: "learnerEmail", direction: "IN", storylineName: "LearnerEmail" },
  ]);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createdBridgeId, setCreatedBridgeId] = useState<string | null>(null);

  // JS generator
  const [selectedBridgeId, setSelectedBridgeId] = useState<string>("");
  const [bridgeToken, setBridgeToken] = useState<string>("");
  const [selectedVerbIri, setSelectedVerbIri] = useState<string>("");
  const [selectedObjectIri, setSelectedObjectIri] = useState<string>("");
  const [actorMboxVarKey, setActorMboxVarKey] = useState<string>("");
  const [appBaseUrl, setAppBaseUrl] = useState<string>("");
  const [generatedJs, setGeneratedJs] = useState<string>("");

  const selectedBridge = useMemo(
    () => bridges.find((b) => b.id === selectedBridgeId) ?? null,
    [bridges, selectedBridgeId],
  );

  const lrsConnections = useMemo(
    () => connections.filter((c) => c.type === "lrs_xapi_basic"),
    [connections],
  );

  async function refreshAll() {
    setError(null);
    setInfo(null);
    try {
      const [v, u, c, b] = await Promise.all([
        fetch("/api/xapi/verbs", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/xapi/uris", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/connections", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/storyline/bridges", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setVerbs((v?.verbs ?? []) as Verb[]);
      setUris((u?.uris ?? []) as Uri[]);
      setConnections((c?.connections ?? []) as ConnectionRow[]);
      setBridges((b?.bridges ?? []) as Bridge[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Storyline tools");
    }
  }

  useEffect(() => {
    void refreshAll();
    setAppBaseUrl(window.location.origin);
  }, []);

  useEffect(() => {
    if (!selectedVerbIri && verbs.length) setSelectedVerbIri(verbs[0]?.iri ?? "");
  }, [verbs, selectedVerbIri]);

  useEffect(() => {
    if (!selectedObjectIri && uris.length) setSelectedObjectIri(uris[0]?.iri ?? "");
  }, [uris, selectedObjectIri]);

  async function saveVerb(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/xapi/verbs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          iri: verbIri.trim(),
          display: verbDisplay.trim(),
          description: `Custom verb '${verbDisplay.trim()}'`,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save verb");
      }
      setInfo("Saved verb.");
      await refreshAll();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to save verb");
    }
  }

  async function saveUri(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/xapi/uris", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ iri: uriIri.trim(), label: uriLabel.trim(), kind: uriKind.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to save URI");
      }
      setInfo("Saved URI.");
      await refreshAll();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to save URI");
    }
  }

  function addVar() {
    setBridgeVars((prev) => [
      ...prev,
      { key: `var${prev.length + 1}`, direction: "IN", storylineName: `Var${prev.length + 1}` },
    ]);
  }

  function updateVar(idx: number, patch: Partial<BridgeVar>) {
    setBridgeVars((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  }

  function removeVar(idx: number) {
    setBridgeVars((prev) => prev.filter((_, i) => i !== idx));
  }

  async function createBridge(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCreatedToken(null);
    setCreatedBridgeId(null);

    const allowed = bridgeAllowedOrigins
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/storyline/bridges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: bridgeName.trim(),
          connectionId: bridgeConnectionId,
          allowedOrigins: allowed,
          variables: bridgeVars.map((v) => ({
            key: v.key.trim(),
            direction: v.direction,
            storylineName: v.storylineName.trim(),
            jsonPath: v.jsonPath?.trim() || undefined,
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { bridge?: { id: string }; token?: string; error?: string }
        | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to create bridge");

      setCreatedToken(body?.token ?? null);
      setCreatedBridgeId(body?.bridge?.id ?? null);
      setInfo("Created bridge (token shown once).");
      await refreshAll();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to create bridge");
    }
  }

  async function generateJs(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBridgeId) return;
    setError(null);
    setInfo(null);
    setGeneratedJs("");
    try {
      const res = await fetch(`/api/storyline/bridges/${selectedBridgeId}/js`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: bridgeToken.trim(),
          appBaseUrl: appBaseUrl.trim(),
          verbIri: selectedVerbIri,
          objectIri: selectedObjectIri,
          actorMboxVarKey: actorMboxVarKey || undefined,
        }),
      });
      const body = (await res.json().catch(() => null)) as { code?: string; error?: string } | null;
      if (!res.ok) throw new Error(body?.error ?? "Failed to generate code");
      setGeneratedJs(body?.code ?? "");
      setInfo("Generated JavaScript.");
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Failed to generate code");
    }
  }

  const actorVarOptions = useMemo(() => {
    const vars = selectedBridge?.variables?.filter((v) => v.direction === "IN") ?? [];
    return vars;
  }, [selectedBridge]);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Storyline xAPI</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Build and catalog xAPI URIs + verbs, then generate secure Articulate Storyline JavaScript that relays
          statements through the backend (LRS credentials never live in the course).
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {info}
        </div>
      ) : null}

      <Reveal delayMs={40}>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <form onSubmit={saveVerb} className="panel p-5">
            <div className="text-sm font-semibold text-slate-900">Verb registry</div>
            <p className="mt-1 text-sm text-slate-600">Add or override verbs for your tenant.</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm">Verb IRI</label>
                <input className="field" value={verbIri} onChange={(e) => setVerbIri(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Display</label>
                <input className="field" value={verbDisplay} onChange={(e) => setVerbDisplay(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button className="btn-primary" type="submit">
                Save verb
              </button>
              <div className="text-xs text-slate-600">{verbs.length} verbs loaded</div>
            </div>
          </form>

          <form onSubmit={saveUri} className="panel p-5">
            <div className="text-sm font-semibold text-slate-900">URI catalog</div>
            <p className="mt-1 text-sm text-slate-600">Save activity/object URIs for reuse.</p>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm">IRI</label>
                <input className="field" value={uriIri} onChange={(e) => setUriIri(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Label</label>
                <input className="field" value={uriLabel} onChange={(e) => setUriLabel(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Kind</label>
                <input className="field" value={uriKind} onChange={(e) => setUriKind(e.target.value)} />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <button className="btn-primary" type="submit">
                Save URI
              </button>
              <div className="text-xs text-slate-600">{uris.length} URIs loaded</div>
            </div>
          </form>
        </div>
      </Reveal>

      <Reveal delayMs={90}>
        <form onSubmit={createBridge} className="panel p-5">
          <div className="text-sm font-semibold text-slate-900">Storyline Bridge</div>
          <p className="mt-1 text-sm text-slate-600">
            Create a bridge token + variable map. Use an LRS connection (`lrs_xapi_basic`) so the backend can forward
            statements securely.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Bridge name</label>
              <input className="field" value={bridgeName} onChange={(e) => setBridgeName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">LRS connection</label>
              <select
                className="field"
                value={bridgeConnectionId}
                onChange={(e) => setBridgeConnectionId(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {lrsConnections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {lrsConnections.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No LRS connections found. Add one under Connections.</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="text-sm">Allowed origins (comma-separated, optional)</label>
              <input
                className="field"
                value={bridgeAllowedOrigins}
                onChange={(e) => setBridgeAllowedOrigins(e.target.value)}
                placeholder="e.g. https://your-lms.example.com, https://cdn.example.com"
              />
              <p className="mt-2 text-xs text-slate-600">
                If set, the relay will reject requests that don’t match an allowed `Origin` header.
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">Storyline variables</div>
              <button type="button" className="btn-secondary" onClick={addVar}>
                Add variable
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {bridgeVars.map((v, idx) => (
                <div
                  key={`${v.key}-${idx}`}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-5"
                >
                  <div>
                    <label className="text-xs text-slate-700">Key</label>
                    <input className="field" value={v.key} onChange={(e) => updateVar(idx, { key: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700">Direction</label>
                    <select
                      className="field"
                      value={v.direction}
                      onChange={(e) => updateVar(idx, { direction: e.target.value as "IN" | "OUT" })}
                    >
                      <option value="IN">IN (GetVar)</option>
                      <option value="OUT">OUT (SetVar)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-slate-700">Storyline variable name</label>
                    <input
                      className="field"
                      value={v.storylineName}
                      onChange={(e) => updateVar(idx, { storylineName: e.target.value })}
                    />
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <button type="button" className="btn-secondary" onClick={() => removeVar(idx)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-primary" type="submit" disabled={!bridgeConnectionId}>
              Create bridge
            </button>
            <button type="button" className="btn-secondary" onClick={refreshAll}>
              Refresh
            </button>
          </div>

          {createdToken ? (
            <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="text-sm font-semibold text-orange-900">Bridge token (shown once)</div>
              <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <div className="md:col-span-2">
                  <input className="field" readOnly value={createdToken} />
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void navigator.clipboard.writeText(createdToken)}
                >
                  Copy
                </button>
              </div>
              <div className="mt-2 text-xs text-orange-900/80">
                Store this securely. If you lose it, create a new bridge token.
              </div>
              {createdBridgeId ? (
                <div className="mt-1 text-xs text-orange-900/70">Bridge ID: {createdBridgeId}</div>
              ) : null}
            </div>
          ) : null}
        </form>
      </Reveal>

      <Reveal delayMs={120}>
        <form onSubmit={generateJs} className="panel p-5">
          <div className="text-sm font-semibold text-slate-900">Generate Storyline JavaScript</div>
          <p className="mt-1 text-sm text-slate-600">
            Choose a bridge + verb + object URI. The output uses `GetVar` for IN variables and `SetVar` for OUT
            variables.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm">Bridge</label>
              <select className="field" value={selectedBridgeId} onChange={(e) => setSelectedBridgeId(e.target.value)}>
                <option value="">Select…</option>
                {bridges.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Bridge token</label>
              <input
                className="field"
                value={bridgeToken}
                onChange={(e) => setBridgeToken(e.target.value)}
                placeholder="Paste the bridge token"
              />
            </div>

            <div>
              <label className="text-sm">Verb</label>
              <select className="field" value={selectedVerbIri} onChange={(e) => setSelectedVerbIri(e.target.value)}>
                {verbs.map((v) => (
                  <option key={v.iri} value={v.iri}>
                    {v.display} ({v.source ?? "default"})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm">Object/activity URI</label>
              <select
                className="field"
                value={selectedObjectIri}
                onChange={(e) => setSelectedObjectIri(e.target.value)}
              >
                {uris.map((u) => (
                  <option key={u.id} value={u.iri}>
                    {u.label} — {u.iri}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm">Actor mbox variable key</label>
              <select
                className="field"
                value={actorMboxVarKey}
                onChange={(e) => setActorMboxVarKey(e.target.value)}
              >
                <option value="">Select…</option>
                {actorVarOptions.map((v) => (
                  <option key={v.key} value={v.key}>
                    {v.key} (Storyline: {v.storylineName})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-600">
                The relay currently requires an email address (mbox) to send a statement.
              </p>
            </div>
            <div>
              <label className="text-sm">App base URL</label>
              <input className="field" value={appBaseUrl} onChange={(e) => setAppBaseUrl(e.target.value)} />
              <p className="mt-2 text-xs text-slate-600">
                Use your deployed xAPIvate URL, not the LMS URL.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-primary" type="submit" disabled={!selectedBridgeId || !bridgeToken}>
              Generate JavaScript
            </button>
          </div>

          {generatedJs ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Output</div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => void navigator.clipboard.writeText(generatedJs)}
                >
                  Copy
                </button>
              </div>
              <textarea className="field mt-2 min-h-[240px] font-mono text-xs" readOnly value={generatedJs} />
            </div>
          ) : null}
        </form>
      </Reveal>
    </div>
  );
}


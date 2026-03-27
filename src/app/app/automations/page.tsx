"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/ui/Reveal";

type Workflow = {
  id: string;
  name: string;
  enabled: boolean;
  trigger: any;
  action: any;
  createdAt: string;
};

type WorkflowRun = {
  id: string;
  workflowId: string;
  status: string;
  error: string | null;
  createdAt: string;
};

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [verbId, setVerbId] = useState("https://w3id.org/xapi/adl/verbs/attended");
  const [webhookUrl, setWebhookUrl] = useState("https://httpbin.org/post");

  async function refresh() {
    setError(null);
    const [wRes, rRes] = await Promise.all([
      fetch("/api/workflows", { cache: "no-store" }),
      fetch("/api/workflow-runs", { cache: "no-store" }),
    ]);
    if (!wRes.ok) throw new Error("Failed to load workflows");
    if (!rRes.ok) throw new Error("Failed to load runs");
    const w = (await wRes.json()) as { workflows: Workflow[] };
    const r = (await rRes.json()) as { runs: WorkflowRun[] };
    setWorkflows(w.workflows);
    setRuns(r.runs);
  }

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  async function createWorkflow(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          trigger: { type: "xapi_match", verbId },
          action: { type: "webhook", url: webhookUrl },
          enabled: true,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Failed to create workflow");
      }
      setName("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create workflow");
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Automations</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Trigger workflows on xAPI statements. Start the worker with <code>npm run worker</code>.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Reveal delayMs={40}>
      <form onSubmit={createWorkflow} className="panel p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="text-sm">Name</label>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Webhook on attended"
              required
            />
          </div>
          <div>
            <label className="text-sm">Match verbId</label>
            <input
              className="field"
              value={verbId}
              onChange={(e) => setVerbId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm">Webhook URL</label>
            <input
              className="field"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button className="btn-primary">
            Create workflow
          </button>
          <button
            type="button"
            onClick={() => void refresh().catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))}
            className="btn-secondary"
          >
            Refresh
          </button>
        </div>
      </form>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Reveal delayMs={90}>
        <div className="panel">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Workflows</div>
          <div className="p-4 space-y-3">
            {workflows.length === 0 ? (
              <div className="text-sm text-slate-600">No workflows yet.</div>
            ) : (
              workflows.map((w) => (
                <div key={w.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="font-semibold text-slate-900">{w.name}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {w.enabled ? "Enabled" : "Disabled"} • Trigger: {JSON.stringify(w.trigger)} • Action:{" "}
                    {JSON.stringify(w.action)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </Reveal>
        <Reveal delayMs={120}>
        <div className="panel">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">Recent runs</div>
          <div className="p-4 space-y-3">
            {runs.length === 0 ? (
              <div className="text-sm text-slate-600">No runs yet.</div>
            ) : (
              runs.map((r) => (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{r.status}</div>
                    <div className="text-xs text-slate-600">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {r.error ? <div className="mt-1 text-xs text-red-700">{r.error}</div> : null}
                  <div className="mt-1 text-xs text-slate-600">Workflow: {r.workflowId}</div>
                </div>
              ))
            )}
          </div>
        </div>
        </Reveal>
      </div>
    </div>
  );
}


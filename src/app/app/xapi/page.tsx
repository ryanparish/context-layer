"use client";

import { useEffect, useMemo, useState } from "react";
import Reveal from "@/components/ui/Reveal";

type StatementRow = {
  id: string;
  createdAt: string;
  occurredAt: string | null;
  actorMbox: string | null;
  verbId: string | null;
  objectId: string | null;
  statement: unknown;
};

export default function XapiPage() {
  const [items, setItems] = useState<StatementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const since = useMemo(() => new Date(Date.now() - 60_000).toISOString(), []);

  useEffect(() => {
    const es = new EventSource(`/api/xapi/stream?since=${encodeURIComponent(since)}`);
    setConnected(true);

    es.addEventListener("statement", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as StatementRow;
        setItems((prev) => {
          const next = [data, ...prev];
          return next.slice(0, 200);
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener("error", () => {
      setConnected(false);
      setError("Stream disconnected");
    });

    return () => es.close();
  }, [since]);

  async function ingestSample() {
    setError(null);
    const statement = {
      actor: { mbox: "mailto:demo@example.com" },
      verb: { id: "https://w3id.org/xapi/adl/verbs/attended" },
      object: { id: "https://example.com/course/123" },
      timestamp: new Date().toISOString(),
    };
    const res = await fetch("/api/xapi/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statement }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Ingest failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">xAPI Stream</h1>
          <p className="mt-1 text-sm text-zinc-300">
            Live statements via SSE. Status:{" "}
            <span className={connected ? "text-emerald-400" : "text-red-400"}>
              {connected ? "connected" : "disconnected"}
            </span>
          </p>
        </div>
        <button onClick={() => void ingestSample()} className="btn-primary">
          Ingest sample statement
        </button>
      </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <Reveal delayMs={70}>
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          Recent statements
        </div>
        <div className="divide-y divide-slate-200">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-600">No statements yet.</div>
          ) : (
            items.map((s) => (
              <div key={s.id} className="px-4 py-3 hover:bg-slate-50">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-900">{s.actorMbox ?? "—"}</span>
                  <span className="text-slate-600">{s.verbId ?? "—"}</span>
                  <span className="text-slate-600">{s.objectId ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {new Date(s.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      </Reveal>
    </div>
  );
}


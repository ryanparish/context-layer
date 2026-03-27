"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Reveal from "@/components/ui/Reveal";

type Metrics = {
  statements24h: number;
  connections: number;
  workflowsEnabled: number;
  statementsPerMinute: { t: string; count: number }[];
};

export default function ClientDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const series = metrics?.statementsPerMinute ?? [];
    return series.map((p) => ({
      t: new Date(p.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      count: p.count,
    }));
  }, [metrics]);

  useEffect(() => {
    const es = new EventSource("/api/metrics/stream");
    es.addEventListener("metrics", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as Metrics;
        if (typeof data?.statements24h === "number") setMetrics(data);
      } catch {
        // ignore
      }
    });
    es.addEventListener("error", () => setError("Metrics stream disconnected"));
    return () => es.close();
  }, []);

  return (
    <div className="space-y-6">
      <Reveal className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm" delayMs={20}>
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Overview</h1>
        <p className="mt-1 text-sm text-zinc-300">Real-time tiles and a simple activity chart.</p>
      </Reveal>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Reveal delayMs={30}>
        <div className="panel p-4">
          <div className="text-sm font-medium text-slate-600">Statements (24h)</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics?.statements24h ?? "—"}</div>
        </div>
        </Reveal>
        <Reveal delayMs={80}>
        <div className="panel p-4">
          <div className="text-sm font-medium text-slate-600">Connections</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics?.connections ?? "—"}</div>
        </div>
        </Reveal>
        <Reveal delayMs={130}>
        <div className="panel p-4">
          <div className="text-sm font-medium text-slate-600">Enabled automations</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{metrics?.workflowsEnabled ?? "—"}</div>
        </div>
        </Reveal>
      </div>

      <Reveal delayMs={150}>
      <div className="panel p-4">
        <div className="text-sm font-semibold text-slate-800">Statements per minute (last hour)</div>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
              <XAxis
                dataKey="t"
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
                interval={9}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#475569" }}
                stroke="#cbd5e1"
                width={36}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                }}
              />
              <Line type="monotone" dataKey="count" stroke="#ea580c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      </Reveal>
    </div>
  );
}


"use client";

import { useEffect, useMemo, useState } from "react";

type CheckState = { ok: boolean; detail?: string };
type HealthPayload = {
  ok: boolean;
  checks?: Record<string, CheckState>;
  timestamp?: string;
};

function Pill({
  label,
  state,
}: {
  label: string;
  state: "good" | "bad" | "unknown";
}) {
  const cls =
    state === "good"
      ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
      : state === "bad"
        ? "bg-red-500/15 text-red-300 ring-red-500/30"
        : "bg-zinc-700/40 text-zinc-300 ring-zinc-600/40";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ring-1 ${cls}`}>
      {label}
    </span>
  );
}

export default function HealthStatusBanner() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("cl.healthBannerCollapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      // ignore localStorage issues
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("cl.healthBannerCollapsed", collapsed ? "1" : "0");
    } catch {
      // ignore localStorage issues
    }
  }, [collapsed]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let nextDelayMs = 15000;

    function scheduleNext() {
      if (!alive) return;
      timer = setTimeout(() => {
        void load();
      }, nextDelayMs);
    }

    async function load() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as HealthPayload | null;
        if (!alive) return;
        if (!res.ok && !json) throw new Error(`Health check failed (${res.status})`);
        setPayload(json ?? { ok: false });
        setError(null);
        const unhealthy = !res.ok || !json?.ok;
        nextDelayMs = unhealthy ? Math.min(nextDelayMs * 2, 60000) : 15000;
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Health unavailable");
        nextDelayMs = Math.min(nextDelayMs * 2, 60000);
      } finally {
        scheduleNext();
      }
    }

    void load();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const db = useMemo(() => {
    if (!payload?.checks?.db) return "unknown" as const;
    return payload.checks.db.ok ? ("good" as const) : ("bad" as const);
  }, [payload]);

  const redis = useMemo(() => {
    if (!payload?.checks?.redis) return "unknown" as const;
    return payload.checks.redis.ok ? ("good" as const) : ("bad" as const);
  }, [payload]);

  const overall = payload?.ok ? "good" : payload ? "bad" : "unknown";

  return (
    <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-200">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-zinc-100">System health</span>
        <Pill label={`Overall: ${overall}`} state={overall} />
        {!collapsed ? <Pill label={`DB: ${db}`} state={db} /> : null}
        {!collapsed ? <Pill label={`Redis: ${redis}`} state={redis} /> : null}
        <button
          type="button"
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-800"
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
        {payload?.timestamp ? (
          <span className="ml-auto text-zinc-400">
            {new Date(payload.timestamp).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      {!collapsed && error ? <div className="mt-1 text-red-300">Unable to refresh health: {error}</div> : null}
    </div>
  );
}


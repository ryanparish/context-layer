"use client";

import { useCallback, useState } from "react";

import Reveal from "@/components/ui/Reveal";

type ExtraRow = { id: string; path: string; file: File | null };

function newRow(): ExtraRow {
  return { id: crypto.randomUUID(), path: "", file: null };
}

export default function PostPublishSurgeryPage() {
  const [scormZip, setScormZip] = useState<File | null>(null);
  const [extrasZip, setExtrasZip] = useState<File | null>(null);
  const [rows, setRows] = useState<ExtraRow[]>([newRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [reportLines, setReportLines] = useState<string[] | null>(null);

  const addRow = useCallback(() => {
    setRows((r) => [...r, newRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((r) => (r.length <= 1 ? r : r.filter((x) => x.id !== id)));
  }, []);

  const updateRow = useCallback((id: string, patch: Partial<ExtraRow>) => {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSummary(null);
    setReportLines(null);
    if (!scormZip) {
      setError("Choose a SCORM package .zip file.");
      return;
    }

    const fd = new FormData();
    fd.append("scorm", scormZip);
    if (extrasZip) fd.append("extrasZip", extrasZip);
    for (const row of rows) {
      if (!row.path.trim() || !row.file) continue;
      fd.append("extraPath", row.path.trim());
      fd.append("extraFile", row.file);
    }

    setBusy(true);
    try {
      const res = await fetch("/api/storyline/post-publish-surgery/process", {
        method: "POST",
        body: fd,
      });
      const summaryHdr = res.headers.get("X-Surgery-Summary");
      const reportHdr = res.headers.get("X-Surgery-Report");

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
      const fallback = "scorm-post-publish-surgery.zip";
      const name = m?.[1]?.trim() || fallback;

      setSummary(summaryHdr ?? "Download started.");
      if (reportHdr) {
        try {
          setReportLines(decodeURIComponent(reportHdr).split("\n"));
        } catch {
          setReportLines(null);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-3 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight !text-orange-400">Post-Publish Surgery</h1>
        <p className="mt-1 text-sm text-zinc-300">
          Upload a published Storyline SCORM package (.zip). Add extra files (paths inside the package), merge an
          optional second zip of assets, then download a new zip with{" "}
          <code className="text-orange-200/90">imsmanifest.xml</code> and{" "}
          <code className="text-orange-200/90">story.html</code> updated for those files. The server runs structural
          checks only; confirm playback in your LMS or SCORM Cloud.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {summary ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {summary}
        </div>
      ) : null}

      <Reveal delayMs={40}>
        <form onSubmit={onSubmit} className="panel space-y-5 p-5">
          <div>
            <label className="text-sm font-semibold text-slate-900">SCORM package (.zip)</label>
            <p className="mt-1 text-sm text-slate-600">
              Browsers cannot upload a loose folder; zip the published output (same layout as LMS expects). Maximum
              size on this server is limited by your host (packages up to ~100 MB uncompressed are typical here).
            </p>
            <input
              className="field mt-2"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setScormZip(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-900">Optional extras archive (.zip)</label>
            <p className="mt-1 text-sm text-slate-600">
              All files in this zip are merged using their internal paths (e.g.{" "}
              <code className="text-xs">story_content/custom.js</code>). Conflicting paths are overwritten by manual rows
              below.
            </p>
            <input
              className="field mt-2"
              type="file"
              accept=".zip,application/zip"
              onChange={(e) => setExtrasZip(e.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-slate-900">Extra files (path + file)</label>
              <button type="button" className="btn-secondary" onClick={addRow}>
                Add row
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Package-relative path using forward slashes. <code className="text-xs">.js</code> and{" "}
              <code className="text-xs">.css</code> files also get <code className="text-xs">&lt;script&gt;</code> /{" "}
              <code className="text-xs">&lt;link&gt;</code> tags in <code className="text-xs">story.html</code>. Other
              types are added to the package and manifest only.
            </p>
            <div className="mt-3 space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <label className="text-xs text-slate-700">Path inside package</label>
                    <input
                      className="field mt-1"
                      placeholder="e.g. story_content/my-bridge.js"
                      value={row.path}
                      onChange={(e) => updateRow(row.id, { path: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700">File</label>
                    <input
                      className="field mt-1"
                      type="file"
                      onChange={(e) => updateRow(row.id, { file: e.target.files?.[0] ?? null })}
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn-secondary w-full md:w-auto" onClick={() => removeRow(row.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" type="submit" disabled={busy || !scormZip}>
              {busy ? "Processing…" : "Process & download zip"}
            </button>
          </div>

          {reportLines?.length ? (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-900">Validation report</div>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-slate-700">
                {reportLines.join("\n")}
              </pre>
              <p className="mt-2 text-xs text-slate-600">
                A copy is also included as <code className="text-xs">POST_PUBLISH_SURGERY_REPORT.txt</code> in the
                downloaded package.
              </p>
            </div>
          ) : null}
        </form>
      </Reveal>
    </div>
  );
}

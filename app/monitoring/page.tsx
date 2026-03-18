"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Monitor {
  id: string;
  createdAt: string;
  name: string;
  competitorName: string;
  keywords: string; // JSON array string
  schedule: string;
  active: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  lastAnalysisId: string | null;
  runCount: number;
}

const SCHEDULE_OPTIONS = ["daily", "weekly", "monthly"] as const;

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function isDue(nextRunAt: string) {
  return new Date(nextRunAt) <= new Date();
}

export default function MonitoringPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<Record<string, { success?: boolean; analysisId?: string; error?: string }>>({});

  // Create form state
  const [name, setName] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/monitoring")
      .then((r) => r.json())
      .then((d: { monitors?: Monitor[] }) => { if (d.monitors) setMonitors(d.monitors); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!name.trim() || !competitorName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          competitorName: competitorName.trim(),
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          schedule,
        }),
      });
      const data = (await res.json()) as { monitor?: Monitor; error?: string };
      if (data.monitor) {
        setMonitors((prev) => [data.monitor!, ...prev]);
        setShowCreate(false);
        setName(""); setCompetitorName(""); setKeywords(""); setSchedule("weekly");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRun = async (id: string) => {
    setRunning(id);
    setRunResult((prev) => ({ ...prev, [id]: {} }));
    try {
      const res = await fetch(`/api/monitoring/run/${id}`, { method: "POST" });
      const data = (await res.json()) as { success?: boolean; analysisId?: string; error?: string };
      setRunResult((prev) => ({ ...prev, [id]: data }));
      if (data.success) load(); // refresh list to show updated lastRunAt
    } finally {
      setRunning(null);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/monitoring/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setMonitors((prev) => prev.map((m) => m.id === id ? { ...m, active: !active } : m));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this monitor?")) return;
    await fetch(`/api/monitoring/${id}`, { method: "DELETE" });
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Competitor Monitoring</h1>
              <p className="text-xs text-gray-400">Scheduled Perplexity scans — auto-analysed on each run</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New monitor
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        {/* Create form */}
        {showCreate && (
          <div className="bg-white border border-brand-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">New Competitor Monitor</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Monitor name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Monzo weekly review scan"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Competitor name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="e.g. Monzo"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Extra keywords <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g. customer service, app reviews, Trustpilot"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Schedule</label>
                <div className="flex gap-2">
                  {SCHEDULE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSchedule(s)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all capitalize ${
                        schedule === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim() || !competitorName.trim()}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {creating ? "Creating…" : "Create monitor"}
              </button>
              <button onClick={() => setShowCreate(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          </div>
        )}

        {/* Monitor list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading monitors…</div>
        ) : monitors.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-sm text-gray-500 font-medium mb-1">No monitors yet</p>
            <p className="text-xs text-gray-400">Create a monitor to start tracking a competitor automatically</p>
          </div>
        ) : (
          <div className="space-y-3">
            {monitors.map((m) => {
              const due = isDue(m.nextRunAt);
              const result = runResult[m.id];
              const kws: string[] = JSON.parse(m.keywords ?? "[]");
              return (
                <div key={m.id} className={`bg-white border rounded-2xl shadow-sm p-5 ${!m.active ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{m.name}</h3>
                        {due && m.active && (
                          <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">Due</span>
                        )}
                        {!m.active && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full shrink-0">Paused</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-xs text-gray-500">Tracking: <strong>{m.competitorName}</strong></span>
                        <span className="text-xs text-gray-400 capitalize">{m.schedule}</span>
                        {kws.length > 0 && <span className="text-xs text-gray-400">+{kws.join(", ")}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
                        <span className="text-xs text-gray-400">Last run: {formatDate(m.lastRunAt)}</span>
                        <span className="text-xs text-gray-400">Next: {formatDate(m.nextRunAt)}</span>
                        <span className="text-xs text-gray-400">Runs: {m.runCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRun(m.id)}
                        disabled={running === m.id || !m.active}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {running === m.id ? (
                          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        Run now
                      </button>
                      <button
                        onClick={() => handleToggle(m.id, m.active)}
                        className="text-xs font-medium px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        {m.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete monitor"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Run result */}
                  {result && (
                    <div className={`mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs ${result.error ? "text-rose-600" : "text-emerald-600"}`}>
                      {result.error ? (
                        <><svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>{result.error}</>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          Analysis complete.
                          {result.analysisId && (
                            <Link href={`/?analysisId=${result.analysisId}`} className="underline font-medium">View analysis</Link>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>How it works:</strong> Each monitor runs a Perplexity Sonar search for recent reviews and feedback about the competitor, then automatically runs the full COM-B behavioural analysis. Results appear in your analysis history. Requires <code className="bg-white px-1 rounded text-gray-700">PERPLEXITY_API_KEY</code> in your environment.
          </p>
        </div>
      </main>
    </div>
  );
}

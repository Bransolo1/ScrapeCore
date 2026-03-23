"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";

interface AuditEntry {
  id: string;
  createdAt: string;
  event: string;
  actor: string;
  entityId: string | null;
  entityType: string | null;
  metadata: string;
  analysisId: string | null;
  analysis: { id: string; title: string } | null;
}

const EVENT_COLORS: Record<string, string> = {
  "analysis.created":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "analysis.viewed":   "bg-blue-50 text-blue-700 border-blue-200",
  "analysis.exported": "bg-brand-50 text-brand-700 border-brand-200",
  "analysis.deleted":  "bg-rose-50 text-rose-700 border-rose-200",
  "review.updated":    "bg-amber-50 text-amber-700 border-amber-200",
  "source.fetched":    "bg-sky-50 text-sky-700 border-sky-200",
  "pii.detected":      "bg-orange-50 text-orange-700 border-orange-200",
  "pii.redacted":      "bg-teal-50 text-teal-700 border-teal-200",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  "analysis.created": (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  "analysis.viewed": (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  "analysis.deleted": (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  "review.updated": (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  "pii.detected": (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function MetadataBadges({ raw }: { raw: string }) {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (!entries.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {entries.slice(0, 5).map(([k, v]) => (
          <span key={k} className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 border border-gray-200 font-mono">
            {k}: {String(v)}
          </span>
        ))}
      </div>
    );
  } catch {
    return null;
  }
}

const ALL_EVENTS = [
  "analysis.created", "analysis.viewed", "analysis.exported", "analysis.deleted",
  "review.updated", "source.fetched", "pii.detected", "pii.redacted",
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState("");

  const fetchLogs = useCallback(async (p: number, ev: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (ev) params.set("event", ev);
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs(page, eventFilter);
  }, [fetchLogs, page, eventFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
            <p className="text-sm text-gray-500 mt-1">
              Immutable record of all analysis, review, and data events.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200">
              {total.toLocaleString()} events
            </span>
            {loading && (
              <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </div>
        </div>

        {/* Event filter */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => { setEventFilter(""); setPage(1); }}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              eventFilter === "" ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          {ALL_EVENTS.map((ev) => (
            <button
              key={ev}
              onClick={() => { setEventFilter(ev); setPage(1); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                eventFilter === ev
                  ? "bg-gray-900 text-white border-gray-900"
                  : `${EVENT_COLORS[ev] ?? "bg-white text-gray-500 border-gray-200"} hover:opacity-80`
              }`}
            >
              {ev}
            </button>
          ))}
        </div>

        {/* Log table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {logs.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-400">No audit events yet.</p>
              <p className="text-xs text-gray-300">Events are recorded automatically as you use ScrapeCore.</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="divide-y divide-gray-50">
              {logs.map((log) => {
                const colorClass = EVENT_COLORS[log.event] ?? "bg-gray-100 text-gray-500 border-gray-200";
                const icon = EVENT_ICONS[log.event];
                return (
                  <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    {/* Event badge */}
                    <div className="shrink-0 pt-0.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium whitespace-nowrap ${colorClass}`}>
                        {icon}
                        {log.event}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{log.actor}</span>
                        {log.analysis && (
                          <span className="text-xs text-gray-400 truncate max-w-[200px]">
                            → {log.analysis.title}
                          </span>
                        )}
                      </div>
                      <MetadataBadges raw={log.metadata} />
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-xs text-gray-400 whitespace-nowrap pt-0.5">
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 text-gray-500 hover:shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs text-gray-500 font-medium">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="p-2 rounded-lg hover:bg-white border border-gray-200 disabled:opacity-30 text-gray-500 hover:shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">ScrapeCore · Behavioural Market Intelligence</p>
          <p className="text-xs text-gray-400">AI-assisted — expert review required</p>
        </div>
      </footer>
    </div>
  );
}

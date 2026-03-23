"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { BehaviourAnalysis, DataType } from "@/lib/types";

type ReviewStatus = "pending" | "approved" | "disputed" | "archived";

interface AnalysisSummary {
  id: string;
  createdAt: string;
  title: string;
  dataType: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number | null;
  project?: string | null;
  tags?: string;
  reviewStatus?: ReviewStatus;
  piiDetected?: boolean;
}

interface AnalysisHistoryProps {
  onLoad: (analysis: BehaviourAnalysis, dataType: DataType, savedId?: string, reviewStatus?: string, reviewNotes?: string | null) => void;
  refreshKey: number;
}

const REVIEW_BADGE: Record<ReviewStatus, { label: string; classes: string }> = {
  pending:  { label: "Pending",  classes: "bg-gray-100 text-gray-500 border-gray-200" },
  approved: { label: "Approved", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  disputed: { label: "Disputed", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  archived: { label: "Archived", classes: "bg-gray-100 text-gray-400 border-gray-200" },
};

const DATA_TYPE_LABELS: Record<string, string> = {
  survey: "Survey",
  interviews: "Interviews",
  reviews: "Reviews",
  social: "Social",
  free_text: "Free text",
};

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function parseTags(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export default function AnalysisHistory({
  onLoad,
  refreshKey,
}: AnalysisHistoryProps) {
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<ReviewStatus | "">("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchHistory = useCallback(async (p: number, q: string, rf: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("search", q);
      if (rf) params.set("reviewStatus", rf);
      const res = await fetch(`/api/analyses?${params}`);
      const data = await res.json();
      setAnalyses(data.analyses ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(page, debouncedSearch, reviewFilter);
  }, [fetchHistory, page, debouncedSearch, reviewFilter, refreshKey]);

  const getActor = () => {
    if (typeof window === "undefined") return "system";
    return localStorage.getItem("scrapecore-user") ?? "analyst";
  };

  const handleLoad = async (id: string) => {
    setLoadingId(id);
    try {
      const actor = getActor();
      const res = await fetch(`/api/analyses/${id}?actor=${encodeURIComponent(actor)}`);
      const data = await res.json();
      if (data.analysisJson) {
        onLoad(data.analysisJson as BehaviourAnalysis, data.dataType as DataType, data.id, data.reviewStatus, data.reviewNotes);
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const actor = getActor();
      await fetch(`/api/analyses/${id}?actor=${encodeURIComponent(actor)}`, { method: "DELETE" });
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      setTotal((t) => t - 1);
    } finally {
      setDeletingId(null);
    }
  };

  const hasContent = analyses.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-5 pt-3 pb-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search analyses…"
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-700 placeholder-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Review status filter */}
      <div className="px-5 pb-2">
        <div className="flex gap-1 flex-wrap">
          {(["", "pending", "approved", "disputed", "archived"] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => { setReviewFilter(s); setPage(1); }}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                reviewFilter === s
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {s ? (REVIEW_BADGE[s as ReviewStatus]?.label ?? s) : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2 border-b border-gray-100">
        <p className="text-xs text-gray-400">
          {debouncedSearch
            ? `${total} result${total !== 1 ? "s" : ""} for "${debouncedSearch}"`
            : `${total} saved ${total === 1 ? "analysis" : "analyses"}`}
        </p>
        {loading && (
          <svg className="w-4 h-4 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Empty states */}
      {loading && !hasContent && (
        <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
          Loading history…
        </div>
      )}

      {!loading && !hasContent && !debouncedSearch && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
          <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">No analyses yet</p>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xs">
              Paste qualitative data in the input panel and run your first analysis. Results are saved here automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              COM-B mapping
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Interventions
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Evidence grounding
            </span>
          </div>
        </div>
      )}

      {!loading && !hasContent && debouncedSearch && (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <p className="text-sm text-gray-400">No results for &ldquo;{debouncedSearch}&rdquo;</p>
          <button
            onClick={() => setSearch("")}
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Clear search
          </button>
        </div>
      )}

      {/* List */}
      {hasContent && (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 scrollbar-thin">
          {analyses.map((a) => {
            const tags = parseTags(a.tags ?? "[]");
            return (
              <div
                key={a.id}
                className="group flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
              >
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate leading-snug">{a.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-600">
                      {DATA_TYPE_LABELS[a.dataType] ?? a.dataType}
                    </span>
                    {a.reviewStatus && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-medium ${REVIEW_BADGE[a.reviewStatus]?.classes ?? ""}`}>
                        {a.reviewStatus === "pending" ? (
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            {REVIEW_BADGE[a.reviewStatus]?.label}
                          </span>
                        ) : (
                          REVIEW_BADGE[a.reviewStatus]?.label
                        )}
                      </span>
                    )}
                    {a.piiDetected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium bg-amber-50 text-amber-700 border-amber-200" title="PII detected in original input">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        PII
                      </span>
                    )}
                    {a.project && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {a.project}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{formatRelativeTime(a.createdAt)}</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {(a.inputTokens + a.outputTokens).toLocaleString()} tokens
                    </span>
                    {a.durationMs && (
                      <>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs text-gray-400">{(a.durationMs / 1000).toFixed(1)}s</span>
                      </>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <a
                    href={`/analysis/${a.id}`}
                    title="Open full page"
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                  <button
                    onClick={() => handleLoad(a.id)}
                    disabled={loadingId === a.id}
                    title="Load this analysis"
                    className="p-1.5 rounded-md hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors disabled:opacity-50"
                  >
                    {loadingId === a.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    title="Delete"
                    className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    {deletingId === a.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 px-5 py-3 border-t border-gray-100">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-xs text-gray-400">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 text-gray-500"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

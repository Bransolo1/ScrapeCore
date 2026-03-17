"use client";

import { useState, useEffect } from "react";

type ReviewStatus = "pending" | "approved" | "disputed" | "archived";

interface ReviewPanelProps {
  analysisId: string;
  initialStatus?: ReviewStatus;
  initialNotes?: string | null;
}

const STATUS_CONFIG: Record<ReviewStatus, {
  label: string;
  icon: React.ReactNode;
  pill: string;
  border: string;
  bg: string;
}> = {
  pending: {
    label: "Pending review",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pill: "bg-gray-100 text-gray-600 border-gray-200",
    border: "border-gray-200",
    bg: "bg-gray-50",
  },
  approved: {
    label: "Approved",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
  },
  disputed: {
    label: "Disputed",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    pill: "bg-amber-50 text-amber-700 border-amber-200",
    border: "border-amber-200",
    bg: "bg-amber-50",
  },
  archived: {
    label: "Archived",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    pill: "bg-gray-100 text-gray-500 border-gray-200",
    border: "border-gray-200",
    bg: "bg-gray-50",
  },
};

function getActor(): string {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

export default function ReviewPanel({ analysisId, initialStatus = "pending", initialNotes }: ReviewPanelProps) {
  const [status, setStatus] = useState<ReviewStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Show panel open if disputed or approved (meaningful states)
  useEffect(() => {
    if (initialStatus === "approved" || initialStatus === "disputed") {
      setIsOpen(true);
    }
  }, [initialStatus]);

  const config = STATUS_CONFIG[status];

  const save = async (nextStatus: ReviewStatus, nextNotes: string) => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus: nextStatus,
          reviewNotes: nextNotes || null,
          actor: getActor(),
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (next: ReviewStatus) => {
    setStatus(next);
    save(next, notes);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${config.border}`}>
      {/* Header / summary row */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity ${config.bg}`}
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">Analyst Review</span>
          <span className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-2 py-0.5 font-medium ${config.pill}`}>
            {config.icon}
            {config.label}
          </span>
          {saved && (
            <span className="text-xs text-emerald-600 font-medium animate-fade-in">Saved</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded body */}
      {isOpen && (
        <div className="px-4 py-4 bg-white border-t border-gray-100 space-y-4 animate-fade-in">
          {/* Status buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Set status</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_CONFIG) as ReviewStatus[]).map((s) => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={saving}
                    className={`inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1 font-medium transition-all disabled:opacity-50 ${
                      status === s
                        ? `${c.pill} ring-2 ring-offset-1 ring-current`
                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {c.icon}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Review notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this analysis — what was confirmed, questioned, or requires follow-up…"
              rows={3}
              className="w-full text-xs text-gray-700 placeholder-gray-300 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Reviewer: <span className="font-medium text-gray-600">{getActor()}</span>
            </p>
            <button
              onClick={() => save(status, notes)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save notes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

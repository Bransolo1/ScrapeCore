"use client";

import { useState } from "react";

export type CorrectionStatus = "confirmed" | "disputed" | "removed";

export interface Correction {
  status: CorrectionStatus;
  note?: string;
}

interface CorrectionControlsProps {
  correction?: Correction;
  onSave: (status: CorrectionStatus, note?: string) => Promise<void>;
  compact?: boolean;
}

function getActor(): string {
  if (typeof window === "undefined") return "analyst";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

export default function CorrectionControls({ correction, onSave, compact = false }: CorrectionControlsProps) {
  const [saving, setSaving] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [note, setNote] = useState(correction?.note ?? "");

  const current = correction?.status ?? "confirmed";

  const handle = async (status: CorrectionStatus, noteText?: string) => {
    setSaving(true);
    try {
      await onSave(status, noteText);
    } finally {
      setSaving(false);
    }
  };

  const handleDispute = async () => {
    await handle("disputed", note);
    setDisputeOpen(false);
  };

  if (current === "removed") {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs text-gray-400 italic">Marked as removed</span>
        <button
          onClick={() => handle("confirmed")}
          disabled={saving}
          className="text-xs text-brand-600 hover:text-brand-800 font-medium underline-offset-2 hover:underline disabled:opacity-50"
        >
          Restore
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dispute note popover */}
      {disputeOpen && (
        <div className="absolute bottom-8 left-0 z-20 w-64 bg-white border border-amber-200 rounded-xl shadow-xl p-3 animate-scale-in">
          <p className="text-xs font-semibold text-gray-700 mb-1.5">Add dispute note</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why is this finding disputed? (optional)"
            rows={2}
            autoFocus
            className="w-full text-xs text-gray-700 placeholder-gray-300 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleDispute}
              disabled={saving}
              className="flex-1 text-xs font-semibold bg-amber-500 text-white rounded-lg py-1.5 hover:bg-amber-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Dispute"}
            </button>
            <button
              onClick={() => setDisputeOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700 px-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-1 ${compact ? "" : "mt-2 pt-2 border-t border-gray-100"}`}>
        {/* Confirmed state */}
        {current === "confirmed" ? (
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-medium">
            <svg className="w-3 h-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {!compact && "Confirmed"}
          </span>
        ) : (
          <button
            onClick={() => handle("confirmed")}
            disabled={saving}
            title="Mark as confirmed"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-emerald-600 font-medium px-1.5 py-0.5 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {!compact && "Confirm"}
          </button>
        )}

        {/* Dispute button */}
        {current === "disputed" ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold px-1.5 py-0.5 bg-amber-50 border border-amber-200 rounded-md">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Disputed
          </span>
        ) : (
          <button
            onClick={() => setDisputeOpen((o) => !o)}
            disabled={saving}
            title="Dispute this finding"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-amber-600 font-medium px-1.5 py-0.5 rounded-md hover:bg-amber-50 transition-colors disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {!compact && "Dispute"}
          </button>
        )}

        {/* Remove button */}
        <button
          onClick={() => handle("removed")}
          disabled={saving}
          title="Remove this finding"
          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-rose-600 font-medium px-1.5 py-0.5 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-50 ml-auto"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {!compact && "Remove"}
        </button>
      </div>

      {/* Dispute note display */}
      {current === "disputed" && correction?.note && (
        <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 leading-relaxed">
          <span className="font-semibold">Note: </span>{correction.note}
        </p>
      )}
    </div>
  );
}

// Attach actor accessor for use in parent components
CorrectionControls.getActor = getActor;

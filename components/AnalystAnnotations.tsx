"use client";

import { useState, useEffect } from "react";

interface Props {
  sectionKey: string;  // e.g. "barriers" | "motivators" | unique per analysis
  analysisId?: string | null;
}

const STORAGE_KEY = (analysisId: string, section: string) =>
  `scrapecore-annotation:${analysisId}:${section}`;

export default function AnalystAnnotations({ sectionKey, analysisId }: Props) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const storageKey = analysisId ? STORAGE_KEY(analysisId, sectionKey) : null;

  useEffect(() => {
    if (!storageKey) return;
    const existing = localStorage.getItem(storageKey);
    if (existing) setNote(existing);
  }, [storageKey]);

  const save = () => {
    if (!storageKey) return;
    if (note.trim()) {
      localStorage.setItem(storageKey, note);
    } else {
      localStorage.removeItem(storageKey);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!analysisId) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        {note.trim() ? "Edit note" : "Add note"}
        {note.trim() && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
      </button>

      {open && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Analyst note for this section…"
            rows={2}
            className="w-full text-xs text-gray-800 placeholder-gray-400 bg-white border border-amber-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400 leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={save}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded font-medium transition-colors"
            >
              {saved ? "Saved" : "Save note"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

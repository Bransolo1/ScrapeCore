"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { DataType } from "@/lib/types";

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: "survey", label: "Survey responses" },
  { value: "interviews", label: "Interview data" },
  { value: "reviews", label: "Reviews" },
  { value: "social", label: "Social listening" },
  { value: "free_text", label: "Free text" },
  { value: "competitor", label: "Competitor intel" },
];

const SOURCE_LABELS: Record<string, string> = {
  url: "Web page",
  reddit: "Reddit",
  hackernews: "Hacker News",
  gnews: "News",
  stocktwits: "StockTwits",
  trustpilot: "Trustpilot",
  appstore: "App Store",
  rss: "RSS",
  googleplay: "Google Play",
  websearch: "Web search",
};

export interface PreviewSource {
  id: string;
  title: string;
  text: string;
  source: string;
  wordCount: number;
  selected: boolean;
}

interface TextPreviewModalProps {
  text: string;
  dataType: DataType;
  sources?: PreviewSource[];
  onConfirm: (text: string, dataType: DataType) => void;
  onCancel: () => void;
}

export default function TextPreviewModal({ text, dataType, sources, onConfirm, onCancel }: TextPreviewModalProps) {
  const [selectedType, setSelectedType] = useState<DataType>(dataType);
  const [viewMode, setViewMode] = useState<"sources" | "text">(sources?.length ? "sources" : "text");
  const [sourceToggles, setSourceToggles] = useState<Record<string, boolean>>(() => {
    if (!sources) return {};
    const map: Record<string, boolean> = {};
    for (const s of sources) map[s.id] = s.selected;
    return map;
  });
  const [editedText, setEditedText] = useState(text);

  // Escape key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onCancel();
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleSource = (id: string) => {
    setSourceToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = (on: boolean) => {
    setSourceToggles((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) next[k] = on;
      return next;
    });
  };

  // Build final text from active sources or from edited text
  const finalText = useMemo(() => {
    if (!sources?.length || viewMode === "text") return editedText;
    return sources
      .filter((s) => sourceToggles[s.id])
      .map((s) => {
        const label = SOURCE_LABELS[s.source] ?? s.source;
        return `--- ${label}: ${s.title} ---\n${s.text}`;
      })
      .join("\n\n");
  }, [sources, sourceToggles, viewMode, editedText]);

  // Sync edited text when switching from sources→text view
  const handleViewSwitch = (mode: "sources" | "text") => {
    if (mode === "text" && viewMode === "sources") {
      setEditedText(finalText);
    }
    setViewMode(mode);
  };

  const wordCount = finalText.trim() ? finalText.trim().split(/\s+/).length : 0;
  const lineCount = finalText.split(/\n+/).filter((l) => l.trim()).length;
  const activeSourceCount = sources ? Object.values(sourceToggles).filter(Boolean).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="preview-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="preview-modal-title" className="text-base font-semibold text-gray-900">Review collected data</h2>
              <p className="text-xs text-gray-500 mt-1">
                {sources?.length
                  ? "Toggle sources on/off, choose data type, then run analysis."
                  : "Review and edit the assembled text before running analysis."}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cancel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* View toggle (only when sources available) */}
          {sources?.length ? (
            <div className="flex items-center gap-1 mt-3 bg-gray-100 rounded-lg p-0.5 w-fit">
              <button
                onClick={() => handleViewSwitch("sources")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "sources" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Sources ({activeSourceCount}/{sources.length})
              </button>
              <button
                onClick={() => handleViewSwitch("text")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "text" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Full text
              </button>
            </div>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Data type selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DataType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {DATA_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Source toggles view */}
          {viewMode === "sources" && sources?.length ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Collected sources</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleAll(true)} className="text-xs text-brand-600 hover:text-brand-700">Select all</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => toggleAll(false)} className="text-xs text-gray-500 hover:text-gray-700">Deselect all</button>
                </div>
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {sources.map((s) => {
                  const isOn = sourceToggles[s.id] ?? false;
                  return (
                    <label
                      key={s.id}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isOn ? "border-brand-200 bg-brand-50/50" : "border-gray-100 bg-gray-50 opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isOn}
                        onChange={() => toggleSource(s.id)}
                        className="mt-0.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isOn ? "text-gray-800" : "text-gray-400"}`}>
                          {s.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{SOURCE_LABELS[s.source] ?? s.source}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{s.wordCount.toLocaleString()} words</span>
                        </div>
                        {isOn && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {s.text.slice(0, 150)}{s.text.length > 150 ? "..." : ""}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Editable text view */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-600">Collected text</label>
                <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words · {lineCount} lines</span>
              </div>
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={14}
                className="w-full px-3 py-3 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none font-mono leading-relaxed"
              />
              {wordCount > 0 && wordCount < 50 && (
                <p className="text-xs text-amber-500 mt-1">{50 - wordCount} more words needed for reliable results</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            {viewMode === "sources" && (
              <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words from {activeSourceCount} source{activeSourceCount !== 1 ? "s" : ""}</span>
            )}
          </div>
          <button
            onClick={() => onConfirm(finalText, selectedType)}
            disabled={!finalText.trim() || wordCount < 10}
            className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run analysis
          </button>
        </div>
      </div>
    </div>
  );
}

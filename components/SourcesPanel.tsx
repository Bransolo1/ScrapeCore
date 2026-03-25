"use client";

import type { Source } from "@/lib/scraper";

interface SourcesPanelProps {
  sources: Source[];
  onToggle: (id: string) => void;
  onClear: () => void;
  onAnalyse: () => void;
  isLoading: boolean;
}

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  reddit: (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249z"/>
    </svg>
  ),
  hackernews: <span className="font-bold text-xs">Y</span>,
  url: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
};

const SOURCE_COLORS: Record<string, string> = {
  reddit: "text-orange-600 bg-orange-50",
  hackernews: "text-amber-600 bg-amber-50",
  url: "text-brand-600 bg-brand-50",
};

export default function SourcesPanel({
  sources,
  onToggle,
  onClear,
  onAnalyse,
  isLoading,
}: SourcesPanelProps) {
  const selected = sources.filter((s) => s.selected);
  const totalWords = selected.reduce((sum, s) => sum + s.wordCount, 0);

  return (
    <div className="border-t border-gray-100 pt-4 mt-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">
            {selected.length}/{sources.length} sources selected
          </p>
          <p className="text-xs text-gray-400">{totalWords.toLocaleString()} words</p>
        </div>
        <button onClick={onClear} className="text-xs text-gray-400 hover:text-gray-600">
          Clear all
        </button>
      </div>

      {/* Sources list */}
      <div className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-thin pr-1">
        {sources.map((s) => (
          <div
            key={s.id}
            onClick={() => onToggle(s.id)}
            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
              s.selected
                ? "border-gray-200 bg-white"
                : "border-dashed border-gray-200 bg-gray-50 opacity-50"
            }`}
          >
            {/* Checkbox */}
            <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${s.selected ? "border-brand-500 bg-brand-500" : "border-gray-300"}`}>
              {s.selected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-xs ${SOURCE_COLORS[s.source]}`}>
                  {SOURCE_ICONS[s.source]}
                </span>
                <p className="text-xs font-medium text-gray-800 truncate">{s.title}</p>
              </div>
              {s.meta && <p className="text-xs text-gray-400">{s.meta}</p>}
              <p className="text-xs text-gray-400 mt-0.5">{s.wordCount.toLocaleString()} words</p>
            </div>
          </div>
        ))}
      </div>

      {/* Analyse button */}
      <button
        onClick={onAnalyse}
        disabled={selected.length === 0 || isLoading}
        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          selected.length > 0 && !isLoading
            ? "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analysing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Analyse {selected.length} source{selected.length > 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}

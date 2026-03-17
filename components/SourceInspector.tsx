"use client";

import { useEffect, useRef } from "react";

interface Props {
  quote: string;
  inputText: string;
  onClose: () => void;
}

/** Split text into [before, match, after] for exact match, or return null. */
function splitExact(text: string, quote: string): [string, string, string] | null {
  const idx = text.toLowerCase().indexOf(quote.toLowerCase());
  if (idx === -1) return null;
  return [text.slice(0, idx), text.slice(idx, idx + quote.length), text.slice(idx + quote.length)];
}

/** Try a fuzzy match on the first 5 significant words of the quote. */
function splitFuzzy(text: string, quote: string): [string, string, string] | null {
  const words = quote
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 5);
  if (words.length < 2) return null;
  try {
    const re = new RegExp(words.join("\\s+[\\w,.'\"]*\\s*"), "i");
    const m = re.exec(text);
    if (!m) return null;
    return [text.slice(0, m.index), text.slice(m.index, m.index + m[0].length), text.slice(m.index + m[0].length)];
  } catch {
    return null;
  }
}

export default function SourceInspector({ quote, inputText, onClose }: Props) {
  const scrollRef = useRef<HTMLElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Scroll highlighted text into view
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [quote]);

  const parts = splitExact(inputText, quote) ?? splitFuzzy(inputText, quote);
  const found = !!parts;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-800">Source text inspection</span>
            {!found && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Paraphrased — no exact match
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quote being inspected */}
        <div className="px-5 py-3 bg-yellow-50 border-b border-yellow-100 shrink-0">
          <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Finding source text</p>
          <p className="text-sm text-yellow-900 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
        </div>

        {/* Input text with highlight */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Original input</p>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-mono">
            {parts ? (
              <>
                {parts[0]}
                <mark
                  ref={(el) => { scrollRef.current = el; }}
                  className="bg-yellow-200 text-yellow-900 rounded px-0.5 not-italic"
                >
                  {parts[1]}
                </mark>
                {parts[2]}
              </>
            ) : (
              <>
                <span className="text-gray-400 text-xs block mb-3 not-italic">
                  No match found in input — the quote may be a paraphrase or inference.
                </span>
                {inputText}
              </>
            )}
          </p>
        </div>

        <div className="px-5 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

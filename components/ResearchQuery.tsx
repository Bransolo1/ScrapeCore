"use client";

import { useState } from "react";
import type { Source } from "@/lib/scraper";

interface ResearchQueryProps {
  onSourcesReady: (sources: Source[]) => void;
}

const RECENCY_OPTIONS = [
  { value: "day", label: "Past 24 hours" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

export default function ResearchQuery({ onSourcesReady }: ResearchQueryProps) {
  const [query, setQuery] = useState("");
  const [recency, setRecency] = useState("month");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<string[]>([]);

  const handleResearch = async () => {
    const q = query.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setCitations([]);

    try {
      const res = await fetch("/api/sources/perplexity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, mode: "research", recency }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }

      if (data.citations?.length) setCitations(data.citations);

      const source: Source = {
        id: `research-${Date.now()}`,
        title: data.title ?? `Research — ${q}`,
        text: data.text,
        url: data.citations?.[0] ?? "",
        wordCount: data.wordCount ?? 0,
        source: "research",
        meta: `Perplexity Research · ${data.citations?.length ?? 0} citations`,
        selected: true,
      };

      onSourcesReady([source]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Research request failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── How it works ── */}
      <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-brand-800">Perplexity AI Web Research</p>
            <p className="text-xs text-brand-600 mt-1 leading-relaxed">
              Searches the live web, reads multiple sources, and synthesises a research report on any topic.
              Results feed into COM-B behavioural analysis. For extracting content from specific URLs, use{" "}
              <strong>Scrape URLs</strong> instead.
            </p>
          </div>
        </div>
      </div>

      {/* ── Query input ── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Research question</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. what motivates people to switch banks · barriers to EV adoption in the UK · why do parents choose organic baby food · Monzo customer sentiment 2025"
          className="w-full px-3 py-2.5 text-sm text-gray-800 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 resize-none disabled:opacity-50"
          rows={3}
          disabled={isLoading}
        />
        <p className="mt-1 text-xs text-gray-400">
          Works for any topic — consumer behaviour, market trends, company research, health motivations, policy impacts, and more.
        </p>
      </div>

      {/* ── Recency + submit ── */}
      <div className="flex items-end gap-3">
        <div className="w-40">
          <label className="block text-xs font-medium text-gray-500 mb-1">Time range</label>
          <select
            value={recency}
            onChange={(e) => setRecency(e.target.value)}
            className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 disabled:opacity-50"
            disabled={isLoading}
          >
            {RECENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleResearch}
          disabled={isLoading || !query.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 rounded-full animate-spin border-t-white" />
              Researching...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Research
            </>
          )}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
          {error.includes("API key") && (
            <p className="text-xs text-red-500 mt-1">
              Add your Perplexity API key in Settings to enable web research.
            </p>
          )}
        </div>
      )}

      {/* ── Citations ── */}
      {citations.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Sources referenced ({citations.length})</p>
          <div className="space-y-1">
            {citations.slice(0, 8).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-brand-600 hover:text-brand-800 truncate"
              >
                {(() => { try { return new URL(url).hostname + new URL(url).pathname.slice(0, 50); } catch { return url; } })()}
              </a>
            ))}
            {citations.length > 8 && (
              <p className="text-xs text-gray-400">+ {citations.length - 8} more</p>
            )}
          </div>
        </div>
      )}

      {/* ── Firecrawl vs Perplexity explainer ── */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs font-medium text-gray-500 mb-1.5">How does this differ from Scrape URLs?</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-500">Research</strong> (this tab) uses Perplexity AI to search across the web and synthesise findings — ideal when you have a question but no specific URLs.{" "}
          <strong className="text-gray-500">Scrape URLs</strong> uses Firecrawl to extract full content from pages you already have — ideal for reviews, articles, and JS-heavy sites.
        </p>
      </div>
    </div>
  );
}

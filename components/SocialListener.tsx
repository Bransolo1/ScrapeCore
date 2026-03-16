"use client";

import { useState } from "react";
import type { Source, RedditPost, HNItem } from "@/lib/scraper";

interface SocialListenerProps {
  onSourcesReady: (sources: Source[]) => void;
}

const TIMEFRAMES = [
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

export default function SocialListener({ onSourcesReady }: SocialListenerProps) {
  const [query, setQuery] = useState("");
  const [subreddit, setSubreddit] = useState("");
  const [timeframe, setTimeframe] = useState("year");
  const [sort, setSort] = useState("relevance");
  const [limit, setLimit] = useState(30);
  const [includeComments, setIncludeComments] = useState(true);
  const [useReddit, setUseReddit] = useState(true);
  const [useHN, setUseHN] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);

  const handleFetch = async () => {
    if (!query.trim()) return;
    setIsFetching(true);
    setError(null);
    setFetchedCount(null);

    const sources: string[] = [];
    if (useReddit) sources.push("reddit");
    if (useHN) sources.push("hackernews");
    if (!sources.length) { setError("Select at least one source"); setIsFetching(false); return; }

    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          subreddit: subreddit.trim() || undefined,
          timeframe,
          sort,
          limit,
          includeComments,
          sources,
        }),
      });

      const data = (await res.json()) as {
        items: (RedditPost | HNItem)[];
        errors?: string[];
        error?: string;
      };

      if (data.error) { setError(data.error); return; }
      if (data.errors?.length) setError(data.errors.join("; "));

      const items = data.items ?? [];
      setFetchedCount(items.length);

      const result: Source[] = items.map((item) => {
        if (item.source === "reddit") {
          const r = item as RedditPost;
          return {
            id: `reddit-${r.id}`,
            title: r.title,
            text: r.text,
            url: r.url,
            wordCount: r.text.split(/\s+/).length,
            source: "reddit" as const,
            meta: `r/${r.subreddit} · ${r.type} · ↑${r.score}`,
            selected: true,
          };
        } else {
          const h = item as HNItem;
          return {
            id: `hn-${h.id}`,
            title: h.title,
            text: h.text,
            url: h.url,
            wordCount: h.text.split(/\s+/).length,
            source: "hackernews" as const,
            meta: `HN · ${h.type} · ↑${h.score}`,
            selected: true,
          };
        }
      });

      onSourcesReady(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sources */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Sources</label>
        <div className="flex gap-2">
          <button
            onClick={() => setUseReddit(!useReddit)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              useReddit ? "border-orange-300 bg-orange-50 text-orange-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            Reddit
          </button>
          <button
            onClick={() => setUseHN(!useHN)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              useHN ? "border-amber-300 bg-amber-50 text-amber-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <span className="font-bold text-sm">Y</span>
            Hacker News
          </button>
        </div>
      </div>

      {/* Query */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Search query</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="e.g. diabetes prevention NHS experience"
          className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          disabled={isFetching}
        />
      </div>

      {/* Subreddit */}
      {useReddit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Subreddit <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">r/</span>
            <input
              type="text"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              placeholder="diabetes, mentalhealth, NHS, careerguidance…"
              className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none"
              disabled={isFetching}
            />
          </div>
        </div>
      )}

      {/* Filters row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Time range</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={isFetching}
          >
            {TIMEFRAMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            disabled={isFetching}
          >
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Volume + comments */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500">Posts</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 25)))}
            className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center"
            min={5}
            max={100}
            disabled={isFetching}
          />
        </div>
        {useReddit && (
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIncludeComments(!includeComments)}
              className={`relative w-9 h-5 rounded-full transition-colors ${includeComments ? "bg-brand-600" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeComments ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-xs text-gray-600">Include comments</span>
          </label>
        )}
      </div>

      {/* Fetch button */}
      <button
        onClick={handleFetch}
        disabled={!query.trim() || isFetching || (!useReddit && !useHN)}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          query.trim() && !isFetching && (useReddit || useHN)
            ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isFetching ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Collecting posts…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search &amp; collect
          </>
        )}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {fetchedCount !== null && !isFetching && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ {fetchedCount} items collected — scroll down to review and analyse
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { Source } from "@/lib/scraper";

interface UrlScraperProps {
  onSourcesReady: (sources: Source[]) => void;
}

interface FetchStatus {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
}

export default function UrlScraper({ onSourcesReady }: UrlScraperProps) {
  const [urlInput, setUrlInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [statuses, setStatuses] = useState<FetchStatus[]>([]);

  const parseUrls = (raw: string) =>
    raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => {
        try { new URL(u); return true; } catch { return false; }
      });

  const handleFetch = async () => {
    const urls = parseUrls(urlInput);
    if (!urls.length) return;

    setIsFetching(true);
    setStatuses(urls.map((url) => ({ url, status: "pending" })));

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const data = (await res.json()) as {
        results: Array<{
          url: string;
          title: string;
          text: string;
          wordCount: number;
          success: boolean;
          error?: string;
        }>;
      };

      setStatuses(
        data.results.map((r) => ({
          url: r.url,
          status: r.success ? "success" : "error",
          message: r.error,
        }))
      );

      const sources: Source[] = data.results
        .filter((r) => r.success)
        .map((r) => ({
          id: `url-${r.url}`,
          title: r.title,
          text: r.text,
          url: r.url,
          wordCount: r.wordCount,
          source: "url" as const,
          selected: true,
        }));

      onSourcesReady(sources);
    } catch {
      setStatuses((prev) => prev.map((s) => ({ ...s, status: "error", message: "Network error" })));
    } finally {
      setIsFetching(false);
    }
  };

  const urls = parseUrls(urlInput);
  const hasUrls = urls.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          URLs to scrape
        </label>
        <textarea
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={`Paste one URL per line:\nhttps://www.nhs.uk/conditions/diabetes/\nhttps://pubmed.ncbi.nlm.nih.gov/...\nhttps://www.nice.org.uk/guidance/...`}
          className="w-full h-36 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
          disabled={isFetching}
        />
        <p className="text-xs text-gray-400 mt-1">
          {hasUrls ? `${urls.length} URL${urls.length > 1 ? "s" : ""} detected · max 10` : "Paste URLs — one per line"}
        </p>
      </div>

      <button
        onClick={handleFetch}
        disabled={!hasUrls || isFetching}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          hasUrls && !isFetching
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
            Scraping…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Fetch &amp; extract text
          </>
        )}
      </button>

      {/* Status list */}
      {statuses.length > 0 && (
        <div className="space-y-1.5">
          {statuses.map((s) => (
            <div key={s.url} className="flex items-start gap-2 text-xs">
              {s.status === "pending" && <span className="w-4 h-4 mt-0.5 shrink-0 border-2 border-gray-300 rounded-full animate-spin border-t-brand-500" />}
              {s.status === "success" && (
                <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {s.status === "error" && (
                <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div className="min-w-0">
                <p className={`truncate ${s.status === "error" ? "text-red-600" : "text-gray-700"}`}>
                  {new URL(s.url).hostname}{new URL(s.url).pathname.slice(0, 30)}
                </p>
                {s.message && <p className="text-gray-400">{s.message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          Fetches and extracts readable text from any public web page — articles, reports, NHS pages, journal abstracts, NICE guidance, PDFs linked as HTML, etc. JavaScript-heavy pages may return limited text.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useCallback } from "react";
import type { Source } from "@/lib/scraper";

interface UrlScraperProps {
  onSourcesReady: (sources: Source[]) => void;
}

interface FetchStatus {
  url: string;
  status: "pending" | "success" | "error";
  message?: string;
}

const FIRECRAWL_NOTE =
  "Firecrawl renders JavaScript, handles SPAs and dynamic sites. Requires FIRECRAWL_API_KEY.";

export default function UrlScraper({ onSourcesReady }: UrlScraperProps) {
  const [urlInput, setUrlInput] = useState("");
  const [useFirecrawl, setUseFirecrawl] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [statuses, setStatuses] = useState<FetchStatus[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseUrls = (raw: string) =>
    raw
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter((u) => {
        try {
          new URL(u);
          return true;
        } catch {
          return false;
        }
      });

  const appendUrls = useCallback((newText: string) => {
    setUrlInput((prev) => {
      const existing = prev.trim();
      if (!existing) return newText;
      return existing + "\n" + newText;
    });
  }, []);

  const handleFilesRead = useCallback((files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === "string") {
          // Extract URLs from text content (handles CSV, TXT, any text)
          const urls = text
            .split(/[\n,\r\t]+/)
            .map((l) => l.trim().replace(/^["']|["']$/g, ""))
            .filter((l) => {
              try { return ["http:", "https:"].includes(new URL(l).protocol); } catch { return false; }
            });
          if (urls.length > 0) {
            appendUrls(urls.join("\n"));
          }
        }
      };
      reader.readAsText(file);
    });
  }, [appendUrls]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // Check for dropped files
    if (e.dataTransfer.files.length > 0) {
      handleFilesRead(e.dataTransfer.files);
      return;
    }

    // Check for dropped text (e.g. dragged URL from browser)
    const text = e.dataTransfer.getData("text/plain");
    if (text) {
      appendUrls(text);
    }
  }, [handleFilesRead, appendUrls]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFilesRead(e.target.files);
    e.target.value = "";
  };

  const handleFetch = async () => {
    const urls = parseUrls(urlInput);
    if (!urls.length) return;

    setIsFetching(true);
    setStatuses(urls.map((url) => ({ url, status: "pending" })));

    const endpoint = useFirecrawl ? "/api/sources/firecrawl" : "/api/scrape";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setStatuses((prev) =>
          prev.map((s) => ({ ...s, status: "error", message: err.error ?? "Failed" }))
        );
        return;
      }

      const data = (await res.json()) as {
        results: Array<{
          url: string;
          title: string;
          text: string;
          wordCount: number;
          success: boolean;
          error?: string;
        }>;
        error?: string;
      };

      if (data.error) {
        setStatuses((prev) =>
          prev.map((s) => ({ ...s, status: "error", message: data.error }))
        );
        return;
      }

      setStatuses(
        (data.results ?? []).map((r) => ({
          url: r.url,
          status: r.success ? "success" : "error",
          message: r.error,
        }))
      );

      const sources: Source[] = (data.results ?? [])
        .filter((r) => r.success)
        .map((r) => ({
          id: `url-${r.url}`,
          title: r.title,
          text: r.text,
          url: r.url,
          wordCount: r.wordCount,
          source: "url" as const,
          selected: true,
          meta: useFirecrawl ? "Firecrawl" : undefined,
        }));

      onSourcesReady(sources);
    } catch (err) {
      setStatuses((prev) =>
        prev.map((s) => ({
          ...s,
          status: "error",
          message: err instanceof Error ? err.message : "Network error",
        }))
      );
    } finally {
      setIsFetching(false);
    }
  };

  const urls = parseUrls(urlInput);
  const hasUrls = urls.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-gray-600">URLs to scrape</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              disabled={isFetching}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,.tsv,.md"
              className="hidden"
              onChange={handleFileUpload}
              multiple
            />
          </div>
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-xl border-2 transition-colors ${
            isDragOver
              ? "border-brand-400 bg-brand-50/50 border-dashed"
              : "border-transparent"
          }`}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-50/80 rounded-xl z-10 pointer-events-none">
              <p className="text-sm font-medium text-brand-600">Drop URLs or files here</p>
            </div>
          )}
          <textarea
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={`Paste URLs, drag a file, or drop links here\nhttps://www.g2.com/products/salesforce-crm/reviews\nhttps://techcrunch.com/2025/...\nhttps://competitor.com/pricing`}
            className="w-full h-36 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-surface-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 focus:bg-white font-mono"
            disabled={isFetching}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {hasUrls
            ? `${urls.length} URL${urls.length > 1 ? "s" : ""} detected · max 15`
            : "Paste, type, or drop a .txt/.csv file with URLs"}
        </p>
      </div>

      {/* Firecrawl toggle */}
      <div className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 bg-surface-50">
        <button
          type="button"
          role="switch"
          aria-checked={useFirecrawl}
          onClick={() => setUseFirecrawl((v) => !v)}
          disabled={isFetching}
          className={`relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${
            useFirecrawl ? "bg-brand-600" : "bg-gray-200"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              useFirecrawl ? "translate-x-4" : ""
            }`}
          />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold text-gray-700">
              Use Firecrawl
              {useFirecrawl && (
                <span className="ml-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-1.5 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{FIRECRAWL_NOTE}</p>
        </div>
      </div>

      <button
        onClick={handleFetch}
        disabled={!hasUrls || isFetching}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          hasUrls && !isFetching
            ? useFirecrawl
              ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
              : "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isFetching ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {useFirecrawl ? "Firecrawling…" : "Scraping…"}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {useFirecrawl ? "Firecrawl extract" : "Fetch & extract text"}
          </>
        )}
      </button>

      {/* Status list */}
      {statuses.length > 0 && (
        <div className="space-y-1.5">
          {statuses.map((s) => (
            <div key={s.url} className="flex items-start gap-2 text-xs">
              {s.status === "pending" && (
                <span className="w-4 h-4 mt-0.5 shrink-0 border-2 border-gray-300 rounded-full animate-spin border-t-brand-500" />
              )}
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
                  {(() => { try { const u = new URL(s.url); return u.hostname + u.pathname.slice(0, 30); } catch { return s.url; } })()}
                </p>
                {s.message && <p className="text-gray-400">{s.message}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-50 rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">
          {useFirecrawl
            ? "Firecrawl renders full pages including JavaScript — ideal for G2, Capterra, SPAs, and paywalled content."
            : "Basic fetch extracts readable text from public pages. Enable Firecrawl above for JS-heavy sites like G2 or Capterra."}
        </p>
      </div>
    </div>
  );
}

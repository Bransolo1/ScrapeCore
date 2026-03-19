"use client";

import { useState, useCallback } from "react";
import type { DiscoveryResult } from "@/app/api/discover/route";

interface CompanySearchBarProps {
  onDiscovery: (result: DiscoveryResult) => void;
}

export type { DiscoveryResult };

const FOUND_LABELS: Record<string, string> = {
  reddit: "Reddit",
  trustpilot: "Trustpilot",
  appstore: "App Store",
  googleplay: "Google Play",
  g2: "G2",
  capterra: "Capterra",
  stocktwits: "StockTwits",
};

export default function CompanySearchBar({ onDiscovery }: CompanySearchBarProps) {
  const [company, setCompany] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    const trimmed = company.trim();
    if (!trimmed) return;

    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Discovery failed" }));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      const data = (await res.json()) as DiscoveryResult;
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSearching(false);
    }
  }, [company]);

  const handlePrefill = useCallback(() => {
    if (result) onDiscovery(result);
  }, [result, onDiscovery]);

  // Count what was found
  const found: string[] = [];
  const notFound: string[] = [];
  if (result) {
    if (result.reddit.subreddits.length > 0) found.push(`Reddit (${result.reddit.subreddits.length} subs)`);
    else notFound.push("Reddit subs");

    for (const [key, label] of Object.entries(FOUND_LABELS)) {
      if (key === "reddit") continue; // handled above
      const entry = result[key as keyof DiscoveryResult];
      if (entry && typeof entry === "object" && "found" in entry) {
        if (entry.found) found.push(label);
        else notFound.push(label);
      }
    }
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1.5">
          Company name
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={company}
              onChange={(e) => { setCompany(e.target.value); setResult(null); setError(null); }}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="e.g. Bet365, Monzo, Revolut, Stripe…"
              className="w-full px-3.5 py-2.5 text-sm bg-surface-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 focus:bg-white pr-9"
              disabled={searching}
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={!company.trim() || searching}
            className="px-4 py-2.5 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 rounded-xl transition-colors shrink-0 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching ? "Discovering…" : "Discover"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      {/* Discovery results */}
      {result && (
        <div className="bg-surface-50 rounded-xl border border-gray-200 p-4 space-y-3">
          {/* Found sources */}
          {found.length > 0 && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-xs font-medium text-gray-700">Found</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {found.join(" · ")}
                </p>
              </div>
            </div>
          )}

          {/* Not found */}
          {notFound.length > 0 && (
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              <div>
                <p className="text-xs font-medium text-gray-400">Not found</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {notFound.join(" · ")}
                </p>
              </div>
            </div>
          )}

          {/* Reddit subreddits detail */}
          {result.reddit.subreddits.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-500">Subreddits:</span>
              {result.reddit.subreddits.map((sub) => (
                <span key={sub} className="text-[11px] font-medium text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                  r/{sub}
                </span>
              ))}
            </div>
          )}

          {/* App details */}
          {result.appstore.found && result.appstore.appName && (
            <p className="text-xs text-gray-500">
              iOS: <span className="font-medium text-gray-700">{result.appstore.appName}</span>
              <span className="text-gray-300 ml-1">({result.appstore.appId})</span>
            </p>
          )}

          {/* Action button */}
          <button
            onClick={handlePrefill}
            className="w-full py-2 px-4 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Auto-select sources & prefill all fields ({found.length} sources)
          </button>
        </div>
      )}
    </div>
  );
}

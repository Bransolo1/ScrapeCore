"use client";

import { useState, useEffect } from "react";

export default function TrustBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("scrapecore-trust-banner-dismissed") === "1") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("scrapecore-trust-banner-dismissed", "1");
  };

  if (dismissed) {
    return (
      <button
        onClick={() => { setDismissed(false); localStorage.removeItem("scrapecore-trust-banner-dismissed"); }}
        className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700 font-medium px-2 py-1 rounded-lg hover:bg-amber-50 transition-colors"
        title="Show AI disclaimer"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        AI-generated — expert review required
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm relative">
      <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-amber-800 leading-snug font-semibold text-xs mb-1">AI-generated analysis</p>
        <ul className="text-xs text-amber-700 leading-relaxed space-y-0.5">
          <li>All findings should be reviewed by a qualified practitioner before operational use.</li>
          <li>Grounding scores and validity indicators assist — but do not replace — expert judgement.</li>
        </ul>
      </div>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-1 rounded-md text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
        title="Dismiss — you can bring this back anytime"
        aria-label="Dismiss disclaimer"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

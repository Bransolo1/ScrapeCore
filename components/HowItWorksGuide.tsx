"use client";

import { useEffect, useRef } from "react";

interface HowItWorksGuideProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    number: 1,
    title: "Set up your API keys",
    description:
      "Add your Anthropic key (required for analysis) plus Firecrawl and Perplexity keys (recommended for web scraping and social listening). Go to Settings (gear icon) > API Keys.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
    color: "bg-brand-50 text-brand-600",
  },
  {
    number: 2,
    title: "Choose a collection method",
    description:
      "Scrape URLs — extract content from websites via Firecrawl. Social Listening — search Reddit, reviews, and news via Perplexity. Company Research — run a full digital footprint scan. Or Upload/Paste your own transcripts and survey data.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
    color: "bg-sky-50 text-sky-600",
  },
  {
    number: 3,
    title: "Set your research question",
    description:
      'Tell the platform what you\'re trying to understand. For example: "Why do users abandon checkout on our mobile app?" or "What are the key barriers to switching energy providers?" This guides the behavioural analysis.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.065 2.386-1.839 3.772-1.839 1.8 0 3 1.299 3 2.839 0 1.857-2.17 2.673-2.829 4.318-.117.292-.171.636-.171.982m0 2.5h.01" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
  },
  {
    number: 4,
    title: "Run the analysis",
    description:
      "ScrapeCore applies the COM-B behavioural science framework (Capability, Opportunity, Motivation \u2192 Behaviour) to your data. It identifies key behaviours, barriers, motivators, and evidence-based intervention opportunities.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    number: 5,
    title: "Review, validate, and export",
    description:
      "Check findings using the confidence panel and evidence grounding. Dispute or confirm individual insights. Export as PDF report, Markdown, or JSON. Use the Dashboard to track patterns across multiple analyses over time.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: "bg-violet-50 text-violet-600",
  },
];

export default function HowItWorksGuide({ open, onClose }: HowItWorksGuideProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-fade-in"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-base font-semibold text-gray-900">How ScrapeCore works</h2>
            <p className="text-xs text-gray-400 mt-0.5">Your research flow in 5 steps</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close guide"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 py-6 space-y-5">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-4">
              {/* Step number + connector line */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step.color}`}>
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-gray-200 mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Step {step.number}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1.5">{step.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip section */}
        <div className="px-6 pb-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-brand-700 mb-1">Pro tips</p>
            <ul className="text-xs text-brand-600 space-y-1 leading-relaxed">
              <li>Use <strong>Company Research</strong> for the deepest analysis — it scrapes websites, app stores, reviews, and search results in one go.</li>
              <li>Set a <strong>research question</strong> before running any analysis — it dramatically improves the quality of insights.</li>
              <li>Use <strong>Cost Controls</strong> in Settings to set monthly budget limits on Firecrawl and Perplexity API usage.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

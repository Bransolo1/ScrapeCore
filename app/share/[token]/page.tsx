"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { BehaviourAnalysis } from "@/lib/types";
import ComBSection from "@/components/ComBSection";
import KeyBehaviours from "@/components/KeyBehaviours";
import { BarriersList, MotivatorsList } from "@/components/BarriersMotivators";
import InterventionsSection from "@/components/InterventionsSection";
import ConfidencePanel from "@/components/ConfidencePanel";

interface SharedAnalysis {
  id: string;
  createdAt: string;
  title: string;
  dataType: string;
  analysisJson: BehaviourAnalysis;
  promptVersion: string | null;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d: SharedAnalysis & { error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError("Failed to load shared analysis."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading shared analysis…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-2">Link not found</h2>
          <p className="text-sm text-gray-500 mb-6">{error ?? "This analysis link is invalid or has been revoked."}</p>
          <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
            Go to ScrapeCore
          </Link>
        </div>
      </div>
    );
  }

  const analysis = data.analysisJson;
  const date = new Date(data.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Read-only header */}
      <header className="border-b border-gray-200 bg-white/95 sticky top-0 z-30 backdrop-blur-md shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-700">ScrapeCore</span>
            </Link>
            <span className="text-gray-300">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Read-only
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors print:hidden"
              title="Save as PDF via browser print dialog"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / PDF
            </button>
            <span className="text-xs text-gray-400">{date}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Summary */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{data.dataType.replace("_", " ")}</span>
            {data.promptVersion && (
              <span className="text-xs font-mono text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full">{data.promptVersion}</span>
            )}
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-2">{data.title}</h1>
          <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
          <p className="text-xs text-amber-600 mt-4 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            AI-generated analysis — shared read-only. Expert review required before operational use.
          </p>
        </div>

        <ComBSection mapping={analysis.com_b_mapping} />
        <KeyBehaviours behaviours={analysis.key_behaviours} />
        <BarriersList barriers={analysis.barriers} />
        <MotivatorsList motivators={analysis.motivators} />
        <InterventionsSection interventions={analysis.intervention_opportunities} />
        <ConfidencePanel
          confidence={analysis.confidence}
          recommendedResearch={analysis.recommended_next_research}
          durationMs={null}
          clarificationNote={analysis.clarification_note}
        />
      </main>

      <footer className="border-t border-gray-100 py-4 mt-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-xs text-gray-400">
            Shared via ScrapeCore · COM-B · Behaviour Change Wheel · AI-assisted — expert review required
          </p>
        </div>
      </footer>
    </div>
  );
}

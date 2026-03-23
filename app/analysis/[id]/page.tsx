"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import AnalysisResults from "@/components/AnalysisResults";
import ErrorBoundary from "@/components/ErrorBoundary";
import type { AnalysisState, BehaviourAnalysis } from "@/lib/types";

export default function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<AnalysisState>({
    status: "idle",
    streamingText: "",
    analysis: null,
    error: null,
    durationMs: null,
  });
  const [inputText, setInputText] = useState("");
  const [reviewStatus, setReviewStatus] = useState<string | undefined>();
  const [reviewNotes, setReviewNotes] = useState<string | null | undefined>();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    const actor = localStorage.getItem("scrapecore-user") ?? "analyst";
    setLoading(true);
    fetch(`/api/analyses/${id}?actor=${encodeURIComponent(actor)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setState({
            status: "error",
            streamingText: "",
            analysis: null,
            error: data.error,
            durationMs: null,
          });
        } else {
          setState({
            status: "complete",
            streamingText: "",
            analysis: data.analysisJson as BehaviourAnalysis,
            error: null,
            durationMs: data.durationMs,
            savedId: data.id,
          });
          setInputText(data.inputText ?? "");
          setReviewStatus(data.reviewStatus ?? undefined);
          setReviewNotes(data.reviewNotes ?? undefined);
          setTitle(data.title ?? "Analysis");
        }
      })
      .catch((err) => {
        setState({
          status: "error",
          streamingText: "",
          analysis: null,
          error: err instanceof Error ? err.message : "Failed to load analysis",
          durationMs: null,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 mb-4 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to ScrapeCore
        </a>

        {title && (
          <h1 className="text-lg font-semibold text-gray-900 mb-4">{title}</h1>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex items-center gap-2.5 px-4 py-2 bg-brand-50 border border-brand-100 rounded-full">
                <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-brand-700">Loading analysis...</span>
              </div>
            </div>
          ) : (
            <ErrorBoundary>
              <AnalysisResults
                state={state}
                inputText={inputText}
                initialReviewStatus={reviewStatus}
                initialReviewNotes={reviewNotes}
              />
            </ErrorBoundary>
          )}
        </div>
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            ScrapeCore · Behavioural Market Intelligence
          </p>
          <p className="text-xs text-gray-400">
            AI-assisted — expert review required before operational use
          </p>
        </div>
      </footer>
    </div>
  );
}

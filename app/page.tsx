"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import DataInput from "@/components/DataInput";
import UrlScraper from "@/components/UrlScraper";
import SocialListener from "@/components/SocialListener";
import SourcesPanel from "@/components/SourcesPanel";
import AnalysisResults from "@/components/AnalysisResults";
import AnalysisHistory from "@/components/AnalysisHistory";
import type { AnalysisState, DataType, BehaviourAnalysis } from "@/lib/types";
import type { Source } from "@/lib/scraper";
import { formatSourcesAsText } from "@/lib/scraper";

type InputMode = "paste" | "scrape" | "social";

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  streamingText: "",
  analysis: null,
  error: null,
  durationMs: null,
};

const MODE_TABS: { id: InputMode; label: string; icon: React.ReactNode }[] = [
  {
    id: "paste",
    label: "Paste text",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: "scrape",
    label: "Scrape URLs",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "social",
    label: "Social listening",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
];

export default function Home() {
  const [mode, setMode] = useState<InputMode>("paste");

  // Paste mode state
  const [pasteText, setPasteText] = useState("");
  const [dataType, setDataType] = useState<DataType>("survey");

  // Scrape / social sources
  const [sources, setSources] = useState<Source[]>([]);

  // Analysis state
  const [analysisState, setAnalysisState] = useState<AnalysisState>(INITIAL_STATE);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | undefined>();
  const startTimeRef = useRef<number>(0);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  const isLoading = analysisState.status === "streaming";

  // ── Analysis runner ─────────────────────────────────────────────────────

  const runAnalysis = async (text: string, dt: DataType) => {
    if (!text.trim() || isLoading) return;

    setAnalysisState({ status: "streaming", streamingText: "", analysis: null, error: null, durationMs: null });
    setUsage(undefined);
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dataType: dt }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setAnalysisState({ status: "error", streamingText: "", analysis: null, error: err.error ?? "Unknown error", durationMs: null });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const event = JSON.parse(raw) as
              | { type: "chunk"; text: string }
              | { type: "complete"; analysis: BehaviourAnalysis; usage: { inputTokens: number; outputTokens: number } }
              | { type: "error"; error: string };

            if (event.type === "chunk") {
              setAnalysisState((prev) => ({ ...prev, streamingText: prev.streamingText + event.text }));
            } else if (event.type === "complete") {
              setUsage(event.usage);
              setAnalysisState({ status: "complete", streamingText: "", analysis: event.analysis, error: null, durationMs: Date.now() - startTimeRef.current });
              setHistoryRefreshKey((k) => k + 1);
            } else if (event.type === "error") {
              setAnalysisState({ status: "error", streamingText: "", analysis: null, error: event.error, durationMs: null });
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (err) {
      setAnalysisState({ status: "error", streamingText: "", analysis: null, error: err instanceof Error ? err.message : "Network error", durationMs: null });
    }
  };

  const handlePasteAnalyse = () => runAnalysis(pasteText, dataType);

  const handleSourcesAnalyse = () => {
    const text = formatSourcesAsText(sources);
    // Infer best data type from source types
    const hasSocial = sources.some((s) => s.source === "reddit" || s.source === "hackernews");
    const dt: DataType = hasSocial ? "social" : "free_text";
    runAnalysis(text, dt);
  };

  const handleNewSources = (newSources: Source[]) => {
    setSources((prev) => {
      const existingIds = new Set(prev.map((s) => s.id));
      return [...prev, ...newSources.filter((s) => !existingIds.has(s.id))];
    });
  };

  const toggleSource = (id: string) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
  };

  const clearSources = () => setSources([]);

  const handleLoadFromHistory = (analysis: BehaviourAnalysis, dt: DataType) => {
    setUsage(undefined);
    setAnalysisState({ status: "complete", streamingText: "", analysis, error: null, durationMs: null });
    setShowHistory(false);
  };

  const activeInputText =
    mode === "paste" ? pasteText : formatSourcesAsText(sources);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
          {/* ── Input panel ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-8">
            {/* Mode tabs */}
            <div className="flex border-b border-gray-100">
              {MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  disabled={isLoading}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                    mode === tab.id
                      ? "text-brand-600 border-b-2 border-brand-600 bg-brand-50/50"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-5">
              {mode === "paste" && (
                <DataInput
                  text={pasteText}
                  dataType={dataType}
                  isLoading={isLoading}
                  onTextChange={setPasteText}
                  onDataTypeChange={setDataType}
                  onSubmit={handlePasteAnalyse}
                />
              )}

              {mode === "scrape" && (
                <>
                  <UrlScraper onSourcesReady={handleNewSources} />
                  {sources.filter((s) => s.source === "url").length > 0 && (
                    <SourcesPanel
                      sources={sources.filter((s) => s.source === "url")}
                      onToggle={toggleSource}
                      onClear={clearSources}
                      onAnalyse={handleSourcesAnalyse}
                      isLoading={isLoading}
                    />
                  )}
                </>
              )}

              {mode === "social" && (
                <>
                  <SocialListener onSourcesReady={handleNewSources} />
                  {sources.filter((s) => s.source === "reddit" || s.source === "hackernews").length > 0 && (
                    <SourcesPanel
                      sources={sources.filter((s) => s.source === "reddit" || s.source === "hackernews")}
                      onToggle={toggleSource}
                      onClear={clearSources}
                      onAnalyse={handleSourcesAnalyse}
                      isLoading={isLoading}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Results panel ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-96 overflow-hidden flex flex-col">
            {/* Panel header with history toggle */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-2">
                {showHistory ? (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Analysis history</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Results</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setShowHistory((v) => !v)}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                  showHistory
                    ? "bg-brand-50 text-brand-600 hover:bg-brand-100"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showHistory ? "Back to results" : "History"}
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-hidden">
              {showHistory ? (
                <AnalysisHistory
                  onLoad={handleLoadFromHistory}
                  refreshKey={historyRefreshKey}
                />
              ) : (
                <AnalysisResults
                  state={analysisState}
                  inputText={activeInputText}
                  usage={usage}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Powered by Claude Opus 4.6 · COM-B · Behaviour Change Wheel
          </p>
          <p className="text-xs text-gray-400">
            AI-assisted — expert review required before operational use
          </p>
        </div>
      </footer>
    </div>
  );
}

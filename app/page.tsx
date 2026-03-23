"use client";

import { useState, useRef, useEffect } from "react";
import Header from "@/components/Header";
import DataInput from "@/components/DataInput";
import UrlScraper from "@/components/UrlScraper";
import SocialListener from "@/components/SocialListener";
import CompanyFootprint from "@/components/CompanyFootprint";
import SourcesPanel from "@/components/SourcesPanel";
import AnalysisResults from "@/components/AnalysisResults";
import AnalysisHistory from "@/components/AnalysisHistory";
import PIIWarningModal from "@/components/PIIWarningModal";
import WizardOverlay from "@/components/WizardOverlay";
import TextPreviewModal from "@/components/TextPreviewModal";
import BatchPanel from "@/components/BatchPanel";
import type { BatchDoc } from "@/components/BatchPanel";
import type { AnalysisState, DataType, BehaviourAnalysis } from "@/lib/types";
import type { Source } from "@/lib/scraper";
import { formatSourcesAsText } from "@/lib/scraper";
import { scanForPII, redactPII } from "@/lib/pii";
import type { PIIScanResult } from "@/lib/pii";
import ErrorBoundary from "@/components/ErrorBoundary";
import SettingsModal from "@/components/SettingsModal";

type InputMode = "paste" | "scrape" | "social" | "footprint" | "batch";

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  streamingText: "",
  analysis: null,
  error: null,
  durationMs: null,
};

const MODE_TABS: { id: InputMode; label: string; hint: string; group: "collect" | "manual" | "advanced"; icon: React.ReactNode }[] = [
  {
    id: "scrape",
    label: "Scrape URLs",
    hint: "Extract text from web pages",
    group: "collect",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: "social",
    label: "Social listening",
    hint: "Reddit, reviews, news, app stores",
    group: "collect",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
  {
    id: "footprint",
    label: "Digital footprint",
    hint: "Full company research across sources",
    group: "collect",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  },
  {
    id: "paste",
    label: "Paste text",
    hint: "Paste or upload your own qualitative data",
    group: "manual",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: "batch",
    label: "Batch",
    hint: "Analyse multiple documents at once",
    group: "advanced",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
];

const MODE_GROUPS: { key: string; label: string }[] = [
  { key: "collect", label: "Collect data" },
  { key: "manual", label: "Your data" },
  { key: "advanced", label: "Advanced" },
];

function getActor(): string {
  if (typeof window === "undefined") return "system";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

export default function Home() {
  const [mode, setMode] = useState<InputMode>("scrape");

  // Paste mode state — restored from localStorage on mount
  const [pasteText, setPasteText] = useState("");
  const [dataType, setDataType] = useState<DataType>("survey");
  const [projectContext, setProjectContext] = useState("");

  // Auto-save input text to localStorage (recover on tab close / refresh)
  useEffect(() => {
    const saved = localStorage.getItem("scrapecore-draft-text");
    const savedDt = localStorage.getItem("scrapecore-draft-datatype") as DataType | null;
    const savedCtx = localStorage.getItem("scrapecore-draft-context");
    if (saved) setPasteText(saved);
    if (savedDt) setDataType(savedDt);
    if (savedCtx) setProjectContext(savedCtx);
  }, []);
  useEffect(() => { localStorage.setItem("scrapecore-draft-text", pasteText); }, [pasteText]);
  useEffect(() => { localStorage.setItem("scrapecore-draft-datatype", dataType); }, [dataType]);
  useEffect(() => { localStorage.setItem("scrapecore-draft-context", projectContext); }, [projectContext]);

  // Unified wizard (first-run with welcome, or guided setup without)
  const [showWizard, setShowWizard] = useState(false);
  const [wizardShowWelcome, setWizardShowWelcome] = useState(true);

  // Scrape / social sources
  const [sources, setSources] = useState<Source[]>([]);

  // Analysis state
  const [analysisState, setAnalysisState] = useState<AnalysisState>(INITIAL_STATE);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | undefined>();
  const startTimeRef = useRef<number>(0);

  // Rate limit remaining
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);

  // Review data (loaded from history)
  const [reviewData, setReviewData] = useState<{ status?: string; notes?: string | null }>({});

  // Hero banner
  const [showHero, setShowHero] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("scrapecore-hero-dismissed")) setShowHero(true);
  }, []);

  // Settings modal
  const [showSettings, setShowSettings] = useState(false);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Text preview (for scraped/social content before analysis)
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewDataType, setPreviewDataType] = useState<DataType>("free_text");

  // PII gate
  const [piiResult, setPiiResult] = useState<PIIScanResult | null>(null);
  const pendingRef = useRef<{ text: string; dt: DataType } | null>(null);

  const isLoading = analysisState.status === "streaming";
  const abortRef = useRef<AbortController | null>(null);

  const cancelAnalysis = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAnalysisState((prev) =>
      prev.status === "streaming"
        ? { status: "idle", streamingText: "", analysis: null, error: null, durationMs: null }
        : prev
    );
  };

  // Show wizard for first-time users
  useEffect(() => {
    if (!localStorage.getItem("scrapecore-wizard-done")) {
      setShowWizard(true);
    }
  }, []);

  // ── Analysis runner ─────────────────────────────────────────────────────

  const runAnalysis = async (text: string, dt: DataType, piiDetected = false) => {
    if (!text.trim() || isLoading) return;

    setAnalysisState({ status: "streaming", streamingText: "", analysis: null, error: null, durationMs: null, savedId: null });
    setUsage(undefined);
    startTimeRef.current = Date.now();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dataType: dt, actor: getActor(), piiDetected, projectContext: projectContext.trim() || undefined }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        if (err.code === "no_api_key") {
          setShowSettings(true);
          setAnalysisState(INITIAL_STATE);
          return;
        }
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
              | { type: "complete"; analysis: BehaviourAnalysis; savedId?: string; usage: { inputTokens: number; outputTokens: number }; truncated?: boolean; rateLimitRemaining?: number }
              | { type: "error"; error: string };

            if (event.type === "chunk") {
              setAnalysisState((prev) => ({ ...prev, streamingText: prev.streamingText + event.text }));
            } else if (event.type === "complete") {
              setUsage(event.usage);
              if (event.rateLimitRemaining !== undefined) setRateLimitRemaining(event.rateLimitRemaining);
              setAnalysisState({
                status: "complete",
                streamingText: "",
                analysis: event.analysis,
                error: null,
                durationMs: Date.now() - startTimeRef.current,
                savedId: event.savedId ?? null,
                truncated: event.truncated,
              });
              setHistoryRefreshKey((k) => k + 1);
            } else if (event.type === "error") {
              setAnalysisState({ status: "error", streamingText: "", analysis: null, error: event.error, durationMs: null });
            }
          } catch { /* partial JSON */ }
        }
      }
    } catch (err) {
      // AbortError means the user cancelled — state already reset by cancelAnalysis()
      if (err instanceof DOMException && err.name === "AbortError") return;
      setAnalysisState({ status: "error", streamingText: "", analysis: null, error: err instanceof Error ? err.message : "Network error", durationMs: null });
    }
  };

  // ── PII gate ─────────────────────────────────────────────────────────────

  const scanAndRun = (text: string, dt: DataType) => {
    if (!text.trim() || isLoading) return;
    const scan = scanForPII(text);
    if (scan.hasPII) {
      pendingRef.current = { text, dt };
      setPiiResult(scan);
    } else {
      runAnalysis(text, dt, false);
    }
  };

  const handlePIIContinue = () => {
    const pending = pendingRef.current;
    setPiiResult(null);
    if (pending) runAnalysis(pending.text, pending.dt, true);
  };

  const handlePIIRedactAndContinue = () => {
    const pending = pendingRef.current;
    setPiiResult(null);
    if (pending) runAnalysis(redactPII(pending.text), pending.dt, false);
  };

  const handlePIICancel = () => {
    setPiiResult(null);
    pendingRef.current = null;
  };

  const handlePasteAnalyse = () => scanAndRun(pasteText, dataType);

  const handleSourcesAnalyse = () => {
    const text = formatSourcesAsText(sources);
    // Infer best data type from source types
    const hasSocial = sources.some((s) => s.source === "reddit" || s.source === "hackernews");
    const dt: DataType = hasSocial ? "social" : "free_text";
    setPreviewText(text);
    setPreviewDataType(dt);
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

  const handleLoadFromHistory = (analysis: BehaviourAnalysis, dt: DataType, savedId?: string, reviewStatus?: string, reviewNotes?: string | null) => {
    setUsage(undefined);
    setAnalysisState({ status: "complete", streamingText: "", analysis, error: null, durationMs: null, savedId: savedId ?? null });
    setReviewData({ status: reviewStatus, notes: reviewNotes });
    setShowHistory(false);
  };

  const handleBatchResult = (doc: BatchDoc) => {
    setUsage(undefined);
    setAnalysisState({
      status: "complete",
      streamingText: "",
      analysis: doc.state.analysis,
      error: null,
      durationMs: doc.state.durationMs,
      savedId: doc.state.savedId ?? null,
    });
    setShowHistory(false);
  };

  const handleModeSwitch = (targetMode: InputMode) => {
    if (targetMode === mode) return;
    const hasContent =
      (mode === "paste" && pasteText.trim().length > 0) ||
      (mode !== "paste" && mode !== "batch" && sources.length > 0);
    if (hasContent) {
      const ok = window.confirm(
        "You have data in the current mode. Switch anyway?\nYour data will be preserved if you switch back."
      );
      if (!ok) return;
    }
    setMode(targetMode);
  };

  const activeInputText =
    mode === "paste" ? pasteText : formatSourcesAsText(sources);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      {/* Unified onboarding / guided setup wizard */}
      {showWizard && (
        <WizardOverlay
          showWelcome={wizardShowWelcome}
          onDone={() => {
            setShowWizard(false);
            localStorage.setItem("scrapecore-wizard-done", "1");
          }}
          onComplete={({ text, dataType: dt, projectContext: ctx, skipAnalysis }) => {
            setMode("paste");
            setPasteText(text);
            setDataType(dt);
            setProjectContext(ctx);
            setShowWizard(false);
            localStorage.setItem("scrapecore-wizard-done", "1");
            if (!skipAnalysis) scanAndRun(text, dt);
          }}
        />
      )}

      {/* PII warning modal */}
      {piiResult && (
        <PIIWarningModal
          result={piiResult}
          onContinue={handlePIIContinue}
          onRedactAndContinue={handlePIIRedactAndContinue}
          onCancel={handlePIICancel}
        />
      )}

      {/* Text preview modal for scraped/social content */}
      {previewText !== null && (
        <TextPreviewModal
          text={previewText}
          dataType={previewDataType}
          sources={sources.filter((s) => s.selected).map((s) => ({
            id: s.id,
            title: s.title,
            text: s.text,
            source: s.source,
            wordCount: s.wordCount,
            selected: s.selected,
          }))}
          onConfirm={(text, dt) => {
            setPreviewText(null);
            scanAndRun(text, dt);
          }}
          onCancel={() => setPreviewText(null)}
        />
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* ── Mission hero — dismissible after first view ── */}
        {showHero && (
          <div className="mb-6 relative bg-gradient-to-r from-brand-600 via-brand-700 to-amber-800 rounded-2xl p-6 text-white overflow-hidden">
            <button
              onClick={() => { localStorage.setItem("scrapecore-hero-dismissed", "1"); setShowHero(false); }}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl font-bold mb-1">Scrape the web. Apply behavioural science. Understand your users.</h2>
            <p className="text-brand-200 text-sm mb-4 max-w-2xl">
              Collect data from app stores, social media, reviews, and websites — then let COM-B analysis reveal the barriers, motivators, and interventions hiding in your qualitative data.
            </p>
            {/* Pipeline visual */}
            <div className="flex items-center gap-2 text-xs font-medium">
              {[
                { step: "1", label: "Collect", desc: "Scrape & gather data" },
                { step: "2", label: "Preview", desc: "Select & review sources" },
                { step: "3", label: "Analyse", desc: "COM-B behavioural analysis" },
                { step: "4", label: "Validate", desc: "Review & refine findings" },
              ].map((s, i) => (
                <div key={s.step} className="flex items-center gap-2">
                  {i > 0 && <svg className="w-4 h-4 text-white/40 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-3 py-1.5">
                    <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[10px] font-bold">{s.step}</span>
                    <div>
                      <span className="font-semibold">{s.label}</span>
                      <span className="text-white/60 ml-1 hidden sm:inline">— {s.desc}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Pipeline stepper (compact, always visible) ── */}
        <div className="mb-4 flex items-center gap-1.5 text-xs font-medium">
          {[
            { label: "Collect", active: analysisState.status === "idle" && !previewText },
            { label: "Preview", active: previewText !== null },
            { label: "Analyse", active: analysisState.status === "streaming" },
            { label: "Validate", active: analysisState.status === "complete" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              {i > 0 && <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
              <span className={`px-2.5 py-1 rounded-full transition-all ${
                s.active
                  ? "bg-brand-100 text-brand-700 border border-brand-200"
                  : "text-gray-400 bg-gray-100"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6 items-start">
          {/* ── Input panel ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-8">
            {/* Guided setup prompt */}
            {!pasteText && mode === "paste" && (
              <div className="px-5 pt-4 pb-0">
                <button
                  onClick={() => { setWizardShowWelcome(false); setShowWizard(true); }}
                  disabled={isLoading}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-xl text-sm font-medium text-brand-700 transition-all group"
                >
                  <svg className="w-4 h-4 shrink-0 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="flex-1 text-left">Start with guided setup</span>
                  <svg className="w-3.5 h-3.5 text-brand-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <div className="flex items-center gap-2 mt-3 mb-1">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-400 font-medium">or use expert mode below</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
              </div>
            )}
            {/* Mode tabs — grouped by type */}
            <div className="border-b border-gray-100 px-3 pt-3 pb-0">
              <div className="flex items-end gap-0.5">
                {MODE_GROUPS.map((group) => {
                  const tabs = MODE_TABS.filter((t) => t.group === group.key);
                  return (
                    <div key={group.key} className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-gray-300 px-1.5 mb-1">{group.label}</span>
                      <div className="flex">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => handleModeSwitch(tab.id)}
                            disabled={isLoading}
                            title={tab.hint}
                            className={`flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-t-lg transition-all ${
                              mode === tab.id
                                ? "text-brand-600 bg-brand-50 border border-brand-200 border-b-white -mb-px relative z-10"
                                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-5">
              {mode === "paste" && (
                <DataInput
                  text={pasteText}
                  dataType={dataType}
                  isLoading={isLoading}
                  projectContext={projectContext}
                  onTextChange={setPasteText}
                  onDataTypeChange={setDataType}
                  onProjectContextChange={setProjectContext}
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
                  {sources.filter((s) => s.source !== "url").length > 0 && (
                    <SourcesPanel
                      sources={sources.filter((s) => s.source !== "url")}
                      onToggle={toggleSource}
                      onClear={clearSources}
                      onAnalyse={handleSourcesAnalyse}
                      isLoading={isLoading}
                    />
                  )}
                </>
              )}

              {mode === "footprint" && (
                <>
                  <CompanyFootprint onSourcesReady={handleNewSources} />
                  {sources.length > 0 && (
                    <SourcesPanel
                      sources={sources}
                      onToggle={toggleSource}
                      onClear={clearSources}
                      onAnalyse={handleSourcesAnalyse}
                      isLoading={isLoading}
                    />
                  )}
                </>
              )}

              {mode === "batch" && (
                <BatchPanel onSelectResult={handleBatchResult} />
              )}
            </div>
          </div>

          {/* ── Results panel ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-96 overflow-hidden flex flex-col">
            {/* Panel header — tab-style toggle between Results and History */}
            <div className="flex items-center justify-between px-5 py-0 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-0">
                <button
                  onClick={() => setShowHistory(false)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    !showHistory
                      ? "text-brand-700 border-brand-600"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Results
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                    showHistory
                      ? "text-brand-700 border-brand-600"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              </div>
              {rateLimitRemaining !== null && (
                <span
                  title={`${rateLimitRemaining} analyses remaining this hour`}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    rateLimitRemaining <= 2
                      ? "bg-red-50 text-red-600 border border-red-100"
                      : rateLimitRemaining <= 5
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {rateLimitRemaining} left
                </span>
              )}
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-hidden">
              {showHistory ? (
                <AnalysisHistory
                  onLoad={handleLoadFromHistory}
                  refreshKey={historyRefreshKey}
                />
              ) : (
                <ErrorBoundary>
                  <AnalysisResults
                    state={analysisState}
                    inputText={activeInputText}
                    usage={usage}
                    onCancel={cancelAnalysis}
                    onReanalyse={(correctionContext) => {
                      const ctx = projectContext.trim()
                        ? `${projectContext.trim()}\n\nAnalyst corrections from previous run:\n${correctionContext}`
                        : `Analyst corrections from previous run:\n${correctionContext}`;
                      setProjectContext(ctx);
                      scanAndRun(activeInputText, dataType);
                    }}
                    initialReviewStatus={reviewData.status}
                    initialReviewNotes={reviewData.notes}
                  />
                </ErrorBoundary>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
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

"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import type { AnalysisState } from "@/lib/types";
import { groundAnalysis, buildGroundingMap } from "@/lib/grounding";
import { scoreAllInterventions } from "@/lib/validity";
import type { Correction, CorrectionStatus } from "./CorrectionControls";
import ComBSection from "./ComBSection";
import ComBChart from "./ComBChart";
import KeyBehaviours from "./KeyBehaviours";
import { BarriersList, MotivatorsList } from "./BarriersMotivators";
import InterventionsSection from "./InterventionsSection";
import ContradictionsSection from "./ContradictionsSection";
import SubgroupInsights from "./SubgroupInsights";
import PersonaCards from "./PersonaCards";
import ConfidencePanel from "./ConfidencePanel";
import ExportButton from "./ExportButton";
import ReviewPanel from "./ReviewPanel";
import GroundingPanel from "./GroundingPanel";
import TrustBanner from "./TrustBanner";
import BehaviouralContextPanel from "./BehaviouralContextPanel";
import FacilitatorsSection from "./FacilitatorsSection";
import AnalystAnnotations from "./AnalystAnnotations";
import SourceInspector from "./SourceInspector";
import RubricPanel from "./RubricPanel";
import LowConfidenceGate from "./LowConfidenceGate";
import CompetitorProfilePanel from "./CompetitorProfilePanel";
import ShareButton from "./ShareButton";
import { scoreRubric } from "@/lib/rubric";
import { usePlainMode } from "./PlainModeToggle";
import SectionNav, { useActiveSection } from "./SectionNav";
import type { SectionDef } from "./SectionNav";
import { LogoMark } from "./Logo";

interface AnalysisResultsProps {
  state: AnalysisState;
  inputText: string;
  usage?: { inputTokens: number; outputTokens: number };
  onCancel?: () => void;
  onReanalyse?: (correctionContext: string) => void;
  initialReviewStatus?: string;
  initialReviewNotes?: string | null;
  onSwitchMode?: (mode: string) => void;
  onOpenGuide?: () => void;
}

/** Collapsible section wrapper — collapsed by default with a count badge */
function CollapsibleSection({ title, count, children, defaultOpen = false }: { title: string; count?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-700">{title}</span>
        <div className="flex items-center gap-2">
          {count !== undefined && count > 0 && (
            <span className="text-xs font-medium text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{count} {count === 1 ? "item" : "items"}</span>
          )}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && <div className="px-4 py-4">{children}</div>}
    </div>
  );
}

/** Small explainer tooltip for COM-B newcomers */
function SectionExplainer({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1.5">
      <button
        onClick={() => setShow(!show)}
        className="w-4 h-4 rounded-full bg-gray-200 hover:bg-brand-200 text-gray-500 hover:text-brand-600 flex items-center justify-center text-[10px] font-bold transition-colors"
        aria-label="What is this?"
      >
        ?
      </button>
      {show && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-20 leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
        </div>
      )}
    </span>
  );
}

function getActor() {
  if (typeof window === "undefined") return "analyst";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

function EmptyState({ onSwitchMode, onOpenGuide }: { onSwitchMode?: (mode: string) => void; onOpenGuide?: () => void }) {
  const actions = [
    { mode: "scrape", icon: "link", label: "Scrape URLs", desc: "Enter URLs to extract content via Firecrawl", color: "hover:bg-brand-50 hover:border-brand-200" },
    { mode: "social", icon: "chat", label: "Social Listening", desc: "Pull reviews, Reddit threads, news via Perplexity", color: "hover:bg-sky-50 hover:border-sky-200" },
    { mode: "footprint", icon: "globe", label: "Company Research", desc: "Full digital footprint analysis across sources", color: "hover:bg-amber-50 hover:border-amber-200" },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-64 sm:min-h-96 text-center px-4 sm:px-8 py-6 sm:py-10">
      <div className="mb-4">
        <LogoMark size={56} />
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1">Start by collecting data from the web</h3>
      <p className="text-sm text-gray-400 max-w-md leading-relaxed mb-6">
        ScrapeCore uses Firecrawl and Perplexity to gather data, then applies COM-B behavioural science to reveal barriers, motivators, and interventions.
      </p>

      {/* Action cards */}
      <div className="w-full max-w-md space-y-2 mb-6">
        {actions.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSwitchMode?.(item.mode)}
            className={`w-full flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl transition-all text-left ${item.color}`}
          >
            <div className="w-8 h-8 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
              {item.icon === "link" && <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>}
              {item.icon === "chat" && <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
              {item.icon === "globe" && <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Upload / paste link + How it works */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => onSwitchMode?.("paste")}
          className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
        >
          Or upload your own data
        </button>
        {onOpenGuide && (
          <>
            <span className="text-gray-300">|</span>
            <button
              onClick={onOpenGuide}
              className="text-xs text-gray-400 hover:text-brand-600 transition-colors"
            >
              How it works
            </button>
          </>
        )}
      </div>

      {/* What you'll get */}
      <div className="w-full max-w-md mt-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What you&apos;ll get</p>
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
          {[
            { label: "Barriers", desc: "What stops users", color: "bg-rose-50 text-rose-600 dark:text-rose-400 border border-rose-200" },
            { label: "Motivators", desc: "What drives users", color: "bg-emerald-50 text-emerald-600 dark:text-emerald-400 border border-emerald-200" },
            { label: "Interventions", desc: "How to change behaviour", color: "bg-sky-50 text-sky-600 dark:text-sky-400 border border-sky-200" },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl p-3 text-center ${item.color}`}>
              <p className="text-xs font-bold">{item.label}</p>
              <p className="text-[10px] opacity-80 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PROGRESS_STEPS = [
  { trigger: 0, label: "Sending data to Claude…", icon: "upload" },
  { trigger: 50, label: "Reading and understanding your text…", icon: "read" },
  { trigger: 200, label: "Identifying key behaviours…", icon: "search" },
  { trigger: 500, label: "Mapping to COM-B framework…", icon: "map" },
  { trigger: 1200, label: "Analysing barriers & motivators…", icon: "analyse" },
  { trigger: 2500, label: "Designing intervention opportunities…", icon: "design" },
  { trigger: 4000, label: "Assessing confidence & finalising…", icon: "check" },
];

function StreamingState({ text, onCancel }: { text: string; onCancel?: () => void }) {
  const charCount = text.length;
  const currentStep = PROGRESS_STEPS.reduce(
    (best, step) => (charCount >= step.trigger ? step : best),
    PROGRESS_STEPS[0]
  );
  const stepIndex = PROGRESS_STEPS.indexOf(currentStep);
  const progressPct = Math.min(95, Math.round((stepIndex / (PROGRESS_STEPS.length - 1)) * 100));

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-full">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-medium text-brand-700">Analysing with Claude Opus 4.6…</span>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2 mb-4">
        {PROGRESS_STEPS.map((step, i) => {
          const isDone = i < stepIndex;
          const isCurrent = i === stepIndex;
          return (
            <div
              key={step.trigger}
              className={`flex items-center gap-2.5 text-sm transition-all duration-300 ${
                isDone ? "text-emerald-600" : isCurrent ? "text-brand-700 font-medium" : "text-gray-300"
              }`}
            >
              {isDone ? (
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : isCurrent ? (
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
                </div>
              ) : (
                <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                </div>
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 text-center">
        Applying COM-B framework · BCW taxonomy · Identifying patterns…
      </p>
    </div>
  );
}

export default function AnalysisResults({ state, inputText, usage, onCancel, onReanalyse, initialReviewStatus, initialReviewNotes, onSwitchMode, onOpenGuide }: AnalysisResultsProps) {
  // Corrections state: key = "section:index"
  const [corrections, setCorrections] = useState<Map<string, Correction>>(new Map());

  // Source inspector
  const [inspectQuote, setInspectQuote] = useState<string | null>(null);

  // Low-confidence gate
  const [gateAcknowledged, setGateAcknowledged] = useState(false);
  const prevStatusRef = useRef<string>("");

  // Plain language mode
  const { isPlainMode } = usePlainMode();

  // Load existing corrections when a saved analysis is loaded
  useEffect(() => {
    if (!state.savedId || state.status !== "complete") return;
    fetch(`/api/analyses/${state.savedId}/corrections`)
      .then((r) => r.json())
      .then((data: { corrections?: { section: string; itemIndex: number; status: string; note?: string }[] }) => {
        if (!data.corrections) return;
        const map = new Map<string, Correction>();
        for (const c of data.corrections) {
          map.set(`${c.section}:${c.itemIndex}`, {
            status: c.status as CorrectionStatus,
            note: c.note ?? undefined,
          });
        }
        setCorrections(map);
      })
      .catch(() => {});
  }, [state.savedId, state.status]);

  // Reset corrections + gate when a new analysis starts
  useEffect(() => {
    if (state.status === "streaming" && prevStatusRef.current !== "streaming") {
      setCorrections(new Map());
      setGateAcknowledged(false);
    }
    prevStatusRef.current = state.status;
  }, [state.status]);

  const handleCorrect = useCallback(
    async (section: string, index: number, status: string, note?: string) => {
      if (!state.savedId) return;
      try {
        const res = await fetch(`/api/analyses/${state.savedId}/corrections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, itemIndex: index, status, note, actor: getActor() }),
        });
        if (res.ok) {
          setCorrections((prev) => {
            const next = new Map(prev);
            next.set(`${section}:${index}`, { status: status as CorrectionStatus, note });
            return next;
          });
        }
      } catch { /* silent */ }
    },
    [state.savedId]
  );

  if (state.status === "idle") return <EmptyState onSwitchMode={onSwitchMode} onOpenGuide={onOpenGuide} />;
  if (state.status === "streaming") return <StreamingState text={state.streamingText} onCancel={onCancel} />;

  if (state.status === "error") {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-medium text-red-700 mb-1">Analysis failed</p>
          <p className="text-xs text-red-600">{state.error}</p>
        </div>
      </div>
    );
  }

  const { analysis } = state;
  if (!analysis) return null;

  // Grounding — computed once per analysis+inputText
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const groundingReport = useMemo(
    () => (inputText ? groundAnalysis(analysis, inputText) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analysis, inputText]
  );
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const groundingMap = useMemo(
    () => (groundingReport ? buildGroundingMap(groundingReport) : undefined),
    [groundingReport]
  );

  // Validity scores for interventions
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const validityScores = useMemo(
    () => scoreAllInterventions(analysis.intervention_opportunities ?? []),
    [analysis.intervention_opportunities]
  );

  // Rubric score
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rubricResult = useMemo(() => {
    if (!groundingReport) return null;
    const avgValidity = validityScores.length > 0
      ? validityScores.reduce((s, r) => s + r.score, 0) / validityScores.length
      : null;
    return scoreRubric(analysis, groundingReport.score, avgValidity);
  }, [analysis, groundingReport, validityScores]);

  const hasCorrections = !!state.savedId;

  // Low-confidence gate check
  const needsGate =
    analysis.confidence?.overall === "low" || (analysis.text_units_analysed ?? 0) < 5;

  if (needsGate && !gateAcknowledged) {
    return (
      <LowConfidenceGate
        confidence={analysis.confidence}
        textUnits={analysis.text_units_analysed ?? 0}
        onAcknowledge={() => setGateAcknowledged(true)}
        onBack={() => {/* stay on gate — user dismisses by re-running */}}
      />
    );
  }

  // Build section navigator definitions
  const sectionDefs: SectionDef[] = [
    { id: "quality", label: "Quality", phase: "diagnosis", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: "comb", label: "COM-B", phase: "diagnosis", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z" /></svg> },
    { id: "behaviours", label: "Behaviours", phase: "diagnosis", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: "barriers", label: "Barriers", phase: "diagnosis", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
    { id: "motivators", label: "Motivators", phase: "diagnosis", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg> },
    { id: "interventions", label: "Interventions", phase: "action", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
    ...(analysis.subgroup_insights?.length ? [{ id: "segments", label: "Segments", phase: "action" as const, icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> }] : []),
    { id: "confidence", label: "Confidence", phase: "review", icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    ...(state.savedId ? [{ id: "review", label: "Review", phase: "review" as const, icon: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> }] : []),
  ];

  const sectionIds = sectionDefs.map((s) => s.id);

  return (
    <ResultsLayout sectionDefs={sectionDefs} sectionIds={sectionIds}>
      {/* Source inspector modal */}
      {inspectQuote && (
        <SourceInspector
          quote={inspectQuote}
          inputText={inputText}
          onClose={() => setInspectQuote(null)}
        />
      )}

      {/* Header + Review banner (promoted from bottom) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-xs font-semibold text-emerald-700">Analysis complete</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{analysis.data_type_detected}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{analysis.text_units_analysed} units analysed</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.savedId && <ShareButton analysisId={state.savedId} />}
          <ExportButton
            analysis={analysis}
            inputText={inputText}
            corrections={corrections}
            reviewStatus={initialReviewStatus}
            reviewNotes={initialReviewNotes}
          />
        </div>
      </div>

      {/* At-a-glance summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Barriers", count: analysis.barriers?.length ?? 0, color: "text-rose-600 bg-rose-50 border-rose-200" },
          { label: "Motivators", count: analysis.motivators?.length ?? 0, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Interventions", count: analysis.intervention_opportunities?.length ?? 0, color: "text-brand-600 bg-brand-50 border-brand-200" },
          { label: "Confidence", count: null as number | null, color: `${analysis.confidence?.overall === "high" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : analysis.confidence?.overall === "medium" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-rose-600 bg-rose-50 border-rose-200"}` },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 text-center ${item.color}`}>
            <p className="text-lg font-bold leading-none">{item.count !== null ? item.count : (analysis.confidence?.overall ?? "—")}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide mt-1 opacity-70">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Truncation warning */}
      {state.truncated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Analysis was truncated</p>
            <p className="text-xs text-amber-600 mt-0.5">The output hit the token limit and may be incomplete. Consider splitting your input into smaller sections for a more thorough analysis.</p>
          </div>
        </div>
      )}

      {/* Trust banner */}
      <TrustBanner />

      {/* Review progress indicator */}
      {hasCorrections && (() => {
        const totalItems =
          (analysis.key_behaviours?.length ?? 0) +
          (analysis.barriers?.length ?? 0) +
          (analysis.motivators?.length ?? 0) +
          (analysis.intervention_opportunities?.length ?? 0);
        const reviewedItems = corrections.size;
        if (totalItems === 0) return null;
        const pct = Math.round((reviewedItems / totalItems) * 100);
        return (
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  Validation progress
                </span>
                <span className="text-xs text-gray-400">
                  {reviewedItems}/{totalItems} findings reviewed
                </span>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-brand-500" : "bg-amber-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {pct === 100 && (
              <span className="text-xs font-semibold text-emerald-600 shrink-0">Complete</span>
            )}
          </div>
        );
      })()}

      {/* Competitor profile — only shown when company_model is present */}
      {analysis.company_model && (
        <CompetitorProfilePanel model={analysis.company_model} />
      )}

      {/* ─── PHASE: Diagnosis ─── */}
      <div className="flex items-center gap-2 pt-2">
        <span className="w-2 h-2 rounded-full bg-brand-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-brand-600">Diagnosis</span>
        <div className="flex-1 h-px bg-brand-100" />
      </div>

      {/* Quality & Evidence */}
      <div id="section-quality">
        {groundingReport && groundingReport.total > 0 && (
          <GroundingPanel report={groundingReport} />
        )}
        {rubricResult && <div className="mt-4"><RubricPanel result={rubricResult} /></div>}
      </div>

      {/* Behavioural context — collapsed by default */}
      <CollapsibleSection title="Behavioural Context" count={
        (analysis.behavioural_context?.triggers?.length ?? 0) +
        (analysis.behavioural_context?.temporal_pattern ? 1 : 0)
      }>
        <BehaviouralContextPanel context={analysis.behavioural_context} />
      </CollapsibleSection>

      {/* COM-B */}
      <div id="section-comb" className="space-y-4">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-sm font-semibold text-gray-700">COM-B Mapping</span>
          <SectionExplainer text="COM-B maps behaviours to Capability, Opportunity, and Motivation — the three things that must be present for any behaviour to occur. This chart shows how strongly each dimension features in your data." />
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
          <ComBChart mapping={analysis.com_b_mapping} />
        </div>
        <ComBSection mapping={analysis.com_b_mapping} isPlainMode={isPlainMode} />
      </div>

      {/* Key Behaviours */}
      <div id="section-behaviours">
        <KeyBehaviours
          behaviours={analysis.key_behaviours}
          groundingMap={groundingMap}
          corrections={corrections}
          onCorrect={hasCorrections ? handleCorrect : undefined}
          onInspect={inputText ? setInspectQuote : undefined}
        />
      </div>

      {/* Barriers */}
      <div id="section-barriers">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm font-semibold text-gray-700">Barriers</span>
          <SectionExplainer text="Barriers are factors preventing your target audience from performing the desired behaviour. Each is mapped to a COM-B dimension so you can identify the right intervention type." />
        </div>
        <BarriersList
          barriers={analysis.barriers}
          groundingMap={groundingMap}
          corrections={corrections}
          onCorrect={hasCorrections ? handleCorrect : undefined}
          onInspect={inputText ? setInspectQuote : undefined}
          isPlainMode={isPlainMode}
        />
        <AnalystAnnotations sectionKey="barriers" analysisId={state.savedId} />
      </div>

      {/* Motivators */}
      <div id="section-motivators">
        <MotivatorsList
          motivators={analysis.motivators}
          groundingMap={groundingMap}
          corrections={corrections}
          onCorrect={hasCorrections ? handleCorrect : undefined}
          onInspect={inputText ? setInspectQuote : undefined}
          isPlainMode={isPlainMode}
        />
        <AnalystAnnotations sectionKey="motivators" analysisId={state.savedId} />
      </div>

      {/* Facilitators — collapsed by default */}
      <CollapsibleSection title="Facilitators" count={analysis.facilitators?.length ?? 0}>
        <FacilitatorsSection facilitators={analysis.facilitators} />
        <AnalystAnnotations sectionKey="facilitators" analysisId={state.savedId} />
      </CollapsibleSection>

      {/* Contradictions — collapsed by default */}
      <CollapsibleSection title="Contradictions" count={analysis.contradictions?.length ?? 0}>
        <ContradictionsSection contradictions={analysis.contradictions ?? []} />
      </CollapsibleSection>

      {/* ─── PHASE: Action ─── */}
      <div className="flex items-center gap-2 pt-4">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Action</span>
        <div className="flex-1 h-px bg-emerald-100" />
      </div>

      {/* Interventions */}
      <div id="section-interventions">
        <div className="flex items-center gap-1 mb-2">
          <span className="text-sm font-semibold text-gray-700">Interventions</span>
          <SectionExplainer text="Evidence-based strategies from the Behaviour Change Wheel (BCW) and Behaviour Change Techniques (BCT) taxonomy to address the barriers identified above." />
        </div>
        <InterventionsSection
          interventions={analysis.intervention_opportunities}
          validityScores={validityScores}
          corrections={corrections}
          onCorrect={hasCorrections ? handleCorrect : undefined}
          onInspect={inputText ? setInspectQuote : undefined}
          isPlainMode={isPlainMode}
        />
      </div>

      {/* Subgroup Insights & Personas */}
      {(analysis.subgroup_insights?.length ?? 0) > 0 && (
        <div id="section-segments" className="space-y-6">
          <SubgroupInsights insights={analysis.subgroup_insights ?? []} />
          <PersonaCards
            insights={analysis.subgroup_insights}
            barriers={analysis.barriers}
            motivators={analysis.motivators}
          />
        </div>
      )}

      {/* ─── PHASE: Review ─── */}
      <div className="flex items-center gap-2 pt-4">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Review</span>
        <div className="flex-1 h-px bg-amber-100" />
      </div>

      {/* Confidence */}
      <div id="section-confidence">
        <ConfidencePanel
          confidence={analysis.confidence}
          recommendedResearch={analysis.recommended_next_research}
          usage={usage}
          durationMs={state.durationMs}
          clarificationNote={analysis.clarification_note}
        />
      </div>

      {/* Analyst Review */}
      {state.savedId && (
        <div id="section-review">
          <ReviewPanel
            analysisId={state.savedId}
            initialStatus={initialReviewStatus as "pending" | "approved" | "disputed" | "archived" | undefined}
            initialNotes={initialReviewNotes}
          />
        </div>
      )}

      {/* Re-analyse with corrections */}
      {onReanalyse && corrections.size > 0 && inputText.trim().length > 0 && (
        <div className="border-t border-gray-100 pt-6 mt-4">
          <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-brand-900 mb-1">Refine this analysis</p>
                <p className="text-xs text-brand-700 leading-relaxed mb-3">
                  You&apos;ve made {corrections.size} correction{corrections.size !== 1 ? "s" : ""}. Re-run the analysis with your feedback incorporated — disputed findings will be reconsidered, removed items excluded, and confirmed findings reinforced.
                </p>
                <button
                  onClick={() => {
                    const lines: string[] = [];
                    corrections.forEach((c, key) => {
                      const [section, idx] = key.split(":");
                      if (c.status === "disputed") {
                        lines.push(`DISPUTED: ${section} #${Number(idx) + 1}${c.note ? ` — "${c.note}"` : ""}`);
                      } else if (c.status === "removed") {
                        lines.push(`REMOVE: ${section} #${Number(idx) + 1}`);
                      } else if (c.status === "confirmed") {
                        lines.push(`CONFIRMED: ${section} #${Number(idx) + 1}`);
                      }
                    });
                    onReanalyse(lines.join("\n"));
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Re-analyse with corrections
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contextual next-step prompts */}
      <div className="border-t border-gray-100 pt-6 mt-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">What to do next</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {state.savedId && (
            <a href={`/analysis/${state.savedId}`} className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl transition-colors group">
              <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Open full page</p>
                <p className="text-xs text-gray-400 mt-0.5">View, validate, and share this analysis</p>
              </div>
            </a>
          )}
          <a href={`/compare${state.savedId ? `?analysisId=${state.savedId}` : ""}`} className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl transition-colors group">
            <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Compare with another analysis</p>
              <p className="text-xs text-gray-400 mt-0.5">Diff COM-B profiles to spot competitive gaps</p>
            </div>
          </a>
          <a href="/monitoring" className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl transition-colors group">
            <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Track this competitor over time</p>
              <p className="text-xs text-gray-400 mt-0.5">Set up automated scraping on a schedule</p>
            </div>
          </a>
          <a href="/eval" className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-brand-50 border border-gray-200 hover:border-brand-200 rounded-xl transition-colors group">
            <div className="w-8 h-8 bg-white rounded-lg border border-gray-200 group-hover:border-brand-200 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-gray-400 group-hover:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-brand-700">Check analysis quality</p>
              <p className="text-xs text-gray-400 mt-0.5">Score against rubric and validate rigour</p>
            </div>
          </a>
        </div>
      </div>
    </ResultsLayout>
  );
}

/** Wrapper that provides the section navigator and scroll tracking */
function ResultsLayout({ sectionDefs, sectionIds, children }: { sectionDefs: SectionDef[]; sectionIds: string[]; children: React.ReactNode }) {
  const activeId = useActiveSection(sectionIds);

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      <SectionNav sections={sectionDefs} activeId={activeId} />
      {children}
    </div>
  );
}

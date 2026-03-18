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

interface AnalysisResultsProps {
  state: AnalysisState;
  inputText: string;
  usage?: { inputTokens: number; outputTokens: number };
  onCancel?: () => void;
}

function getActor() {
  if (typeof window === "undefined") return "analyst";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center px-8">
      <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">Collect data to get started</h3>
      <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
        Scrape URLs, pull social signals, or run a digital footprint scan. Once you have sources, run the behavioural analysis to see COM-B mapping, barriers, and interventions.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-sm">
        {[
          { label: "Scrape", icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" },
          { label: "Listen", icon: "M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" },
          { label: "Analyse", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" },
        ].map((item, i) => (
          <div key={item.label} className={`rounded-xl p-3 text-center border ${
            i === 0 ? "bg-brand-50 border-brand-200" : "bg-surface-50 border-gray-100"
          }`}>
            <svg className={`w-4 h-4 mx-auto mb-1.5 ${i === 0 ? "text-brand-500" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            <p className={`text-xs font-semibold ${i === 0 ? "text-brand-600" : "text-gray-400"}`}>{item.label}</p>
          </div>
        ))}
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
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-full">
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

export default function AnalysisResults({ state, inputText, usage, onCancel }: AnalysisResultsProps) {
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

  if (state.status === "idle") return <EmptyState />;
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

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Source inspector modal */}
      {inspectQuote && (
        <SourceInspector
          quote={inspectQuote}
          inputText={inputText}
          onClose={() => setInspectQuote(null)}
        />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-xs font-semibold text-emerald-700">Analysis complete</span>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">{analysis.data_type_detected}</span>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{analysis.text_units_analysed} units</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{analysis.summary}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {state.savedId && <ShareButton analysisId={state.savedId} />}
          <ExportButton analysis={analysis} inputText={inputText} />
        </div>
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

      {/* Competitor profile — only shown when company_model is present */}
      {analysis.company_model && (
        <CompetitorProfilePanel model={analysis.company_model} />
      )}

      {/* Evidence Grounding report */}
      {groundingReport && groundingReport.total > 0 && (
        <GroundingPanel report={groundingReport} />
      )}

      {/* Evaluation rubric score */}
      {rubricResult && <RubricPanel result={rubricResult} />}

      {/* Behavioural context */}
      <BehaviouralContextPanel context={analysis.behavioural_context} />

      {/* COM-B Chart */}
      <div className="bg-surface-50 rounded-xl border border-gray-100 px-5 py-4">
        <ComBChart mapping={analysis.com_b_mapping} />
      </div>

      {/* COM-B Detail */}
      <ComBSection mapping={analysis.com_b_mapping} isPlainMode={isPlainMode} />

      {/* Key Behaviours */}
      <KeyBehaviours
        behaviours={analysis.key_behaviours}
        groundingMap={groundingMap}
        corrections={corrections}
        onCorrect={hasCorrections ? handleCorrect : undefined}
        onInspect={inputText ? setInspectQuote : undefined}
      />

      {/* Barriers & Motivators */}
      <BarriersList
        barriers={analysis.barriers}
        groundingMap={groundingMap}
        corrections={corrections}
        onCorrect={hasCorrections ? handleCorrect : undefined}
        onInspect={inputText ? setInspectQuote : undefined}
        isPlainMode={isPlainMode}
      />
      <AnalystAnnotations sectionKey="barriers" analysisId={state.savedId} />
      <MotivatorsList
        motivators={analysis.motivators}
        groundingMap={groundingMap}
        corrections={corrections}
        onCorrect={hasCorrections ? handleCorrect : undefined}
        onInspect={inputText ? setInspectQuote : undefined}
        isPlainMode={isPlainMode}
      />
      <AnalystAnnotations sectionKey="motivators" analysisId={state.savedId} />

      {/* Facilitators */}
      <FacilitatorsSection facilitators={analysis.facilitators} />
      <AnalystAnnotations sectionKey="facilitators" analysisId={state.savedId} />

      {/* Interventions */}
      <InterventionsSection
        interventions={analysis.intervention_opportunities}
        validityScores={validityScores}
        corrections={corrections}
        onCorrect={hasCorrections ? handleCorrect : undefined}
        onInspect={inputText ? setInspectQuote : undefined}
        isPlainMode={isPlainMode}
      />

      {/* Contradictions */}
      <ContradictionsSection contradictions={analysis.contradictions ?? []} />

      {/* Subgroup Insights */}
      <SubgroupInsights insights={analysis.subgroup_insights ?? []} />

      {/* Persona Cards */}
      {(analysis.subgroup_insights?.length ?? 0) > 0 && (
        <PersonaCards
          insights={analysis.subgroup_insights}
          barriers={analysis.barriers}
          motivators={analysis.motivators}
        />
      )}

      {/* Confidence */}
      <ConfidencePanel
        confidence={analysis.confidence}
        recommendedResearch={analysis.recommended_next_research}
        usage={usage}
        durationMs={state.durationMs}
        clarificationNote={analysis.clarification_note}
      />

      {/* Analyst Review */}
      {state.savedId && (
        <ReviewPanel analysisId={state.savedId} />
      )}
    </div>
  );
}

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
import { scoreRubric } from "@/lib/rubric";
import { usePlainMode } from "./PlainModeToggle";

interface AnalysisResultsProps {
  state: AnalysisState;
  inputText: string;
  usage?: { inputTokens: number; outputTokens: number };
}

function getActor() {
  if (typeof window === "undefined") return "analyst";
  return localStorage.getItem("scrapecore-user") ?? "analyst";
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 text-center px-8">
      <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">Ready to analyse</h3>
      <p className="text-sm text-gray-400 max-w-sm leading-relaxed">
        Paste qualitative text on the left and run the analysis. Results will include COM-B mapping, barriers, motivators, and intervention recommendations.
      </p>
      <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-sm">
        {["Capability", "Opportunity", "Motivation"].map((label, i) => (
          <div key={label} className={`rounded-lg p-3 text-center ${["bg-violet-50", "bg-sky-50", "bg-amber-50"][i]}`}>
            <p className={`text-xs font-semibold ${["text-violet-600", "text-sky-600", "text-amber-600"][i]}`}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StreamingState({ text }: { text: string }) {
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-full">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-medium text-brand-700">Analysing with Claude Opus 4.6…</span>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-96 overflow-y-auto scrollbar-thin">
        <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
          {text || "Thinking…"}
        </pre>
      </div>
      <p className="mt-3 text-xs text-gray-400 text-center">
        Applying COM-B framework · BCW taxonomy · Identifying patterns…
      </p>
    </div>
  );
}

export default function AnalysisResults({ state, inputText, usage }: AnalysisResultsProps) {
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
  if (state.status === "streaming") return <StreamingState text={state.streamingText} />;

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
        <ExportButton analysis={analysis} inputText={inputText} />
      </div>

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
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
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

"use client";

import type { AnalysisState } from "@/lib/types";
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

interface AnalysisResultsProps {
  state: AnalysisState;
  inputText: string;
  usage?: { inputTokens: number; outputTokens: number };
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
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse" />
          <span className="text-sm font-medium text-gray-700">Analysing with Claude Opus…</span>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-96 overflow-y-auto">
        <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
          {text || "Thinking…"}
        </pre>
      </div>
      <p className="mt-3 text-xs text-gray-400 text-center">
        Applying COM-B framework, identifying barriers and motivators…
      </p>
    </div>
  );
}

export default function AnalysisResults({ state, inputText, usage }: AnalysisResultsProps) {
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

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-xs font-medium text-emerald-600">Analysis complete</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{analysis.summary}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-gray-400">{analysis.data_type_detected}</span>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-400">{analysis.text_units_analysed} text units</span>
          </div>
        </div>
        <ExportButton analysis={analysis} inputText={inputText} />
      </div>

      {/* COM-B Chart */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
        <ComBChart mapping={analysis.com_b_mapping} />
      </div>

      {/* COM-B Detail */}
      <ComBSection mapping={analysis.com_b_mapping} />

      {/* Key Behaviours */}
      <KeyBehaviours behaviours={analysis.key_behaviours} />

      {/* Barriers & Motivators */}
      <BarriersList barriers={analysis.barriers} />
      <MotivatorsList motivators={analysis.motivators} />

      {/* Interventions */}
      <InterventionsSection interventions={analysis.intervention_opportunities} />

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
      />
    </div>
  );
}

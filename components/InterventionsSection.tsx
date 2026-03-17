"use client";

import { useState } from "react";
import type { InterventionOpportunity } from "@/lib/types";
import type { ValidityResult } from "@/lib/validity";
import type { Correction } from "./CorrectionControls";
import ConfidenceBadge from "./ConfidenceBadge";
import ValidityScore from "./ValidityScore";
import CorrectionControls from "./CorrectionControls";
import { describeBCT } from "@/lib/bctDescriptions";
import { plainify } from "@/lib/plainLanguage";

interface InterventionsSectionProps {
  interventions: InterventionOpportunity[];
  validityScores?: ValidityResult[];
  corrections?: Map<string, Correction>;
  onCorrect?: (section: string, index: number, status: string, note?: string) => Promise<void>;
  isPlainMode?: boolean;
}

const BCW_COLORS: Record<string, { pill: string; dot: string }> = {
  Education:                    { pill: "bg-blue-50 text-blue-700 border border-blue-100",          dot: "bg-blue-500" },
  Persuasion:                   { pill: "bg-purple-50 text-purple-700 border border-purple-100",     dot: "bg-purple-500" },
  Incentivisation:              { pill: "bg-amber-50 text-amber-700 border border-amber-100",        dot: "bg-amber-500" },
  Coercion:                     { pill: "bg-red-50 text-red-700 border border-red-100",              dot: "bg-red-500" },
  Training:                     { pill: "bg-violet-50 text-violet-700 border border-violet-100",     dot: "bg-violet-500" },
  Restriction:                  { pill: "bg-orange-50 text-orange-700 border border-orange-100",     dot: "bg-orange-500" },
  "Environmental restructuring":{ pill: "bg-teal-50 text-teal-700 border border-teal-100",          dot: "bg-teal-500" },
  Modelling:                    { pill: "bg-indigo-50 text-indigo-700 border border-indigo-100",     dot: "bg-indigo-500" },
  Enablement:                   { pill: "bg-emerald-50 text-emerald-700 border border-emerald-100",  dot: "bg-emerald-500" },
};

const FALLBACK_COLOR = { pill: "bg-gray-100 text-gray-600 border border-gray-200", dot: "bg-gray-400" };

function ReasoningPanel({ item }: { item: InterventionOpportunity }) {
  const hasBCTs     = (item.bct_specifics?.length ?? 0) > 0;
  const hasEvidence = (item.source_evidence?.length ?? 0) > 0;

  return (
    <div className="mx-4 mb-3 border border-brand-100 bg-brand-50/40 rounded-xl p-4 space-y-4">
      <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Reasoning chain</p>

      {/* COM-B target */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1.5">Addresses COM-B gap</p>
        <span className="text-xs bg-white border border-brand-200 text-brand-700 px-2.5 py-1 rounded-full font-medium">
          {item.target_com_b}
        </span>
      </div>

      {/* BCT specifics with plain-language descriptions */}
      {hasBCTs && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Why these behaviour change techniques?</p>
          <div className="space-y-2">
            {item.bct_specifics.map((bct, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-lg px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-700 mb-0.5">{bct}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{describeBCT(bct)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source evidence from input */}
      {hasEvidence && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Evidence from input that motivated this</p>
          <div className="space-y-1.5">
            {item.source_evidence!.map((quote, i) => (
              <blockquote key={i} className="pl-3 border-l-2 border-brand-300">
                <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{quote}&rdquo;</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {!hasBCTs && !hasEvidence && (
        <p className="text-xs text-gray-400 italic">No additional reasoning data available for this intervention.</p>
      )}
    </div>
  );
}

export default function InterventionsSection({ interventions, validityScores, corrections, onCorrect, isPlainMode }: InterventionsSectionProps) {
  const [expandedReasoning, setExpandedReasoning] = useState<Set<number>>(new Set());

  if (!interventions.length) return null;

  const toggleReasoning = (i: number) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">Intervention Opportunities</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{interventions.length} ranked</span>
      </div>

      <div className="space-y-3">
        {interventions.map((item, i) => {
          const colors       = BCW_COLORS[item.bcw_category] ?? FALLBACK_COLOR;
          const validity     = validityScores?.[i];
          const correction   = corrections?.get(`interventions:${i}`);
          const removed      = correction?.status === "removed";
          const disputed     = correction?.status === "disputed";
          const reasoningOpen = expandedReasoning.has(i);

          return (
            <div key={i} className={`border rounded-xl bg-white hover:shadow-sm transition-all animate-fade-in-up overflow-hidden ${
              removed ? "opacity-40" : disputed ? "border-amber-300" : "border-gray-200"
            }`}>
              {/* Header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${removed ? "bg-gray-300" : "bg-gray-900"}`}>
                  <span className="text-xs font-bold text-white leading-none">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm font-semibold leading-snug ${removed ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {item.intervention}
                    </p>
                    <ConfidenceBadge level={item.priority} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${colors.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {plainify(item.bcw_category, isPlainMode ?? false)}
                    </span>
                    <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-xs text-gray-500 font-medium">{item.target_com_b}</span>
                  </div>
                </div>
              </div>

              {!removed && (
                <>
                  {/* Rationale */}
                  {item.rationale && (
                    <div className="px-4 pb-3">
                      <p className="text-xs text-gray-500 leading-relaxed">{item.rationale}</p>
                    </div>
                  )}

                  {/* BCT chips */}
                  {(item.bct_specifics?.length ?? 0) > 0 && (
                    <div className="px-4 pb-3">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">BCT techniques</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.bct_specifics.map((bct, bi) => (
                          <span key={bi} className="text-xs bg-brand-50 text-brand-700 border border-brand-100 px-2 py-0.5 rounded-full font-medium">
                            {bct}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Implementation guidance */}
                  {item.implementation_guidance && (
                    <div className="mx-4 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start gap-2">
                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-xs text-gray-600 leading-relaxed">{item.implementation_guidance}</p>
                      </div>
                    </div>
                  )}

                  {/* Show Reasoning toggle */}
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => toggleReasoning(i)}
                      className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-medium transition-colors"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${reasoningOpen ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {reasoningOpen ? "Hide reasoning" : "Show reasoning"}
                    </button>
                  </div>

                  {/* Expandable reasoning panel */}
                  {reasoningOpen && <ReasoningPanel item={item} />}
                </>
              )}

              {/* Validity score */}
              {validity && !removed && (
                <div className="px-4 pb-3">
                  <ValidityScore result={validity} />
                </div>
              )}

              {/* Correction controls */}
              {onCorrect && (
                <div className="px-4 pb-4">
                  <CorrectionControls
                    correction={correction}
                    onSave={(status, note) => onCorrect("interventions", i, status, note)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

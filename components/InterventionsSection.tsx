import type { InterventionOpportunity } from "@/lib/types";
import type { ValidityResult } from "@/lib/validity";
import type { Correction } from "./CorrectionControls";
import ConfidenceBadge from "./ConfidenceBadge";
import ValidityScore from "./ValidityScore";
import CorrectionControls from "./CorrectionControls";

interface InterventionsSectionProps {
  interventions: InterventionOpportunity[];
  validityScores?: ValidityResult[];
  corrections?: Map<string, Correction>;
  onCorrect?: (section: string, index: number, status: string, note?: string) => Promise<void>;
}

const BCW_COLORS: Record<string, { pill: string; dot: string }> = {
  Education:                    { pill: "bg-blue-50 text-blue-700 border border-blue-100",      dot: "bg-blue-500" },
  Persuasion:                   { pill: "bg-purple-50 text-purple-700 border border-purple-100", dot: "bg-purple-500" },
  Incentivisation:              { pill: "bg-amber-50 text-amber-700 border border-amber-100",   dot: "bg-amber-500" },
  Coercion:                     { pill: "bg-red-50 text-red-700 border border-red-100",          dot: "bg-red-500" },
  Training:                     { pill: "bg-violet-50 text-violet-700 border border-violet-100", dot: "bg-violet-500" },
  Restriction:                  { pill: "bg-orange-50 text-orange-700 border border-orange-100", dot: "bg-orange-500" },
  "Environmental restructuring":{ pill: "bg-teal-50 text-teal-700 border border-teal-100",      dot: "bg-teal-500" },
  Modelling:                    { pill: "bg-indigo-50 text-indigo-700 border border-indigo-100", dot: "bg-indigo-500" },
  Enablement:                   { pill: "bg-emerald-50 text-emerald-700 border border-emerald-100", dot: "bg-emerald-500" },
};

const FALLBACK_COLOR = { pill: "bg-gray-100 text-gray-600 border border-gray-200", dot: "bg-gray-400" };

export default function InterventionsSection({ interventions, validityScores, corrections, onCorrect }: InterventionsSectionProps) {
  if (!interventions.length) return null;

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
          const colors = BCW_COLORS[item.bcw_category] ?? FALLBACK_COLOR;
          const validity = validityScores?.[i];
          const correction = corrections?.get(`interventions:${i}`);
          const removed = correction?.status === "removed";
          const disputed = correction?.status === "disputed";

          return (
            <div key={i} className={`border rounded-xl bg-white hover:shadow-sm transition-all animate-fade-in-up overflow-hidden ${
              removed ? "opacity-40" : disputed ? "border-amber-300" : "border-gray-200"
            }`}>
              {/* Card header row */}
              <div className="flex items-start gap-3 p-4 pb-3">
                {/* Priority number badge */}
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
                  {/* BCW + target */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${colors.pill}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {item.bcw_category}
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

                  {/* BCT specifics */}
                  {item.bct_specifics?.length > 0 && (
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

"use client";

import type { BatchDoc } from "./BatchPanel";
import type { BehaviourAnalysis, ComBMapping } from "@/lib/types";

interface BatchCompareViewProps {
  docs: BatchDoc[];
  onClose: () => void;
}

const COM_B_COLORS: Record<string, string> = {
  capability: "bg-teal-500",
  opportunity: "bg-sky-500",
  motivation: "bg-amber-500",
};

function countComB(mapping: ComBMapping) {
  return {
    capability: mapping.capability.physical.length + mapping.capability.psychological.length,
    opportunity: mapping.opportunity.physical.length + mapping.opportunity.social.length,
    motivation: mapping.motivation.reflective.length + mapping.motivation.automatic.length,
  };
}

function ConfidenceDot({ level }: { level: string }) {
  const c = level === "high" ? "bg-emerald-500" : level === "medium" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${c} mr-1.5`} />;
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 w-5 text-right">{value}</span>
    </div>
  );
}

export default function BatchCompareView({ docs, onClose }: BatchCompareViewProps) {
  const completed = docs.filter((d) => d.state.status === "complete" && d.state.analysis);
  if (completed.length < 2) return null;

  const analyses = completed.map((d) => d.state.analysis as BehaviourAnalysis);
  const comBCounts = analyses.map((a) => countComB(a.com_b_mapping));

  // Compute maxes for relative bars
  const maxBarriers = Math.max(...analyses.map((a) => a.barriers?.length ?? 0), 1);
  const maxMotivators = Math.max(...analyses.map((a) => a.motivators?.length ?? 0), 1);
  const maxBehaviours = Math.max(...analyses.map((a) => a.key_behaviours?.length ?? 0), 1);
  const maxCap = Math.max(...comBCounts.map((c) => c.capability), 1);
  const maxOpp = Math.max(...comBCounts.map((c) => c.opportunity), 1);
  const maxMot = Math.max(...comBCounts.map((c) => c.motivation), 1);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-start justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Batch comparison</h2>
              <p className="text-xs text-gray-400 mt-0.5">{completed.length} documents analysed — COM-B signals side by side</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Comparison grid */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3 w-40">Metric</th>
                  {completed.map((doc) => (
                    <th key={doc.id} className="text-left px-4 py-3 min-w-48">
                      <p className="text-sm font-semibold text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-400 capitalize mt-0.5">{doc.dataType.replace("_", " ")}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {/* Confidence */}
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Confidence</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3">
                      <div className="flex items-center">
                        <ConfidenceDot level={a.confidence?.overall ?? "low"} />
                        <span className="text-sm capitalize">{a.confidence?.overall ?? "—"}</span>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Text units */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Units analysed</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3 text-sm text-gray-700">{a.text_units_analysed ?? "—"}</td>
                  ))}
                </tr>

                {/* COM-B Capability */}
                <tr className="bg-teal-50/40">
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium text-teal-700">Capability signals</span>
                  </td>
                  {comBCounts.map((c, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={c.capability} max={maxCap} color={COM_B_COLORS.capability} />
                    </td>
                  ))}
                </tr>

                {/* COM-B Opportunity */}
                <tr className="bg-sky-50/40">
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium text-sky-700">Opportunity signals</span>
                  </td>
                  {comBCounts.map((c, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={c.opportunity} max={maxOpp} color={COM_B_COLORS.opportunity} />
                    </td>
                  ))}
                </tr>

                {/* COM-B Motivation */}
                <tr className="bg-amber-50/40">
                  <td className="px-6 py-3">
                    <span className="text-xs font-medium text-amber-700">Motivation signals</span>
                  </td>
                  {comBCounts.map((c, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={c.motivation} max={maxMot} color={COM_B_COLORS.motivation} />
                    </td>
                  ))}
                </tr>

                {/* Barriers */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Barriers</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={a.barriers?.length ?? 0} max={maxBarriers} color="bg-red-400" />
                    </td>
                  ))}
                </tr>

                {/* Motivators */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Motivators</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={a.motivators?.length ?? 0} max={maxMotivators} color="bg-emerald-400" />
                    </td>
                  ))}
                </tr>

                {/* Key behaviours */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Key behaviours</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3">
                      <Bar value={a.key_behaviours?.length ?? 0} max={maxBehaviours} color="bg-brand-500" />
                    </td>
                  ))}
                </tr>

                {/* Interventions */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500">Interventions</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3 text-sm text-gray-700">{a.intervention_opportunities?.length ?? 0}</td>
                  ))}
                </tr>

                {/* Summary */}
                <tr className="bg-gray-50/50">
                  <td className="px-6 py-3 text-xs font-medium text-gray-500 align-top pt-4">Summary</td>
                  {analyses.map((a, i) => (
                    <td key={i} className="px-4 py-3">
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">{a.summary}</p>
                    </td>
                  ))}
                </tr>

                {/* Top barrier per doc */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500 align-top pt-4">Top barrier</td>
                  {analyses.map((a, i) => {
                    const top = a.barriers?.find((b) => b.severity === "high") ?? a.barriers?.[0];
                    return (
                      <td key={i} className="px-4 py-3">
                        {top ? (
                          <div>
                            <span className="inline-block text-xs font-medium text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full mb-1 capitalize">{top.severity}</span>
                            <p className="text-xs text-gray-700">{top.barrier}</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    );
                  })}
                </tr>

                {/* Top motivator per doc */}
                <tr>
                  <td className="px-6 py-3 text-xs font-medium text-gray-500 align-top pt-4">Top motivator</td>
                  {analyses.map((a, i) => {
                    const top = a.motivators?.find((m) => m.strength === "high") ?? a.motivators?.[0];
                    return (
                      <td key={i} className="px-4 py-3">
                        {top ? (
                          <div>
                            <span className="inline-block text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full mb-1 capitalize">{top.strength}</span>
                            <p className="text-xs text-gray-700">{top.motivator}</p>
                          </div>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

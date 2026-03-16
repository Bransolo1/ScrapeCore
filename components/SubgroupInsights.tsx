import type { SubgroupInsight } from "@/lib/types";
import EvidenceChip from "./EvidenceChip";

interface SubgroupInsightsProps {
  insights: SubgroupInsight[];
}

const COM_B_COLORS: Record<string, string> = {
  capability: "bg-violet-100 text-violet-700",
  opportunity: "bg-sky-100 text-sky-700",
  motivation: "bg-amber-100 text-amber-700",
};

export default function SubgroupInsights({ insights }: SubgroupInsightsProps) {
  if (!insights.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Subgroup Insights</h2>
        <span className="text-xs text-gray-400">{insights.length} identified</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((sg, i) => (
          <div key={i} className="border border-indigo-100 rounded-xl p-4 bg-indigo-50">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-sm font-semibold text-indigo-800">{sg.subgroup}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${COM_B_COLORS[sg.com_b_implication]}`}>
                {sg.com_b_implication}
              </span>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2">{sg.insight}</p>
            {sg.evidence.length > 0 && (
              <div className="space-y-1.5">
                {sg.evidence.slice(0, 2).map((q, qi) => (
                  <EvidenceChip key={qi} quote={q} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

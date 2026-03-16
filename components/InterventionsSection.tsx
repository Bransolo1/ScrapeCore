import type { InterventionOpportunity } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";

interface InterventionsSectionProps {
  interventions: InterventionOpportunity[];
}

const BCW_COLORS: Record<string, string> = {
  Education: "bg-blue-100 text-blue-700",
  Persuasion: "bg-purple-100 text-purple-700",
  Incentivisation: "bg-amber-100 text-amber-700",
  Coercion: "bg-red-100 text-red-700",
  Training: "bg-violet-100 text-violet-700",
  Restriction: "bg-orange-100 text-orange-700",
  "Environmental restructuring": "bg-teal-100 text-teal-700",
  Modelling: "bg-indigo-100 text-indigo-700",
  Enablement: "bg-emerald-100 text-emerald-700",
};

export default function InterventionsSection({ interventions }: InterventionsSectionProps) {
  if (!interventions.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-brand-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Intervention Opportunities</h2>
        <span className="text-xs text-gray-400">ranked by priority</span>
      </div>
      <div className="space-y-3">
        {interventions.map((item, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-xs font-bold text-gray-400 w-4 shrink-0">{i + 1}.</span>
                <p className="text-sm font-medium text-gray-800 leading-snug">{item.intervention}</p>
              </div>
              <ConfidenceBadge level={item.priority} />
            </div>
            <div className="ml-7 flex flex-wrap items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BCW_COLORS[item.bcw_category] ?? "bg-gray-100 text-gray-600"}`}>
                {item.bcw_category}
              </span>
              <span className="text-xs text-gray-400">→</span>
              <span className="text-xs text-gray-600">{item.target_com_b}</span>
            </div>
            <p className="ml-7 text-xs text-gray-500 leading-relaxed">{item.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

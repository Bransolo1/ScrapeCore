import type { KeyBehaviour } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";
import EvidenceChip from "./EvidenceChip";

interface KeyBehavioursProps {
  behaviours: KeyBehaviour[];
}

export default function KeyBehaviours({ behaviours }: KeyBehavioursProps) {
  if (!behaviours.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-semibold text-gray-900">Key Behaviours</h2>
        <span className="text-xs text-gray-400">{behaviours.length} identified</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {behaviours.map((b, i) => (
          <div key={i} className="border border-gray-200 rounded-xl p-4 bg-white">
            <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">{b.behaviour}</p>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Frequency</span>
                <ConfidenceBadge level={b.frequency} />
              </div>
              <span className="text-gray-200">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Importance</span>
                <ConfidenceBadge level={b.importance} />
              </div>
            </div>
            {b.evidence.length > 0 && (
              <div className="space-y-1.5">
                {b.evidence.slice(0, 1).map((q, qi) => (
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

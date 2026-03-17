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
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">Key Behaviours</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{behaviours.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {behaviours.map((b, i) => (
          <div key={i} className="relative border border-gray-200 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up">
            {/* Top accent stripe */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-brand-400" />
            <div className="pl-4 pr-4 pt-4 pb-4">
              <p className="text-sm font-semibold text-gray-800 mb-3 leading-snug">{b.behaviour}</p>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                  <span className="text-xs text-gray-500">Frequency</span>
                  <ConfidenceBadge level={b.frequency} />
                </div>
                <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1 border border-gray-100">
                  <span className="text-xs text-gray-500">Importance</span>
                  <ConfidenceBadge level={b.importance} />
                </div>
              </div>
              {b.source_text && (
                <blockquote className="mb-2.5 pl-3 border-l-2 border-brand-200">
                  <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">&ldquo;{b.source_text}&rdquo;</p>
                </blockquote>
              )}
              {b.evidence.length > 0 && (
                <div className="space-y-1.5">
                  {b.evidence.slice(0, 1).map((q, qi) => (
                    <EvidenceChip key={qi} quote={q} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

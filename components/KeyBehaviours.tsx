import type { KeyBehaviour } from "@/lib/types";
import type { GroundingItem } from "@/lib/grounding";
import type { Correction } from "./CorrectionControls";
import ConfidenceBadge from "./ConfidenceBadge";
import EvidenceChip from "./EvidenceChip";
import GroundingBadge from "./GroundingBadge";
import CorrectionControls from "./CorrectionControls";

interface KeyBehavioursProps {
  behaviours: KeyBehaviour[];
  groundingMap?: Map<string, GroundingItem>;
  corrections?: Map<string, Correction>;
  onCorrect?: (section: string, index: number, status: string, note?: string) => Promise<void>;
  onInspect?: (quote: string) => void;
}

export default function KeyBehaviours({ behaviours, groundingMap, corrections, onCorrect, onInspect }: KeyBehavioursProps) {
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
        {behaviours.map((b, i) => {
          const grounding = groundingMap?.get(`key_behaviours:${i}`);
          const correction = corrections?.get(`key_behaviours:${i}`);
          const removed = correction?.status === "removed";
          const disputed = correction?.status === "disputed";

          return (
            <div key={i} className={`relative border rounded-xl bg-white overflow-hidden hover:shadow-sm transition-all animate-fade-in-up ${
              removed ? "opacity-40" : disputed ? "border-amber-300" : "border-gray-200"
            }`}>
              <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${removed ? "bg-gray-300" : "bg-brand-400"}`} />
              <div className="pl-4 pr-4 pt-4 pb-4">
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <p className={`text-sm font-semibold leading-snug ${removed ? "line-through text-gray-400" : "text-gray-800"}`}>
                    {b.behaviour}
                  </p>
                  {grounding && <GroundingBadge level={grounding.level} compact />}
                </div>
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
                {b.source_text && !removed && (
                  <blockquote className="mb-1 pl-3 border-l-2 border-brand-200">
                    <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">&ldquo;{b.source_text}&rdquo;</p>
                  </blockquote>
                )}
                {b.source_text && !removed && onInspect && (
                  <button
                    onClick={() => onInspect(b.source_text)}
                    className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-700 transition-colors mb-2"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Inspect source
                  </button>
                )}
                {b.evidence.length > 0 && !removed && (
                  <div className="space-y-1.5 mb-2">
                    {b.evidence.slice(0, 1).map((q, qi) => <EvidenceChip key={qi} quote={q} />)}
                  </div>
                )}
                {onCorrect && (
                  <CorrectionControls
                    correction={correction}
                    onSave={(status, note) => onCorrect("key_behaviours", i, status, note)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

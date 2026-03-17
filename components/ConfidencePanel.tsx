import type { ConfidenceAssessment } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";

interface ConfidencePanelProps {
  confidence: ConfidenceAssessment;
  recommendedResearch: string[];
  usage?: { inputTokens: number; outputTokens: number };
  durationMs: number | null;
}

const CONFIDENCE_METER: Record<string, { width: string; color: string }> = {
  high:   { width: "w-full",  color: "bg-emerald-500" },
  medium: { width: "w-2/3",   color: "bg-amber-400" },
  low:    { width: "w-1/3",   color: "bg-rose-400" },
};

export default function ConfidencePanel({ confidence, recommendedResearch, usage, durationMs }: ConfidencePanelProps) {
  const meter = CONFIDENCE_METER[confidence.overall] ?? CONFIDENCE_METER.low;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Confidence card */}
      <div className="border border-gray-200 rounded-xl bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Evidence Confidence</h2>
            {confidence.sample_size_note && (
              <p className="text-xs text-gray-400 mt-0.5">{confidence.sample_size_note}</p>
            )}
          </div>
          <ConfidenceBadge level={confidence.overall} size="md" />
        </div>

        {/* Confidence meter */}
        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${meter.width} ${meter.color} rounded-full transition-all`} />
          </div>
        </div>

        {confidence.rationale && (
          <p className="text-xs font-medium text-gray-700 leading-relaxed mb-2">{confidence.rationale}</p>
        )}
        {confidence.notes && (
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{confidence.notes}</p>
        )}

        {confidence.limitations.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Limitations</p>
            <ul className="space-y-1.5">
              {confidence.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2">
                  <svg className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-gray-600 leading-relaxed">{lim}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Next research + stats card */}
      <div className="border border-gray-200 rounded-xl bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Recommended Next Research</h2>
        {recommendedResearch.length > 0 ? (
          <ul className="space-y-2.5">
            {recommendedResearch.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-brand-600">{i + 1}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{r}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No further research recommendations.</p>
        )}

        {/* Usage stats */}
        {(usage || durationMs) && (
          <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
            {durationMs && (
              <div className="text-center p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-base font-semibold text-gray-700">{(durationMs / 1000).toFixed(1)}s</p>
                <p className="text-xs text-gray-400 mt-0.5">duration</p>
              </div>
            )}
            {usage && (
              <div className="text-center p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-base font-semibold text-gray-700">{((usage.inputTokens + usage.outputTokens) / 1000).toFixed(1)}k</p>
                <p className="text-xs text-gray-400 mt-0.5">tokens used</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import type { ConfidenceAssessment } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";

interface ConfidencePanelProps {
  confidence: ConfidenceAssessment;
  recommendedResearch: string[];
  usage?: { inputTokens: number; outputTokens: number };
  durationMs: number | null;
}

export default function ConfidencePanel({ confidence, recommendedResearch, usage, durationMs }: ConfidencePanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Confidence */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Evidence Confidence</h2>
          <ConfidenceBadge level={confidence.overall} size="md" />
        </div>
        {confidence.rationale && (
          <p className="text-xs font-medium text-gray-700 leading-relaxed mb-2">{confidence.rationale}</p>
        )}
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{confidence.notes}</p>
        <p className="text-xs text-gray-500 mb-2">{confidence.sample_size_note}</p>
        {confidence.limitations.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-700 mb-1.5">Limitations</p>
            <ul className="space-y-1">
              {confidence.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">{lim}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Next research */}
      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Recommended Next Research</h2>
        {recommendedResearch.length > 0 ? (
          <ul className="space-y-2">
            {recommendedResearch.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-500 shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">{r}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">No further research recommendations.</p>
        )}

        {/* Usage stats */}
        {(usage || durationMs) && (
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-4">
            {durationMs && (
              <span className="text-xs text-gray-400">{(durationMs / 1000).toFixed(1)}s</span>
            )}
            {usage && (
              <span className="text-xs text-gray-400">
                {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

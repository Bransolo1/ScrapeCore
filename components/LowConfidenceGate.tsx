"use client";

import type { ConfidenceAssessment } from "@/lib/types";

interface Props {
  confidence: ConfidenceAssessment;
  textUnits: number;
  onAcknowledge: () => void;
  onBack: () => void;
}

export default function LowConfidenceGate({ confidence, textUnits, onAcknowledge, onBack }: Props) {
  const isTinyDataset = textUnits < 5;

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-96 animate-fade-in">
      {/* Warning icon */}
      <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">Low confidence analysis</h2>

      <p className="text-sm text-gray-500 text-center max-w-md leading-relaxed mb-5">
        {isTinyDataset
          ? `This analysis is based on only ${textUnits} text unit${textUnits !== 1 ? "s" : ""}. Findings may not be representative.`
          : "Claude rated this analysis as low confidence. Findings should be treated as preliminary."}
      </p>

      {/* Confidence rationale */}
      {confidence.rationale && (
        <div className="w-full max-w-md bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Why low confidence?</p>
          <p className="text-sm text-amber-800 leading-relaxed">{confidence.rationale}</p>
        </div>
      )}

      {/* Limitations list */}
      {confidence.limitations && confidence.limitations.length > 0 && (
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Known limitations</p>
          <ul className="space-y-1.5">
            {confidence.limitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                {lim}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sample size note */}
      {confidence.sample_size_note && (
        <p className="text-xs text-gray-400 text-center max-w-md mb-6 leading-relaxed">
          {confidence.sample_size_note}
        </p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full max-w-md sm:w-auto">
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
        >
          Go back
        </button>
        <button
          onClick={onAcknowledge}
          className="px-5 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors order-1 sm:order-2"
        >
          Show analysis
        </button>
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs mt-4 leading-relaxed">
        Expert review is required before any operational or policy use of low-confidence outputs.
      </p>
    </div>
  );
}

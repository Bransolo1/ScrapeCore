import type { ContradictoryFinding } from "@/lib/types";

interface ContradictionsSectionProps {
  contradictions: ContradictoryFinding[];
}

export default function ContradictionsSection({ contradictions }: ContradictionsSectionProps) {
  if (!contradictions.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Contradictions & Tensions</h2>
        <span className="text-xs text-gray-400">{contradictions.length} found</span>
      </div>
      <div className="space-y-3">
        {contradictions.map((c, i) => (
          <div key={i} className="border border-amber-100 rounded-xl p-4 bg-amber-50">
            <p className="text-sm font-medium text-gray-800 mb-3 leading-snug">{c.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Evidence A</p>
                <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{c.evidence_a}&rdquo;</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Evidence B</p>
                <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{c.evidence_b}&rdquo;</p>
              </div>
            </div>
            <div className="flex items-start gap-2 pt-2 border-t border-amber-100">
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-700 leading-relaxed">{c.interpretation}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

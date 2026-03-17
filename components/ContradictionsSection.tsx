import type { ContradictoryFinding } from "@/lib/types";

interface ContradictionsSectionProps {
  contradictions: ContradictoryFinding[];
}

export default function ContradictionsSection({ contradictions }: ContradictionsSectionProps) {
  if (!contradictions.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">Contradictions & Tensions</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{contradictions.length}</span>
      </div>
      <div className="space-y-3">
        {contradictions.map((c, i) => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up">
            {/* Description row */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-800 leading-snug">{c.description}</p>
            </div>

            {/* Evidence split */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-0 mx-4 mb-3">
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Evidence A</p>
                <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{c.evidence_a}&rdquo;</p>
              </div>
              <div className="hidden sm:flex items-center justify-center px-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-px h-5 bg-gray-200" />
                  <span className="text-xs font-bold text-gray-300">vs</span>
                  <div className="w-px h-5 bg-gray-200" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mt-2 sm:mt-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Evidence B</p>
                <p className="text-xs text-gray-600 italic leading-relaxed">&ldquo;{c.evidence_b}&rdquo;</p>
              </div>
            </div>

            {/* Interpretation */}
            <div className="mx-4 mb-4 flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
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

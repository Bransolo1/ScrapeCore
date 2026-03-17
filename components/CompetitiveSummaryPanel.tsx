"use client";

interface CompetitiveSummary {
  synthesis: string;
  opportunities: string[];
  watchouts: string[];
}

interface Props {
  summary: CompetitiveSummary;
  labelA: string;
  labelB: string;
}

export default function CompetitiveSummaryPanel({ summary, labelA, labelB }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-gray-700">Strategic opportunity analysis</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">AI-generated</span>
      </div>

      {/* One-liner synthesis */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Strategic dynamic</p>
        <p className="text-sm text-gray-800 leading-relaxed">{summary.synthesis}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Opportunities */}
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Opportunities for {labelA}
          </p>
          <ul className="space-y-2">
            {summary.opportunities.map((opp, i) => (
              <li key={i} className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                <span className="text-emerald-600 font-bold text-xs shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-gray-700 leading-snug">{opp}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Watchouts */}
        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Watchouts vs {labelB}
          </p>
          <ul className="space-y-2">
            {summary.watchouts.map((w, i) => (
              <li key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                <span className="text-sm text-gray-700 leading-snug">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-gray-400 leading-snug">
        Inferred from COM-B profiles of both analyses. Treat as strategic hypothesis, not confirmed intelligence. Expert review required.
      </p>
    </div>
  );
}

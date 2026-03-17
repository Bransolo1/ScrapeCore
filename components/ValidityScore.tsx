import type { ValidityResult } from "@/lib/validity";

interface ValidityScoreProps {
  result: ValidityResult;
}

const LEVEL_CONFIG = {
  excellent: { label: "Excellent", classes: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  good:      { label: "Good",      classes: "bg-blue-50 text-blue-700 border-blue-200",         bar: "bg-blue-500" },
  fair:      { label: "Fair",      classes: "bg-amber-50 text-amber-700 border-amber-200",       bar: "bg-amber-500" },
  weak:      { label: "Weak",      classes: "bg-rose-50 text-rose-700 border-rose-200",          bar: "bg-rose-500" },
};

export default function ValidityScore({ result }: ValidityScoreProps) {
  const cfg = LEVEL_CONFIG[result.level];
  const failing = result.checks.filter((c) => !c.passed);

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-2 py-0.5 ${cfg.classes}`}>
          <span className="font-bold">{result.score}/4</span>
          {cfg.label} validity
        </span>
        {/* 4-dot bar */}
        <div className="flex gap-0.5">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`w-3.5 h-1.5 rounded-full ${i < result.score ? cfg.bar : "bg-gray-200"}`}
            />
          ))}
        </div>
      </div>
      {failing.length > 0 && (
        <div className="space-y-1">
          {failing.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <svg className="w-3 h-3 text-gray-300 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-xs text-gray-400">{c.tip}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import type { RubricResult } from "@/lib/rubric";

const GRADE_CONFIG = {
  strong:          { label: "Strong",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  acceptable:      { label: "Acceptable",      cls: "bg-amber-50   text-amber-700   border-amber-200",   bar: "bg-amber-400"   },
  needs_revision:  { label: "Needs revision",  cls: "bg-red-50     text-red-700     border-red-200",     bar: "bg-red-500"     },
};

function ScoreDots({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-2 h-2 rounded-full ${
            n <= score
              ? score >= 4 ? "bg-emerald-500" : score >= 3 ? "bg-amber-400" : "bg-red-400"
              : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

interface Props {
  result: RubricResult;
}

export default function RubricPanel({ result }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = GRADE_CONFIG[result.grade];
  const pct = Math.round((result.total / 50) * 100);

  return (
    <section className={`border rounded-xl overflow-hidden ${cfg.cls.includes("emerald") ? "border-emerald-200" : cfg.cls.includes("amber") ? "border-amber-200" : "border-red-200"}`}>
      {/* Summary bar — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-500 font-medium">
              {result.total}/50 · Evaluation rubric
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dimension breakdown */}
      {open && (
        <div className="border-t border-gray-100 bg-white divide-y divide-gray-50">
          {result.dimensions.map((d, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs font-medium text-gray-600 flex-1 leading-snug">{d.name}</span>
              <ScoreDots score={d.score} />
              <span className="text-xs text-gray-400 w-5 text-right font-mono">{d.score}</span>
              <span className="text-xs text-gray-400 hidden sm:block w-64 truncate text-right">{d.rationale}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50">
            <span className="text-xs font-bold text-gray-700 flex-1">Total</span>
            <span className={`text-sm font-bold ${cfg.cls.split(" ")[1]}`}>{result.total} / 50</span>
          </div>
          <div className="px-4 py-2.5 text-xs text-gray-400 leading-snug">
            Rubric scores are deterministic structural checks — not semantic quality assessments. Scores below 4 indicate missing structured evidence, not necessarily weak analysis. Expert review always required.
          </div>
        </div>
      )}
    </section>
  );
}

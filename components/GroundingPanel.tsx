"use client";

import { useState } from "react";
import type { GroundingReport } from "@/lib/grounding";

interface GroundingPanelProps {
  report: GroundingReport;
}

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle cx="26" cy="26" r={r} stroke="#f3f4f6" strokeWidth="5" fill="none" />
      <circle
        cx="26" cy="26" r={r}
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeDasharray={`${fill} ${circ}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="700" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

const SECTION_LABELS: Record<string, string> = {
  key_behaviours: "Behaviour",
  barriers: "Barrier",
  motivators: "Motivator",
  intervention_opportunities: "Intervention",
  facilitators: "Facilitator",
  contradictions: "Contradiction",
};

function formatSection(raw: string, index: number): string {
  const label = SECTION_LABELS[raw] ?? raw.replace(/_/g, " ");
  return `${label} #${index + 1}`;
}

function GroundingItem({ item }: { item: { level: string; section: string; index: number; quote: string } }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = item.quote.length > 80;

  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`shrink-0 inline-flex items-center gap-1 text-xs border rounded-full px-1.5 py-0.5 font-semibold mt-0.5 ${
        item.level === "grounded" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
        item.level === "partial"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                                     "bg-rose-50 text-rose-700 border-rose-200"
      }`}>
        {item.level === "grounded" ? "\u2713" : item.level === "partial" ? "~" : "!"}
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-xs text-gray-500 font-medium mr-1.5">
          {formatSection(item.section, item.index)}
        </span>
        <span className={`text-xs text-gray-600 italic ${!expanded && isLong ? "line-clamp-1" : ""}`}>
          &ldquo;{item.quote}&rdquo;
        </span>
        {isLong && (
          <button
            onClick={() => setExpanded((o) => !o)}
            className="text-[10px] text-brand-600 hover:text-brand-700 font-medium ml-1"
          >
            {expanded ? "less" : "more"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GroundingPanel({ report }: GroundingPanelProps) {
  const [open, setOpen] = useState(report.ungroundedCount > 0 || report.score < 70);

  const scoreLabel =
    report.score >= 80 ? "Strong" : report.score >= 50 ? "Moderate" : "Weak";

  const borderColor =
    report.score >= 80 ? "border-emerald-200" : report.score >= 50 ? "border-amber-200" : "border-rose-200";

  const bgColor =
    report.score >= 80 ? "bg-emerald-50" : report.score >= 50 ? "bg-amber-50" : "bg-rose-50";

  return (
    <div className={`border rounded-xl overflow-hidden ${borderColor}`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${bgColor}`}
        onClick={() => setOpen((o) => !o)}
      >
        <ScoreRing score={report.score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">Source Verification</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
              report.score >= 80 ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
              report.score >= 50 ? "bg-amber-100 text-amber-700 border-amber-200" :
              "bg-rose-100 text-rose-700 border-rose-200"
            }`}>{scoreLabel}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-emerald-700 font-medium">
              {report.groundedCount} grounded
            </span>
            {report.partialCount > 0 && (
              <span className="text-xs text-amber-700 font-medium">
                {report.partialCount} partial
              </span>
            )}
            {report.ungroundedCount > 0 && (
              <span className="text-xs text-rose-700 font-medium">
                {report.ungroundedCount} ungrounded
              </span>
            )}
            <span className="text-xs text-gray-400">of {report.total} claims checked</span>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body */}
      {open && (
        <div className="bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-fade-in">
          {report.ungroundedCount > 0 && (
            <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-100 rounded-xl">
              <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-rose-700 leading-relaxed">
                <strong>{report.ungroundedCount} claim{report.ungroundedCount !== 1 ? "s" : ""}</strong> could not be traced back to the source text. These quotes may be hallucinated or paraphrased beyond recognition. Verify manually before acting on them.
              </p>
            </div>
          )}

          {/* Finding breakdown */}
          <div className="space-y-1.5">
            {report.items.map((item, i) => (
              <GroundingItem key={i} item={item} />
            ))}
          </div>

          {report.score >= 80 && (
            <p className="text-xs text-gray-400 text-center">
              All cited evidence is traceable to your source text.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

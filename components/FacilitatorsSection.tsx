"use client";

import type { Facilitator } from "@/lib/types";

const TYPE_COLOURS: Record<string, string> = {
  environmental: "bg-teal-50 text-teal-700 border-teal-200",
  social:        "bg-sky-50  text-sky-700  border-sky-200",
  institutional: "bg-blue-50 text-blue-700 border-blue-200",
  digital:       "bg-indigo-50 text-indigo-700 border-indigo-200",
  personal:      "bg-orange-50 text-orange-700 border-orange-200",
};

const STRENGTH_DOT: Record<string, string> = {
  high:   "bg-teal-500",
  medium: "bg-teal-400",
  low:    "bg-teal-300",
};

interface Props {
  facilitators: Facilitator[] | undefined;
}

export default function FacilitatorsSection({ facilitators }: Props) {
  if (!facilitators || facilitators.length === 0) return null;

  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-teal-500 inline-block" />
        Facilitators
        <span className="text-xs font-normal text-gray-400">({facilitators.length})</span>
      </h3>
      <div className="space-y-3">
        {facilitators.map((f, i) => (
          <div key={i} className="bg-teal-50/40 border border-teal-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{f.facilitator}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border capitalize ${TYPE_COLOURS[f.type] ?? TYPE_COLOURS.environmental}`}>
                  {f.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-2 h-2 rounded-full ${STRENGTH_DOT[f.strength] ?? "bg-gray-300"}`} />
                  {f.strength}
                </span>
              </div>
            </div>
            {f.source_text && (
              <blockquote className="mt-2 text-xs text-gray-500 italic border-l-2 border-teal-200 pl-3 leading-relaxed">
                &ldquo;{f.source_text}&rdquo;
              </blockquote>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

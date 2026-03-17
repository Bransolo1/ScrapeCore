"use client";

import { useState } from "react";
import type { BehaviouralContext } from "@/lib/types";

const ROUTINE_LABEL: Record<string, string> = {
  routine:    "Routine / habitual",
  deliberate: "Deliberate / intentional",
  mixed:      "Mixed",
  unknown:    "Unknown",
};

interface Props {
  context: BehaviouralContext | undefined;
}

export default function BehaviouralContextPanel({ context }: Props) {
  const [open, setOpen] = useState(true);

  if (!context) return null;

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3 text-left"
      >
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" />
          Behavioural context
        </h3>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="bg-sky-50/40 border border-sky-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Setting</p>
            <p className="text-sm text-gray-700 leading-snug">{context.setting}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Pattern</p>
            <p className="text-sm text-gray-700 leading-snug">{context.temporal_pattern}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Social context</p>
            <p className="text-sm text-gray-700 leading-snug">{context.social_context}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Habit vs deliberate</p>
            <p className="text-sm text-gray-700 leading-snug">
              {ROUTINE_LABEL[context.routine_vs_deliberate] ?? context.routine_vs_deliberate}
            </p>
          </div>

          {context.triggers && context.triggers.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Triggers</p>
              <ul className="flex flex-wrap gap-2">
                {context.triggers.map((t, i) => (
                  <li key={i} className="text-xs bg-white border border-sky-200 text-sky-700 px-2 py-0.5 rounded-full">
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

"use client";

import type { SubgroupInsight, Barrier, Motivator } from "@/lib/types";

interface PersonaCardsProps {
  insights: SubgroupInsight[];
  barriers: Barrier[];
  motivators: Motivator[];
}

const COM_B_COLORS = {
  capability: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    dot: "bg-violet-500",
    icon: "🧠",
  },
  opportunity: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-500",
    icon: "🌐",
  },
  motivation: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-500",
    icon: "⚡",
  },
};

const PERSONA_AVATARS = ["👤", "👥", "🧑‍💼", "👩‍💻", "🧑‍🎓", "👨‍🔬"];

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = [
  ["bg-violet-600", "text-violet-50"],
  ["bg-sky-600", "text-sky-50"],
  ["bg-amber-600", "text-amber-50"],
  ["bg-emerald-600", "text-emerald-50"],
  ["bg-rose-600", "text-rose-50"],
  ["bg-indigo-600", "text-indigo-50"],
];

export default function PersonaCards({ insights, barriers, motivators }: PersonaCardsProps) {
  if (!insights.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Segment Personas</h3>
        <span className="text-xs text-gray-400 font-normal">— derived from subgroup analysis</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {insights.map((insight, i) => {
          const c = COM_B_COLORS[insight.com_b_implication];
          const [avatarBg, avatarText] = AVATAR_COLORS[i % AVATAR_COLORS.length];

          // Match relevant barriers/motivators by COM-B type
          const relBarriers = barriers
            .filter((b) => b.com_b_type === insight.com_b_implication)
            .slice(0, 2);
          const relMotivators = motivators
            .filter((m) => m.com_b_type === insight.com_b_implication)
            .slice(0, 2);

          return (
            <div
              key={i}
              className={`rounded-xl border ${c.border} ${c.bg} p-4 flex flex-col gap-3`}
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${avatarBg} ${avatarText} flex items-center justify-center text-sm font-bold shrink-0`}
                >
                  {initials(insight.subgroup)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 capitalize leading-tight">
                    {insight.subgroup}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-medium ${c.text} mt-0.5`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {insight.com_b_implication} focus
                  </span>
                </div>
              </div>

              {/* Key insight */}
              <p className="text-xs text-gray-700 leading-relaxed border-l-2 border-current pl-2.5 italic">
                "{insight.insight}"
              </p>

              {/* Evidence */}
              {insight.evidence?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Evidence</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{insight.evidence[0]}</p>
                </div>
              )}

              {/* Relevant barriers / motivators */}
              {(relBarriers.length > 0 || relMotivators.length > 0) && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-current border-opacity-20">
                  {relBarriers.map((b, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <span className="text-red-400 text-xs mt-0.5">↓</span>
                      <span className="text-xs text-gray-600">{b.barrier}</span>
                    </div>
                  ))}
                  {relMotivators.map((m, j) => (
                    <div key={j} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 text-xs mt-0.5">↑</span>
                      <span className="text-xs text-gray-600">{m.motivator}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

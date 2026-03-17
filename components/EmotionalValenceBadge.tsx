"use client";

import type { EmotionalValence } from "@/lib/types";

const CONFIG: Record<EmotionalValence, { label: string; cls: string }> = {
  positive:    { label: "Positive",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  negative:    { label: "Negative",    cls: "bg-red-50    text-red-700    border-red-200"    },
  ambivalent:  { label: "Ambivalent",  cls: "bg-amber-50  text-amber-700  border-amber-200"  },
  neutral:     { label: "Neutral",     cls: "bg-gray-100  text-gray-600   border-gray-200"   },
};

interface Props {
  valence: EmotionalValence | undefined | null;
}

export default function EmotionalValenceBadge({ valence }: Props) {
  if (!valence) return null;
  const { label, cls } = CONFIG[valence] ?? CONFIG.neutral;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

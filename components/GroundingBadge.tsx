import type { GroundingLevel } from "@/lib/grounding";

interface GroundingBadgeProps {
  level: GroundingLevel;
  similarity?: number;
  compact?: boolean;
}

const CONFIG: Record<GroundingLevel, {
  label: string;
  compact: string;
  icon: React.ReactNode;
  classes: string;
  tooltip: string;
}> = {
  grounded: {
    label: "Grounded",
    compact: "G",
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    ),
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    tooltip: "Quote verified in source text",
  },
  partial: {
    label: "Partial",
    compact: "~",
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
    classes: "bg-amber-50 text-amber-700 border-amber-200",
    tooltip: "Paraphrase — high word overlap but not verbatim",
  },
  ungrounded: {
    label: "Ungrounded",
    compact: "!",
    icon: (
      <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    classes: "bg-rose-50 text-rose-700 border-rose-200",
    tooltip: "No matching text found — verify manually",
  },
};

export default function GroundingBadge({ level, compact = false }: GroundingBadgeProps) {
  const cfg = CONFIG[level];
  return (
    <span
      title={cfg.tooltip}
      className={`inline-flex items-center gap-1 border rounded-full text-xs font-semibold ${
        compact ? "px-1.5 py-0.5" : "px-2 py-0.5"
      } ${cfg.classes}`}
    >
      {cfg.icon}
      {!compact && cfg.label}
    </span>
  );
}

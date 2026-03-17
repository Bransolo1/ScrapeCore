import type { Confidence } from "@/lib/types";

interface ConfidenceBadgeProps {
  level: Confidence;
  size?: "sm" | "md";
}

const CONFIG: Record<Confidence, { label: string; classes: string; dot: string }> = {
  high:   { label: "High",   classes: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  medium: { label: "Medium", classes: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-400" },
  low:    { label: "Low",    classes: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-400" },
};

export default function ConfidenceBadge({ level, size = "sm" }: ConfidenceBadgeProps) {
  const { label, classes, dot } = CONFIG[level] ?? CONFIG.low;
  return (
    <span className={`inline-flex items-center gap-1.5 border font-medium rounded-full whitespace-nowrap ${classes} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
      {label}
    </span>
  );
}

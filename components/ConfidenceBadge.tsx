import type { Confidence } from "@/lib/types";

interface ConfidenceBadgeProps {
  level: Confidence;
  size?: "sm" | "md";
}

const CONFIG: Record<Confidence, { label: string; classes: string }> = {
  high: { label: "High", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  low: { label: "Low", classes: "bg-red-50 text-red-700 border-red-200" },
};

export default function ConfidenceBadge({ level, size = "sm" }: ConfidenceBadgeProps) {
  const { label, classes } = CONFIG[level];
  return (
    <span className={`inline-flex items-center border font-medium rounded-full ${classes} ${size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-2.5 py-1"}`}>
      {label}
    </span>
  );
}

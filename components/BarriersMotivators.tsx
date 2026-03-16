import type { Barrier, Motivator } from "@/lib/types";
import ConfidenceBadge from "./ConfidenceBadge";
import EvidenceChip from "./EvidenceChip";

const COM_B_COLORS: Record<string, string> = {
  capability: "bg-violet-100 text-violet-700",
  opportunity: "bg-sky-100 text-sky-700",
  motivation: "bg-amber-100 text-amber-700",
};

interface BarriersListProps {
  barriers: Barrier[];
}

interface MotivatorsListProps {
  motivators: Motivator[];
}

function BarrierCard({ barrier }: { barrier: Barrier }) {
  return (
    <div className="border border-red-100 rounded-xl p-4 bg-red-50">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">{barrier.barrier}</p>
        <ConfidenceBadge level={barrier.severity} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${COM_B_COLORS[barrier.com_b_type]}`}>
          {barrier.com_b_type}
        </span>
        <span className="text-xs text-gray-400">severity</span>
      </div>
      {barrier.source_text && (
        <blockquote className="mb-2 pl-3 border-l-2 border-red-200">
          <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">&ldquo;{barrier.source_text}&rdquo;</p>
        </blockquote>
      )}
      {barrier.evidence.length > 0 && (
        <div className="space-y-1.5">
          {barrier.evidence.slice(0, 2).map((q, i) => (
            <EvidenceChip key={i} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
}

function MotivatorCard({ motivator }: { motivator: Motivator }) {
  return (
    <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">{motivator.motivator}</p>
        <ConfidenceBadge level={motivator.strength} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${COM_B_COLORS[motivator.com_b_type]}`}>
          {motivator.com_b_type}
        </span>
        <span className="text-xs text-gray-400">strength</span>
      </div>
      {motivator.source_text && (
        <blockquote className="mb-2 pl-3 border-l-2 border-emerald-200">
          <p className="text-xs text-gray-500 italic leading-relaxed line-clamp-3">&ldquo;{motivator.source_text}&rdquo;</p>
        </blockquote>
      )}
      {motivator.evidence.length > 0 && (
        <div className="space-y-1.5">
          {motivator.evidence.slice(0, 2).map((q, i) => (
            <EvidenceChip key={i} quote={q} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BarriersList({ barriers }: BarriersListProps) {
  if (!barriers.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Barriers</h2>
        <span className="text-xs text-gray-400">{barriers.length} identified</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {barriers.map((b, i) => <BarrierCard key={i} barrier={b} />)}
      </div>
    </div>
  );
}

export function MotivatorsList({ motivators }: MotivatorsListProps) {
  if (!motivators.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">Motivators & Enablers</h2>
        <span className="text-xs text-gray-400">{motivators.length} identified</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {motivators.map((m, i) => <MotivatorCard key={i} motivator={m} />)}
      </div>
    </div>
  );
}

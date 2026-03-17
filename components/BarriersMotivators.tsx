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
    <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up">
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-400" />
      <div className="pl-4 pr-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <p className="text-sm font-medium text-gray-800 leading-snug">{barrier.barrier}</p>
          <ConfidenceBadge level={barrier.severity} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${COM_B_COLORS[barrier.com_b_type] ?? "bg-gray-100 text-gray-600"}`}>
            {barrier.com_b_type}
          </span>
          <span className="text-xs text-gray-400">severity</span>
        </div>
        {barrier.source_text && (
          <blockquote className="mb-3 pl-3 border-l-2 border-gray-200">
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
    </div>
  );
}

function MotivatorCard({ motivator }: { motivator: Motivator }) {
  return (
    <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden hover:shadow-sm transition-shadow animate-fade-in-up">
      {/* Left accent stripe */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-400" />
      <div className="pl-4 pr-4 pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <p className="text-sm font-medium text-gray-800 leading-snug">{motivator.motivator}</p>
          <ConfidenceBadge level={motivator.strength} />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${COM_B_COLORS[motivator.com_b_type] ?? "bg-gray-100 text-gray-600"}`}>
            {motivator.com_b_type}
          </span>
          <span className="text-xs text-gray-400">strength</span>
        </div>
        {motivator.source_text && (
          <blockquote className="mb-3 pl-3 border-l-2 border-emerald-200">
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
    </div>
  );
}

export function BarriersList({ barriers }: BarriersListProps) {
  if (!barriers.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">Barriers</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{barriers.length}</span>
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
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-gray-900">Motivators & Enablers</h2>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{motivators.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {motivators.map((m, i) => <MotivatorCard key={i} motivator={m} />)}
      </div>
    </div>
  );
}

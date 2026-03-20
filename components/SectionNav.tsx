"use client";

import { useState, useEffect, useRef } from "react";

export interface SectionDef {
  id: string;
  label: string;
  phase: "diagnosis" | "action" | "review";
  icon: React.ReactNode;
}

interface SectionNavProps {
  sections: SectionDef[];
  activeId: string | null;
}

const PHASE_STYLES: Record<string, { dot: string; label: string }> = {
  diagnosis: { dot: "bg-violet-500", label: "Diagnosis" },
  action: { dot: "bg-emerald-500", label: "Action" },
  review: { dot: "bg-amber-500", label: "Review" },
};

export default function SectionNav({ sections, activeId }: SectionNavProps) {
  let lastPhase = "";

  return (
    <nav className="sticky top-20 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-100 -mx-6 px-6 py-2">
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {sections.map((s) => {
          const showPhase = s.phase !== lastPhase;
          if (showPhase) lastPhase = s.phase;
          const ps = PHASE_STYLES[s.phase];
          const isActive = activeId === s.id;

          return (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              {showPhase && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1 ml-2 first:ml-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${ps.dot}`} />
                  {ps.label}
                </span>
              )}
              <button
                onClick={() => {
                  document.getElementById(`section-${s.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {s.icon}
                {s.label}
              </button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}

// Hook to track which section is currently visible
export function useActiveSection(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id.replace("section-", "");
          setActiveId(id);
        }
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0.1 }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(`section-${id}`);
      if (el) observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [sectionIds]);

  return activeId;
}

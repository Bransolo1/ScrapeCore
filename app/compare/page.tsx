"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ComBChart from "@/components/ComBChart";
import CompetitiveSummaryPanel from "@/components/CompetitiveSummaryPanel";
import type { BehaviourAnalysis } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalysisMeta {
  id: string;
  createdAt: string;
  title: string;
  dataType: string;
}

interface Slot {
  meta: AnalysisMeta | null;
  data: BehaviourAnalysis | null;
  loading: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function diffStrings(a: string[], b: string[]): {
  shared: string[];
  onlyA: string[];
  onlyB: string[];
} {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));

  const shared: string[] = [];
  const onlyA: string[] = [];
  const onlyB: string[] = [];

  for (const item of a) {
    if (setB.has(item.toLowerCase())) shared.push(item);
    else onlyA.push(item);
  }
  for (const item of b) {
    if (!setA.has(item.toLowerCase())) onlyB.push(item);
  }

  return { shared, onlyA, onlyB };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotSelector({
  slot,
  label,
  analyses,
  onSelect,
  color,
}: {
  slot: Slot;
  label: string;
  analyses: AnalysisMeta[];
  onSelect: (id: string) => void;
  color: "brand" | "violet";
}) {
  const colorMap = {
    brand: "border-brand-200 bg-brand-50 text-brand-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };
  const dotColor = { brand: "bg-brand-500", violet: "bg-violet-500" };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-3 h-3 rounded-full ${dotColor[color]}`} />
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>

      {slot.meta ? (
        <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
          <p className="text-sm font-semibold truncate">{slot.meta.title}</p>
          <p className="text-xs mt-0.5 opacity-70">{formatDate(slot.meta.createdAt)} · {slot.meta.dataType}</p>
          {slot.loading && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Loading analysis…</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-3">Select an analysis to compare</p>
      )}

      <select
        onChange={(e) => e.target.value && onSelect(e.target.value)}
        value={slot.meta?.id ?? ""}
        className="mt-3 w-full px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">— Choose analysis —</option>
        {analyses.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title} ({formatDate(a.createdAt)})
          </option>
        ))}
      </select>
    </div>
  );
}

function DiffList({
  title,
  shared,
  onlyA,
  onlyB,
  labelA,
  labelB,
}: {
  title: string;
  shared: string[];
  onlyA: string[];
  onlyB: string[];
  labelA: string;
  labelB: string;
}) {
  if (!shared.length && !onlyA.length && !onlyB.length) {
    return null;
  }
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="space-y-1.5">
        {shared.map((item, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0 mt-1.5" />
            <span className="text-sm text-gray-700 flex-1">{item}</span>
            <span className="text-xs text-gray-400 shrink-0 font-medium">shared</span>
          </div>
        ))}
        {onlyA.map((item, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-brand-50 border border-brand-200">
            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
            <span className="text-sm text-brand-800 flex-1">{item}</span>
            <span className="text-xs text-brand-500 shrink-0 font-medium">{labelA} only</span>
          </div>
        ))}
        {onlyB.map((item, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200">
            <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 mt-1.5" />
            <span className="text-sm text-violet-800 flex-1">{item}</span>
            <span className="text-xs text-violet-500 shrink-0 font-medium">{labelB} only</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-pulse text-sm text-gray-400">Loading comparison…</div></div>}>
      <ComparePageInner />
    </Suspense>
  );
}

function ComparePageInner() {
  const searchParams = useSearchParams();
  const prefillId = searchParams.get("analysisId");

  const [allAnalyses, setAllAnalyses] = useState<AnalysisMeta[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [slotA, setSlotA] = useState<Slot>({ meta: null, data: null, loading: false });
  const [slotB, setSlotB] = useState<Slot>({ meta: null, data: null, loading: false });

  // Competitive summary
  interface CompetitiveSummary { synthesis: string; opportunities: string[]; watchouts: string[]; }
  const [competitiveSummary, setCompetitiveSummary] = useState<CompetitiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryFetchedForRef = useRef<string | null>(null);
  const prefillDoneRef = useRef(false);

  // Load analysis list
  useEffect(() => {
    fetch("/api/analyses?page=1")
      .then((r) => r.json())
      .then((d) => setAllAnalyses(d.analyses ?? []))
      .finally(() => setLoadingList(false));
  }, []);

  // Pre-fill slot A from URL query param
  useEffect(() => {
    if (!prefillId || prefillDoneRef.current || allAnalyses.length === 0) return;
    if (allAnalyses.some((a) => a.id === prefillId)) {
      prefillDoneRef.current = true;
      loadSlotById(prefillId, setSlotA);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillId, allAnalyses]);

  const loadSlotById = async (id: string, setter: React.Dispatch<React.SetStateAction<Slot>>) => {
    const meta = allAnalyses.find((a) => a.id === id) ?? null;
    setter({ meta, data: null, loading: true });
    try {
      const res = await fetch(`/api/analyses/${id}`);
      const d = await res.json();
      setter({ meta, data: d.analysisJson as BehaviourAnalysis, loading: false });
    } catch {
      setter((prev) => ({ ...prev, loading: false }));
    }
  };

  const loadSlot = async (
    id: string,
    setter: React.Dispatch<React.SetStateAction<Slot>>
  ) => {
    const meta = allAnalyses.find((a) => a.id === id) ?? null;
    setter({ meta, data: null, loading: true });
    try {
      const res = await fetch(`/api/analyses/${id}`);
      const d = await res.json();
      setter({ meta, data: d.analysisJson as BehaviourAnalysis, loading: false });
    } catch {
      setter((prev) => ({ ...prev, loading: false }));
    }
  };

  const bothLoaded = slotA.data && slotB.data;

  // Fetch competitive summary whenever both slots are freshly loaded
  useEffect(() => {
    if (!slotA.data || !slotB.data || !slotA.meta || !slotB.meta) return;
    const key = `${slotA.meta.id}:${slotB.meta.id}`;
    if (summaryFetchedForRef.current === key) return;
    summaryFetchedForRef.current = key;
    setCompetitiveSummary(null);
    setSummaryLoading(true);
    fetch("/api/compare-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisA: slotA.data,
        analysisB: slotB.data,
        labelA: slotA.meta.title.split(" ").slice(0, 3).join(" "),
        labelB: slotB.meta.title.split(" ").slice(0, 3).join(" "),
      }),
    })
      .then((r) => r.json())
      .then((d) => { if (!d.error) setCompetitiveSummary(d); })
      .finally(() => setSummaryLoading(false));
  }, [slotA.data, slotB.data, slotA.meta, slotB.meta]);

  // Build diffs when both are loaded
  const barriers = bothLoaded
    ? diffStrings(
        slotA.data!.barriers.map((b) => b.barrier),
        slotB.data!.barriers.map((b) => b.barrier)
      )
    : null;

  const motivators = bothLoaded
    ? diffStrings(
        slotA.data!.motivators.map((m) => m.motivator),
        slotB.data!.motivators.map((m) => m.motivator)
      )
    : null;

  const interventions = bothLoaded
    ? diffStrings(
        slotA.data!.intervention_opportunities.map((i) => i.intervention),
        slotB.data!.intervention_opportunities.map((i) => i.intervention)
      )
    : null;

  const keyBehaviours = bothLoaded
    ? diffStrings(
        slotA.data!.key_behaviours.map((b) => b.behaviour),
        slotB.data!.key_behaviours.map((b) => b.behaviour)
      )
    : null;

  const labelA = slotA.meta?.title?.split(" ").slice(0, 3).join(" ") ?? "A";
  const labelB = slotB.meta?.title?.split(" ").slice(0, 3).join(" ") ?? "B";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Heading */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Competitor Comparison</h1>
          <p className="text-sm text-gray-500 mt-1">
            Select two analyses to compare COM-B profiles, barriers, motivators, and interventions side-by-side.
          </p>
        </div>

        {/* Slot selectors */}
        {loadingList ? (
          <div className="flex items-center justify-center min-h-32">
            <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : allAnalyses.length < 2 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            You need at least 2 saved analyses to compare. Run a second analysis first.
          </div>
        ) : (
          <div className="flex gap-4 mb-8">
            <SlotSelector
              slot={slotA}
              label="Analysis A"
              analyses={allAnalyses}
              onSelect={(id) => loadSlot(id, setSlotA)}
              color="brand"
            />
            <div className="flex items-center justify-center shrink-0 mt-8">
              <span className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 font-bold text-sm">
                vs
              </span>
            </div>
            <SlotSelector
              slot={slotB}
              label="Analysis B"
              analyses={allAnalyses}
              onSelect={(id) => loadSlot(id, setSlotB)}
              color="violet"
            />
          </div>
        )}

        {/* Comparison view */}
        {bothLoaded && (
          <div className="space-y-8">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-brand-700">{labelA}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-violet-700">{labelB}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-gray-500">Shared</span>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[
                { slot: slotA, color: "bg-brand-50 border-brand-200" },
                { slot: slotB, color: "bg-violet-50 border-violet-200" },
              ].map(({ slot, color }, i) => (
                <div key={i} className={`rounded-2xl border p-5 ${color}`}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {i === 0 ? labelA : labelB}
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{slot.data!.summary}</p>
                  <div className="flex gap-4 mt-3 text-xs text-gray-500">
                    <span>{slot.data!.text_units_analysed} text units</span>
                    <span>{slot.data!.data_type_detected}</span>
                    <span className={`font-semibold ${slot.data!.confidence.overall === "high" ? "text-emerald-600" : slot.data!.confidence.overall === "medium" ? "text-amber-600" : "text-red-500"}`}>
                      {slot.data!.confidence.overall} confidence
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* COM-B charts */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-5">COM-B Dimension Comparison</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-brand-600 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    {labelA}
                  </p>
                  <ComBChart mapping={slotA.data!.com_b_mapping} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-violet-600 mb-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    {labelB}
                  </p>
                  <ComBChart mapping={slotB.data!.com_b_mapping} />
                </div>
              </div>
            </div>

            {/* Diff sections */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-8">
              <h2 className="text-sm font-semibold text-gray-700">Behaviour & Signal Differences</h2>

              {keyBehaviours && (
                <DiffList
                  title="Key Behaviours"
                  shared={keyBehaviours.shared}
                  onlyA={keyBehaviours.onlyA}
                  onlyB={keyBehaviours.onlyB}
                  labelA={labelA}
                  labelB={labelB}
                />
              )}

              {barriers && (
                <DiffList
                  title="Barriers"
                  shared={barriers.shared}
                  onlyA={barriers.onlyA}
                  onlyB={barriers.onlyB}
                  labelA={labelA}
                  labelB={labelB}
                />
              )}

              {motivators && (
                <DiffList
                  title="Motivators"
                  shared={motivators.shared}
                  onlyA={motivators.onlyA}
                  onlyB={motivators.onlyB}
                  labelA={labelA}
                  labelB={labelB}
                />
              )}

              {interventions && (
                <DiffList
                  title="Intervention Opportunities"
                  shared={interventions.shared}
                  onlyA={interventions.onlyA}
                  onlyB={interventions.onlyB}
                  labelA={labelA}
                  labelB={labelB}
                />
              )}
            </div>

            {/* Strategic opportunity summary */}
            {summaryLoading && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin shrink-0" />
                <p className="text-sm text-gray-500">Generating strategic opportunity analysis…</p>
              </div>
            )}
            {competitiveSummary && !summaryLoading && (
              <CompetitiveSummaryPanel
                summary={competitiveSummary}
                labelA={labelA}
                labelB={labelB}
              />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-xs text-gray-400">
            ScrapeCore · Scrape. Analyse. Understand behaviour. · Powered by Claude Opus 4.6
          </p>
        </div>
      </footer>
    </div>
  );
}

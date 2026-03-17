"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EvalItem {
  id: string;
  createdAt: string;
  title: string;
  dataType: string;
  promptVersion: string | null;
  rubricGrade: string | null;
  rubricTotal: number | null;
  rubricDimensions: { name: string; score: number; rationale: string }[] | null;
  groundingScore: number | null;
  avgValidityScore: number | null;
  evalPassed: boolean | null;
  evalNotes: string | null;
  confidence: string | null;
  summary: string | null;
  interventionCount: number;
  barrierCount: number;
}

const GRADE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  strong:         { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  acceptable:     { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  needs_revision: { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200"    },
};

const CONF_COLORS: Record<string, string> = {
  high: "text-emerald-600", medium: "text-amber-600", low: "text-rose-600",
};

function MetricRow({ label, a, b, higherIsBetter = true }: {
  label: string;
  a: number | null;
  b: number | null;
  higherIsBetter?: boolean;
}) {
  const winner = a === null || b === null ? null : higherIsBetter ? (a > b ? "a" : b > a ? "b" : "tie") : (a < b ? "a" : b < a ? "b" : "tie");
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className="text-center">
        <span className={`text-sm font-bold ${winner === "a" ? "text-emerald-600" : "text-gray-700"}`}>
          {a !== null ? a : "—"}
        </span>
        {winner === "a" && <span className="text-xs text-emerald-500 ml-1">▲</span>}
      </div>
      <div className="text-center text-xs font-medium text-gray-500">{label}</div>
      <div className="text-center">
        <span className={`text-sm font-bold ${winner === "b" ? "text-emerald-600" : "text-gray-700"}`}>
          {b !== null ? b : "—"}
        </span>
        {winner === "b" && <span className="text-xs text-emerald-500 ml-1">▲</span>}
      </div>
    </div>
  );
}

function AnalysisCard({ item, onSelect, selected }: { item: EvalItem; onSelect: () => void; selected: boolean }) {
  const gc = item.rubricGrade ? GRADE_COLORS[item.rubricGrade] : null;
  return (
    <button
      onClick={onSelect}
      className={`text-left w-full p-3 rounded-xl border transition-all ${selected ? "border-brand-400 bg-brand-50 ring-2 ring-brand-200" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-gray-800 line-clamp-2 flex-1">{item.title}</p>
        {gc && (
          <span className={`shrink-0 text-xs font-bold px-1.5 py-0.5 rounded-full border ${gc.bg} ${gc.text} ${gc.border}`}>
            {item.rubricGrade?.replace("_", " ")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.promptVersion && (
          <span className="text-xs font-mono text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">{item.promptVersion}</span>
        )}
        <span className="text-xs text-gray-400 capitalize">{item.dataType.replace("_", " ")}</span>
        {item.confidence && (
          <span className={`text-xs font-medium ${CONF_COLORS[item.confidence] ?? "text-gray-500"}`}>{item.confidence} conf.</span>
        )}
        <span className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
      </div>
    </button>
  );
}

export default function EvalPage() {
  const [items, setItems] = useState<EvalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pickingSlot, setPickingSlot] = useState<"a" | "b" | null>(null);

  useEffect(() => {
    fetch("/api/analyses/eval-list")
      .then((r) => r.json())
      .then((d: { items?: EvalItem[] }) => { if (d.items) setItems(d.items); })
      .finally(() => setLoading(false));
  }, []);

  const analysisA = items.find((i) => i.id === aId) ?? null;
  const analysisB = items.find((i) => i.id === bId) ?? null;

  const filtered = items.filter(
    (i) => !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.promptVersion ?? "").includes(search)
  );

  const handleSelect = (item: EvalItem) => {
    if (pickingSlot === "a") { setAId(item.id); setPickingSlot(null); }
    else if (pickingSlot === "b") { setBId(item.id); setPickingSlot(null); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Prompt A/B Evaluation</h1>
            <p className="text-xs text-gray-400">Compare two analyses — rubric scores, grounding, and quality metrics side-by-side</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Slot selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["a", "b"] as const).map((slot) => {
            const item = slot === "a" ? analysisA : analysisB;
            const gc = item?.rubricGrade ? GRADE_COLORS[item.rubricGrade] : null;
            return (
              <div key={slot} className={`bg-white border rounded-2xl shadow-sm p-4 ${pickingSlot === slot ? "border-brand-400 ring-2 ring-brand-200" : "border-gray-200"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Analysis {slot.toUpperCase()}</span>
                  <button
                    onClick={() => setPickingSlot(pickingSlot === slot ? null : slot)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${pickingSlot === slot ? "bg-brand-600 text-white border-brand-600" : "text-brand-600 border-brand-200 hover:bg-brand-50"}`}
                  >
                    {pickingSlot === slot ? "Selecting…" : item ? "Change" : "Pick analysis"}
                  </button>
                </div>
                {item ? (
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2">{item.title}</p>
                    {item.summary && <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{item.summary}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      {item.promptVersion && <span className="text-xs font-mono text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">{item.promptVersion}</span>}
                      {gc && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${gc.bg} ${gc.text} ${gc.border}`}>{item.rubricGrade?.replace("_", " ")}</span>}
                      {item.confidence && <span className={`text-xs font-medium ${CONF_COLORS[item.confidence] ?? "text-gray-500"}`}>{item.confidence} confidence</span>}
                    </div>
                    {item.evalNotes && <p className="mt-2 text-xs text-gray-400 italic">{item.evalNotes}</p>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-4 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm">No analysis selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Metrics comparison */}
        {analysisA && analysisB && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Quality Metrics Comparison</h2>
            <div className="grid grid-cols-3 text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1 gap-2">
              <div className="text-center">Analysis A</div>
              <div className="text-center">Metric</div>
              <div className="text-center">Analysis B</div>
            </div>
            <MetricRow label="Rubric /50" a={analysisA.rubricTotal} b={analysisB.rubricTotal} />
            <MetricRow label="Grounding %" a={analysisA.groundingScore} b={analysisB.groundingScore} />
            <MetricRow label="Validity /5" a={analysisA.avgValidityScore} b={analysisB.avgValidityScore} />
            <MetricRow label="Interventions" a={analysisA.interventionCount} b={analysisB.interventionCount} />
            <MetricRow label="Barriers" a={analysisA.barrierCount} b={analysisB.barrierCount} />

            {/* Rubric dimensions breakdown */}
            {(analysisA.rubricDimensions || analysisB.rubricDimensions) && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Rubric Dimension Breakdown</p>
                <div className="space-y-2">
                  {(analysisA.rubricDimensions ?? analysisB.rubricDimensions ?? []).map((dim, i) => {
                    const aScore = analysisA.rubricDimensions?.[i]?.score ?? null;
                    const bScore = analysisB.rubricDimensions?.[i]?.score ?? null;
                    const best = aScore !== null && bScore !== null ? (aScore > bScore ? "a" : bScore > aScore ? "b" : "tie") : null;
                    return (
                      <div key={i} className="grid grid-cols-3 items-center gap-2">
                        <div className="text-center">
                          <span className={`text-xs font-bold ${best === "a" ? "text-emerald-600" : "text-gray-600"}`}>{aScore ?? "—"}</span>
                        </div>
                        <div className="text-center text-xs text-gray-500 truncate">{dim.name}</div>
                        <div className="text-center">
                          <span className={`text-xs font-bold ${best === "b" ? "text-emerald-600" : "text-gray-600"}`}>{bScore ?? "—"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analysis picker modal */}
        {pickingSlot && (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Select Analysis {pickingSlot.toUpperCase()}
              </h2>
              <button onClick={() => setPickingSlot(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
            <input
              type="text"
              placeholder="Filter by title or prompt version…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {loading ? (
              <p className="text-sm text-gray-400 text-center py-4">Loading analyses…</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No analyses found.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                {filtered.map((item) => (
                  <AnalysisCard
                    key={item.id}
                    item={item}
                    onSelect={() => handleSelect(item)}
                    selected={(pickingSlot === "a" && aId === item.id) || (pickingSlot === "b" && bId === item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!analysisA && !analysisB && !pickingSlot && !loading && (
          <div className="text-center py-12 text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Pick two analyses above to compare their quality metrics</p>
          </div>
        )}
      </main>
    </div>
  );
}

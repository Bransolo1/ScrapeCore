"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getChangesBetween, type PromptVersionEntry } from "@/lib/promptVersions";

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

const CHANGE_TYPE_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  added:   { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Added" },
  changed: { pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   label: "Changed" },
  removed: { pill: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500",    label: "Removed" },
  fixed:   { pill: "bg-sky-50 text-sky-700 border-sky-200",             dot: "bg-sky-500",     label: "Fixed" },
};

function PromptDiff({ versionA, versionB }: { versionA: string | null | undefined; versionB: string | null | undefined }) {
  if (!versionA || !versionB) return null;
  if (versionA === versionB) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Prompt Version Diff</h2>
        </div>
        <p className="text-xs text-gray-400 mt-2">Both analyses used <span className="font-mono text-brand-600">{versionA}</span> — no changes between them.</p>
      </div>
    );
  }

  const entries = getChangesBetween(versionA, versionB);
  const allVersions = [versionA, versionB].sort();
  const direction = versionA < versionB ? "upgrade" : "rollback";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-900">Prompt Version Diff</h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">{versionA}</span>
          <svg className={`w-3.5 h-3.5 ${direction === "rollback" ? "rotate-180 text-rose-400" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-mono text-brand-600 bg-brand-50 border border-brand-100 px-1.5 py-0.5 rounded">{versionB}</span>
          {direction === "rollback" && (
            <span className="text-xs text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full font-medium">rollback</span>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-gray-400">No changelog entries found between these versions.</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry: PromptVersionEntry) => (
            <div key={entry.version} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded">{entry.version}</span>
                <span className="text-xs text-gray-400">{entry.date}</span>
                <span className="text-xs text-gray-600 font-medium">{entry.summary}</span>
              </div>
              <div className="space-y-1.5">
                {entry.changes.map((change, i) => {
                  const style = CHANGE_TYPE_STYLES[change.type] ?? CHANGE_TYPE_STYLES.changed;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border mt-0.5 ${style.pill}`}>
                        {style.label}
                      </span>
                      <p className="text-xs text-gray-600 leading-relaxed">{change.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Quality Lab</h1>
          <p className="text-sm text-gray-500 mt-1">Compare two analyses — rubric scores, grounding, and quality metrics side-by-side</p>
        </div>
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

        {/* Prompt version diff */}
        {analysisA && analysisB && (
          <PromptDiff versionA={analysisA.promptVersion} versionB={analysisB.promptVersion} />
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

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">ScrapeCore · Behavioural Market Intelligence</p>
          <p className="text-xs text-gray-400">AI-assisted — expert review required</p>
        </div>
      </footer>
    </div>
  );
}

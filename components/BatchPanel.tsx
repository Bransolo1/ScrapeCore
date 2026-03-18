"use client";

import { useState, useRef } from "react";
import type { DataType, BehaviourAnalysis, AnalysisState } from "@/lib/types";
import BatchCompareView from "./BatchCompareView";

export interface BatchDoc {
  id: string;
  title: string;
  text: string;
  dataType: DataType;
  state: AnalysisState;
}

interface BatchPanelProps {
  onSelectResult: (doc: BatchDoc) => void;
}

const EMPTY_STATE: AnalysisState = { status: "idle", streamingText: "", analysis: null, error: null, durationMs: null };

function newDoc(index: number): BatchDoc {
  return { id: crypto.randomUUID(), title: `Document ${index}`, text: "", dataType: "free_text", state: EMPTY_STATE };
}

async function analyseDoc(
  doc: BatchDoc,
  actor: string,
  onUpdate: (id: string, state: AnalysisState) => void
): Promise<void> {
  onUpdate(doc.id, { ...EMPTY_STATE, status: "streaming", streamingText: "" });

  const startMs = Date.now();
  let accumulated = "";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: doc.text, dataType: doc.dataType, actor }),
    });

    if (!res.ok || !res.body) {
      const err = await res.json().catch(() => ({ error: "Request failed" }));
      onUpdate(doc.id, { ...EMPTY_STATE, status: "error", error: err.error ?? "Unknown error" });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw) as
            | { type: "chunk"; text: string }
            | { type: "complete"; analysis: BehaviourAnalysis; savedId?: string; usage: { inputTokens: number; outputTokens: number } }
            | { type: "error"; error: string };

          if (event.type === "chunk") {
            accumulated += event.text;
            onUpdate(doc.id, { ...EMPTY_STATE, status: "streaming", streamingText: accumulated });
          } else if (event.type === "complete") {
            onUpdate(doc.id, {
              status: "complete",
              streamingText: "",
              analysis: event.analysis,
              error: null,
              durationMs: Date.now() - startMs,
              savedId: event.savedId ?? null,
            });
          } else if (event.type === "error") {
            onUpdate(doc.id, { ...EMPTY_STATE, status: "error", error: event.error });
          }
        } catch { /* partial */ }
      }
    }
  } catch (err) {
    onUpdate(doc.id, { ...EMPTY_STATE, status: "error", error: err instanceof Error ? err.message : "Network error" });
  }
}

export default function BatchPanel({ onSelectResult }: BatchPanelProps) {
  const [docs, setDocs] = useState<BatchDoc[]>([newDoc(1), newDoc(2)]);
  const [activeId, setActiveId] = useState(docs[0].id);
  const [running, setRunning] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const actorRef = useRef<string>("");

  if (typeof window !== "undefined" && !actorRef.current) {
    actorRef.current = localStorage.getItem("scrapecore-user") ?? "analyst";
  }

  const updateDoc = (id: string, patch: Partial<BatchDoc> | ((prev: BatchDoc) => Partial<BatchDoc>)) => {
    setDocs((prev) => prev.map((d) => d.id === id ? { ...d, ...(typeof patch === "function" ? patch(d) : patch) } : d));
  };

  const updateState = (id: string, stateOrFn: AnalysisState | ((prev: AnalysisState) => AnalysisState)) => {
    setDocs((prev) => prev.map((d) => {
      if (d.id !== id) return d;
      const newState = typeof stateOrFn === "function" ? (stateOrFn as (s: AnalysisState) => AnalysisState)(d.state) : stateOrFn;
      return { ...d, state: newState };
    }));
  };

  const addDoc = () => {
    const d = newDoc(docs.length + 1);
    setDocs((prev) => [...prev, d]);
    setActiveId(d.id);
  };

  const removeDoc = (id: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      if (activeId === id && next.length > 0) setActiveId(next[0].id);
      return next;
    });
  };

  const runAll = async () => {
    const pending = docs.filter((d) => d.text.trim() && d.state.status !== "streaming");
    if (!pending.length) return;
    setRunning(true);
    for (const doc of pending) {
      await analyseDoc(doc, actorRef.current, updateState);
    }
    setRunning(false);
  };

  const activeDoc = docs.find((d) => d.id === activeId) ?? docs[0];
  const pendingCount = docs.filter((d) => d.text.trim() && d.state.status === "idle").length;
  const doneCount = docs.filter((d) => d.state.status === "complete").length;
  const canCompare = doneCount >= 2;

  return (
    <div className="space-y-4">
      {showCompare && <BatchCompareView docs={docs} onClose={() => setShowCompare(false)} />}
      {/* Document tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {docs.map((doc) => (
          <div key={doc.id} className="relative group">
            <button
              onClick={() => {
                setActiveId(doc.id);
                if (doc.state.status === "complete") onSelectResult(doc);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                doc.id === activeId
                  ? "bg-brand-50 text-brand-700 border border-brand-200"
                  : "text-gray-500 hover:bg-gray-100 border border-transparent"
              }`}
            >
              {doc.state.status === "streaming" && (
                <span className="w-1.5 h-1.5 bg-brand-500 rounded-full animate-pulse shrink-0" />
              )}
              {doc.state.status === "complete" && (
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
              )}
              {doc.state.status === "error" && (
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              )}
              {doc.title}
            </button>
            {docs.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); removeDoc(doc.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full text-xs hidden group-hover:flex items-center justify-center transition-colors"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addDoc}
          className="flex items-center justify-center w-7 h-7 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition-colors text-lg leading-none"
          title="Add document"
        >
          +
        </button>
      </div>

      {/* Active document editor */}
      {activeDoc && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={activeDoc.title}
              onChange={(e) => updateDoc(activeDoc.id, { title: e.target.value })}
              className="flex-1 text-sm font-medium border-0 border-b border-gray-200 focus:outline-none focus:border-brand-400 pb-1 bg-transparent"
              placeholder="Document title…"
            />
            <select
              value={activeDoc.dataType}
              onChange={(e) => updateDoc(activeDoc.id, { dataType: e.target.value as DataType })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
            >
              {(["free_text", "survey", "reviews", "social", "interviews", "competitor"] as DataType[]).map((dt) => (
                <option key={dt} value={dt}>{dt}</option>
              ))}
            </select>
          </div>
          <textarea
            value={activeDoc.text}
            onChange={(e) => updateDoc(activeDoc.id, { text: e.target.value })}
            placeholder="Paste qualitative text here…"
            rows={8}
            disabled={activeDoc.state.status === "streaming"}
            className="w-full text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-400 disabled:opacity-60"
          />
          {activeDoc.state.status === "complete" && (
            <button
              onClick={() => onSelectResult(activeDoc)}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              View results
            </button>
          )}
          {activeDoc.state.status === "error" && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{activeDoc.state.error}</p>
          )}
        </div>
      )}

      {/* Batch controls */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <p className="text-xs text-gray-400">
            {doneCount}/{docs.length} complete{pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
          </p>
          {canCompare && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-200 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare
            </button>
          )}
        </div>
        <button
          onClick={runAll}
          disabled={running || pendingCount === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-all"
        >
          {running ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running…
            </>
          ) : (
            <>Run all ({pendingCount})</>
          )}
        </button>
      </div>
    </div>
  );
}

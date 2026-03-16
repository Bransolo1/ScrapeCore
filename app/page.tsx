"use client";

import { useState, useRef } from "react";
import Header from "@/components/Header";
import DataInput from "@/components/DataInput";
import AnalysisResults from "@/components/AnalysisResults";
import type { AnalysisState, DataType, BehaviourAnalysis } from "@/lib/types";

const INITIAL_STATE: AnalysisState = {
  status: "idle",
  streamingText: "",
  analysis: null,
  error: null,
  durationMs: null,
};

export default function Home() {
  const [text, setText] = useState("");
  const [dataType, setDataType] = useState<DataType>("survey");
  const [state, setState] = useState<AnalysisState>(INITIAL_STATE);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | undefined>();
  const startTimeRef = useRef<number>(0);

  const runAnalysis = async () => {
    if (!text.trim() || state.status === "streaming") return;

    setState({ status: "streaming", streamingText: "", analysis: null, error: null, durationMs: null });
    setUsage(undefined);
    startTimeRef.current = Date.now();

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, dataType }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setState({ status: "error", streamingText: "", analysis: null, error: err.error ?? "Unknown error", durationMs: null });
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
              | { type: "complete"; analysis: BehaviourAnalysis; usage: { inputTokens: number; outputTokens: number } }
              | { type: "error"; error: string; rawText?: string };

            if (event.type === "chunk") {
              setState((prev) => ({
                ...prev,
                streamingText: prev.streamingText + event.text,
              }));
            } else if (event.type === "complete") {
              const durationMs = Date.now() - startTimeRef.current;
              setUsage(event.usage);
              setState({
                status: "complete",
                streamingText: "",
                analysis: event.analysis,
                error: null,
                durationMs,
              });
            } else if (event.type === "error") {
              setState({
                status: "error",
                streamingText: "",
                analysis: null,
                error: event.error,
                durationMs: null,
              });
            }
          } catch {
            // Partial JSON — skip
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      setState({ status: "error", streamingText: "", analysis: null, error: message, durationMs: null });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
          {/* Input panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sticky top-8">
            <DataInput
              text={text}
              dataType={dataType}
              isLoading={state.status === "streaming"}
              onTextChange={setText}
              onDataTypeChange={setDataType}
              onSubmit={runAnalysis}
            />
          </div>

          {/* Results panel */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm min-h-96 overflow-hidden">
            <AnalysisResults
              state={state}
              inputText={text}
              usage={usage}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Powered by Claude Opus 4.6 · COM-B · Behaviour Change Wheel
          </p>
          <p className="text-xs text-gray-400">
            All analysis is AI-assisted — expert review required before operational use
          </p>
        </div>
      </footer>
    </div>
  );
}

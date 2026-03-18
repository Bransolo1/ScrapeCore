"use client";

import { useState } from "react";
import type { DataType } from "@/lib/types";

const DATA_TYPES: { value: DataType; label: string; description: string; icon: string }[] = [
  { value: "survey",     label: "Survey responses",  description: "Open-ended survey or questionnaire data", icon: "📋" },
  { value: "interviews", label: "Interview data",     description: "Transcripts or research notes from interviews", icon: "🎤" },
  { value: "reviews",    label: "Reviews",            description: "Product, service, or app reviews", icon: "⭐" },
  { value: "social",     label: "Social listening",   description: "Social media posts or community comments", icon: "💬" },
  { value: "free_text",  label: "Free text",          description: "Any unstructured qualitative text", icon: "📄" },
  { value: "competitor", label: "Competitor intel",   description: "Reviews, messaging, or UX signals from a competitor", icon: "🔍" },
];

interface GuidedWizardProps {
  onComplete: (params: { text: string; dataType: DataType; projectContext: string }) => void;
  onDismiss: () => void;
}

const STEP_LABELS = ["Research question", "Data type", "Add data", "Review & run"];

export default function GuidedWizard({ onComplete, onDismiss }: GuidedWizardProps) {
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [population, setPopulation] = useState("");
  const [dataType, setDataType] = useState<DataType>("survey");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const projectContext = [question.trim(), population.trim()]
    .filter(Boolean)
    .join(" | Target population: ");

  const canAdvance = [
    question.trim().length > 0,         // step 0
    true,                                // step 1 — always have a default
    text.trim().length > 50,            // step 2
    true,                                // step 3 — review
  ][step];

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setFileError("File too large (max 2 MB)."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setText(result);
    };
    reader.readAsText(file);
  };

  const handleRun = () => {
    onComplete({ text, dataType, projectContext });
  };

  const selectedType = DATA_TYPES.find((d) => d.value === dataType)!;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Guided analysis setup</h2>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close wizard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    i < step ? "bg-brand-500 text-white" : i === step ? "bg-brand-500 text-white ring-4 ring-brand-100" : "bg-gray-100 text-gray-400"
                  }`}>
                    {i < step ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${i === step ? "text-brand-700" : i < step ? "text-brand-500" : "text-gray-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 transition-all ${i < step ? "bg-brand-300" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-64">
          {/* Step 0 — Research question */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  A clear research question guides the analysis and is injected into the prompt as context. The more specific, the better.
                </p>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  What are you trying to understand? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Why do users abandon checkout on our mobile app? What motivates people to start a gym routine? What stops small businesses from adopting cloud accounting?"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-transparent resize-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Target population <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={population}
                  onChange={(e) => setPopulation(e.target.value)}
                  placeholder="e.g. UK small business owners aged 30-50, first-time gym members"
                  className="w-full px-3 py-2 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 1 — Data type */}
          {step === 1 && (
            <div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Choose the type of data you&apos;re analysing. This helps calibrate how the model interprets the evidence.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DATA_TYPES.map((dt) => (
                  <button
                    key={dt.value}
                    onClick={() => setDataType(dt.value)}
                    className={`text-left px-3 py-3 rounded-xl border text-sm transition-all ${
                      dataType === dt.value
                        ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base leading-none">{dt.icon}</span>
                      <span className="font-semibold text-xs">{dt.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{dt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Add data */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Paste your raw qualitative text below. Separate individual responses with line breaks for best results. Aim for at least 5–10 distinct responses.
              </p>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-700">Your data</label>
                  <label className="text-xs text-brand-600 hover:text-brand-700 cursor-pointer font-medium">
                    Upload .txt / .csv
                    <input type="file" accept=".txt,.csv,.md" className="hidden" onChange={handleFile} />
                  </label>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your qualitative text here — survey responses, interview excerpts, reviews…"
                  rows={8}
                  className="w-full px-3 py-3 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-transparent resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {wordCount > 0 ? `${wordCount.toLocaleString()} words` : ""}
                  </p>
                  {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                  {wordCount > 0 && wordCount < 30 && (
                    <p className="text-xs text-amber-500">Add more text for reliable results</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Review your setup before running. The analysis uses Claude Opus 4.6 and applies the COM-B model, BCW, and BCT taxonomy.
              </p>
              <div className="bg-gray-50 rounded-xl border border-gray-100 divide-y divide-gray-100">
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">Research Q</span>
                  <p className="text-sm text-gray-700 leading-snug">{question || <span className="text-gray-400 italic">Not set</span>}</p>
                </div>
                {population && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">Population</span>
                    <p className="text-sm text-gray-700 leading-snug">{population}</p>
                  </div>
                )}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Data type</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <span>{selectedType.icon}</span> {selectedType.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">Data</span>
                  <span className="text-sm text-gray-700">{wordCount.toLocaleString()} words · {text.split(/\n+/).filter((l) => l.trim()).length} lines</span>
                </div>
              </div>
              <div className="px-4 py-3 bg-brand-50 border border-brand-100 rounded-xl">
                <p className="text-xs text-brand-700 leading-relaxed">
                  <strong>AI-generated output</strong> — results require expert review before operational use. Evidence grounding, rubric scoring, and confidence assessment are computed automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={onDismiss}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Switch to expert mode
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step < STEP_LABELS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={!text.trim() || wordCount < 10}
                className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run analysis
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

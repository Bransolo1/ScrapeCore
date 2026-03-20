"use client";

import { useState } from "react";
import type { DataType } from "@/lib/types";

/**
 * Unified onboarding wizard — combines the old informational WizardOverlay
 * and the functional GuidedWizard into a single coherent flow:
 *
 * Step 0: Welcome (what ScrapeCore does)
 * Step 1: Research question + population
 * Step 2: Data type selection
 * Step 3: Paste data
 * Step 4: Review & run
 *
 * Users can skip to expert mode at any point.
 */

const DATA_TYPES: { value: DataType; label: string; description: string; icon: string }[] = [
  { value: "survey",     label: "Survey responses",  description: "Open-ended survey or questionnaire data", icon: "\u{1F4CB}" },
  { value: "interviews", label: "Interview data",     description: "Transcripts or research notes from interviews", icon: "\u{1F3A4}" },
  { value: "reviews",    label: "Reviews",            description: "Product, service, or app reviews", icon: "\u{2B50}" },
  { value: "social",     label: "Social listening",   description: "Social media posts or community comments", icon: "\u{1F4AC}" },
  { value: "free_text",  label: "Free text",          description: "Any unstructured qualitative text", icon: "\u{1F4C4}" },
  { value: "competitor", label: "Competitor intel",   description: "Reviews, messaging, or UX signals from a competitor", icon: "\u{1F50D}" },
];

const STEP_LABELS = ["Welcome", "Research question", "Data type", "Add data", "Review & run"];

interface WizardOverlayProps {
  /** If true, the wizard starts at step 0 (Welcome). If false, starts at step 1 (guided setup). */
  showWelcome?: boolean;
  onDone: () => void;
  onComplete?: (params: { text: string; dataType: DataType; projectContext: string }) => void;
}

export default function WizardOverlay({ showWelcome = true, onDone, onComplete }: WizardOverlayProps) {
  const startStep = showWelcome ? 0 : 1;
  const [step, setStep] = useState(startStep);

  // Functional state (steps 1-4)
  const [question, setQuestion] = useState("");
  const [population, setPopulation] = useState("");
  const [dataType, setDataType] = useState<DataType>("survey");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  const projectContext = [question.trim(), population.trim()]
    .filter(Boolean)
    .join(" | Target population: ");

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const selectedType = DATA_TYPES.find((d) => d.value === dataType)!;

  const canAdvance = [
    true,                                // step 0 — welcome
    question.trim().length > 0,          // step 1 — research question
    true,                                // step 2 — data type (always valid)
    text.trim().length > 50,             // step 3 — data input
    true,                                // step 4 — review
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
    if (onComplete) {
      onComplete({ text, dataType, projectContext });
    }
    onDone();
  };

  const handleSkipToExpert = () => {
    onDone();
  };

  // Only show step indicators for functional steps (skip welcome dot on indicator bar)
  const functionalSteps = STEP_LABELS.slice(1);
  const functionalIndex = step - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              {step === 0 ? "Welcome to ScrapeCore" : "Guided analysis setup"}
            </h2>
            <button
              onClick={handleSkipToExpert}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close wizard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress indicator — only shown after welcome */}
          {step > 0 && (
            <div className="flex items-center gap-0">
              {functionalSteps.map((label, i) => (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                      i < functionalIndex ? "bg-brand-500 text-white" : i === functionalIndex ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-gray-100 text-gray-400"
                    }`}>
                      {i < functionalIndex ? (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className={`text-xs font-medium hidden sm:inline ${i === functionalIndex ? "text-brand-700" : i < functionalIndex ? "text-brand-500" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </div>
                  {i < functionalSteps.length - 1 && (
                    <div className={`flex-1 h-px mx-2 transition-all ${i < functionalIndex ? "bg-brand-300" : "bg-gray-200"}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-64">
          {/* Step 0 — Welcome */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-6">
                Transform qualitative text into structured behavioural insights using the <strong className="text-gray-700">COM-B framework</strong> and <strong className="text-gray-700">Behaviour Change Wheel</strong>.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-4">
                {[
                  { label: "1. Paste data", desc: "Survey, interviews, reviews" },
                  { label: "2. AI analyses", desc: "COM-B mapping, barriers" },
                  { label: "3. You review", desc: "Confirm, dispute, export" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 text-center ${["bg-violet-50", "bg-sky-50", "bg-amber-50"][i]}`}>
                    <p className={`text-xs font-bold ${["text-violet-600", "text-sky-600", "text-amber-600"][i]}`}>{s.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                AI-generated — expert review always required before operational use
              </p>
            </div>
          )}

          {/* Step 1 — Research question */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                A clear research question guides the analysis. The more specific, the better.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  What are you trying to understand? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Why do users abandon checkout on our mobile app?"
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
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
                  placeholder="e.g. UK small business owners aged 30-50"
                  className="w-full px-3 py-2 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Step 2 — Data type */}
          {step === 2 && (
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

          {/* Step 3 — Add data */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Paste your raw qualitative text below. Aim for at least 5-10 distinct responses.
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
                  placeholder="Paste your qualitative text here — survey responses, interview excerpts, reviews..."
                  rows={8}
                  className="w-full px-3 py-3 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none font-mono leading-relaxed"
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

          {/* Step 4 — Review & run */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Review your setup before running the analysis.
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
                  <strong>AI-generated output</strong> — results require expert review before operational use.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <button
            onClick={handleSkipToExpert}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {step === 0 ? "Skip" : "Switch to expert mode"}
          </button>
          <div className="flex gap-2">
            {step > startStep && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {step === 0 ? "Get started" : "Next"}
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={!text.trim() || wordCount < 10}
                className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
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

"use client";

import { useState, useEffect, useCallback } from "react";
import type { DataType } from "@/lib/types";

/**
 * Unified onboarding wizard — reframed around web intelligence:
 *
 * Step 0: Welcome (what ScrapeCore does — web intelligence, not paste)
 * Step 1: API Keys (Anthropic required, Firecrawl + Perplexity recommended)
 * Step 2: Research question + population
 * Step 3: Data type selection
 * Step 4: Paste data (optional — can skip to collect from web)
 * Step 5: Review & run
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

const PROVIDERS = [
  { id: "anthropic", label: "Anthropic (Claude)", description: "Powers all COM-B behavioural analysis", prefix: "sk-ant-", placeholder: "sk-ant-api03-…", docsUrl: "https://console.anthropic.com/settings/keys", required: true },
  { id: "firecrawl", label: "Firecrawl", description: "Scrapes websites, app stores, and review sites", prefix: "fc-", placeholder: "fc-…", docsUrl: "https://www.firecrawl.dev/app/api-keys", required: false },
  { id: "perplexity", label: "Perplexity", description: "AI-powered web research and social listening", prefix: "pplx-", placeholder: "pplx-…", docsUrl: "https://www.perplexity.ai/settings/api", required: false },
];

const STEP_LABELS = ["Welcome", "API Keys", "Research question", "Data type", "Add data", "Review & run"];

interface WizardOverlayProps {
  showWelcome?: boolean;
  onDone: () => void;
  onComplete?: (params: { text: string; dataType: DataType; projectContext: string; skipAnalysis?: boolean }) => void;
}

export default function WizardOverlay({ showWelcome = true, onDone, onComplete }: WizardOverlayProps) {
  const startStep = showWelcome ? 0 : 2; // Skip welcome + keys if not first-run
  const [step, setStep] = useState(startStep);

  // API key state
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [keySaving, setKeySaving] = useState<string | null>(null);
  const [keySaved, setKeySaved] = useState<Set<string>>(new Set());
  const [keyErrors, setKeyErrors] = useState<Record<string, string>>({});
  const [platformKeys, setPlatformKeys] = useState<Record<string, boolean>>({});
  const [allKeysConfigured, setAllKeysConfigured] = useState(false);

  // Functional state
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

  // Check existing keys on mount
  const checkKeys = useCallback(async () => {
    try {
      const [keysRes, platformRes] = await Promise.all([
        fetch("/api/user/keys"),
        fetch("/api/platform-keys"),
      ]);
      const userKeys = keysRes.ok ? (await keysRes.json()).keys ?? [] : [];
      const platform = platformRes.ok ? await platformRes.json() : {};
      setPlatformKeys(platform);

      const configured = new Set<string>(userKeys.map((k: { provider: string }) => k.provider));
      const allDone = PROVIDERS.every((p) => configured.has(p.id) || platform[p.id]);
      setAllKeysConfigured(allDone);
      setKeySaved(configured);

      // Auto-skip API keys step if all are configured
      if (allDone && step === 1) {
        setStep(2);
      }
    } catch {
      // silent
    }
  }, [step]);

  useEffect(() => { checkKeys(); }, [checkKeys]);

  const handleSaveKey = async (providerId: string) => {
    const value = (keyInputs[providerId] ?? "").trim();
    const spec = PROVIDERS.find((p) => p.id === providerId)!;

    if (!value) {
      setKeyErrors((prev) => ({ ...prev, [providerId]: "Key is required" }));
      return;
    }
    if (!value.startsWith(spec.prefix)) {
      setKeyErrors((prev) => ({ ...prev, [providerId]: `Must start with "${spec.prefix}"` }));
      return;
    }

    setKeySaving(providerId);
    setKeyErrors((prev) => ({ ...prev, [providerId]: "" }));

    try {
      const res = await fetch("/api/user/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, key: value }),
      });
      if (res.ok) {
        setKeySaved((prev) => { const next = new Set(Array.from(prev)); next.add(providerId); return next; });
        setKeyInputs((prev) => ({ ...prev, [providerId]: "" }));
      } else {
        const data = await res.json();
        setKeyErrors((prev) => ({ ...prev, [providerId]: data.error ?? "Failed to save" }));
      }
    } catch {
      setKeyErrors((prev) => ({ ...prev, [providerId]: "Network error" }));
    } finally {
      setKeySaving(null);
    }
  };

  const canAdvance = [
    true,                                // step 0 — welcome
    true,                                // step 1 — API keys (can skip)
    question.trim().length > 0,          // step 2 — research question
    true,                                // step 3 — data type (always valid)
    true,                                // step 4 — data input (optional)
    true,                                // step 5 — review
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

  const handleRun = (skipAnalysis = false) => {
    if (onComplete) {
      onComplete({ text, dataType, projectContext, skipAnalysis });
    }
    onDone();
  };

  const handleSkipToExpert = () => {
    onDone();
  };

  // Progress indicator uses functional steps (skip welcome)
  const functionalSteps = STEP_LABELS.slice(1);
  const functionalIndex = step - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full mx-4 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              {step === 0 ? "Welcome to ScrapeCore" : "Guided setup"}
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

          {/* Progress indicator */}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Turn the web into behavioural insights</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-6">
                ScrapeCore uses <strong className="text-gray-700">Firecrawl</strong> and <strong className="text-gray-700">Perplexity</strong> to collect data from websites, app stores, social media, and news — then applies <strong className="text-gray-700">COM-B behavioural science</strong> to uncover barriers, motivators, and interventions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mb-4">
                {[
                  { label: "Scrape websites", desc: "URLs, app stores, reviews", color: "bg-brand-50 text-brand-600" },
                  { label: "Social listening", desc: "Reddit, news, forums", color: "bg-sky-50 text-sky-600" },
                  { label: "Company research", desc: "Full digital footprint", color: "bg-violet-50 text-violet-600" },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 text-center ${s.color.split(" ")[0]}`}>
                    <p className={`text-xs font-bold ${s.color.split(" ")[1]}`}>{s.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">
                AI-generated — expert review always required before operational use
              </p>
            </div>
          )}

          {/* Step 1 — API Keys */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                ScrapeCore needs API keys to work. Add at least your <strong>Anthropic</strong> key to get started. Firecrawl and Perplexity unlock web scraping and social listening.
              </p>
              {PROVIDERS.map((spec) => {
                const saved = keySaved.has(spec.id);
                const hasPlatform = platformKeys[spec.id];
                const configured = saved || hasPlatform;
                const error = keyErrors[spec.id];

                return (
                  <div key={spec.id} className={`rounded-xl border p-3 transition-colors ${configured ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200 bg-white"}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{spec.label}</p>
                          {spec.required && <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">Required</span>}
                          {!spec.required && <span className="text-[10px] font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">Recommended</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{spec.description}</p>
                      </div>
                      {configured && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          {hasPlatform && !saved ? "Platform key" : "Saved"}
                        </span>
                      )}
                    </div>
                    {!configured && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="password"
                          value={keyInputs[spec.id] ?? ""}
                          onChange={(e) => { setKeyInputs((prev) => ({ ...prev, [spec.id]: e.target.value })); setKeyErrors((prev) => ({ ...prev, [spec.id]: "" })); }}
                          placeholder={spec.placeholder}
                          autoComplete="off"
                          spellCheck={false}
                          className="flex-1 px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400/50"
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveKey(spec.id); }}
                        />
                        <button
                          onClick={() => handleSaveKey(spec.id)}
                          disabled={keySaving === spec.id}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
                        >
                          {keySaving === spec.id ? "..." : "Save"}
                        </button>
                        <a href={spec.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center px-2 text-xs text-brand-500 hover:text-brand-600 underline">Get key</a>
                      </div>
                    )}
                    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2 — Research question */}
          {step === 2 && (
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

          {/* Step 3 — Data type */}
          {step === 3 && (
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

          {/* Step 4 — Add data (optional) */}
          {step === 4 && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Add your data <span className="text-gray-400 font-normal">(optional)</span></p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Already have transcripts or survey data? Paste or upload them here. Otherwise, skip this — you can collect data from the web on the main screen.
                </p>
              </div>
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
                  placeholder="Paste qualitative text here — or skip to collect from the web..."
                  rows={8}
                  className="w-full px-3 py-3 text-sm text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none font-mono leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-gray-400">
                    {wordCount > 0 ? `${wordCount.toLocaleString()} words` : ""}
                  </p>
                  {fileError && <p className="text-xs text-red-500">{fileError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Review & run */}
          {step === 5 && (
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
                  <span className="text-sm text-gray-700">
                    {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${text.split(/\n+/).filter((l) => l.trim()).length} lines` : "None — collect from web after setup"}
                  </span>
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
            {step < 5 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance}
                className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {step === 0 ? "Get started" : step === 1 ? (allKeysConfigured || keySaved.size > 0 ? "Next" : "Skip for now") : step === 4 && !text.trim() ? "Skip — collect from web" : "Next"}
              </button>
            ) : (
              <>
                {text.trim() && wordCount >= 10 && (
                  <button
                    onClick={() => handleRun(true)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                    title="Load data into the editor so you can review and edit before running"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Load into editor
                  </button>
                )}
                <button
                  onClick={() => text.trim() && wordCount >= 10 ? handleRun(false) : handleSkipToExpert()}
                  className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
                >
                  {text.trim() && wordCount >= 10 ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Run analysis
                    </>
                  ) : (
                    "Start collecting data"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

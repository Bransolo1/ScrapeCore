"use client";

import { useState, useEffect, useCallback } from "react";

interface SetupStatusBarProps {
  onOpenSettings: (provider?: string) => void;
  analysisStatus: string;
  previewActive: boolean;
}

interface KeyStatus {
  anthropic: "user" | "platform" | "missing";
  firecrawl: "user" | "platform" | "missing";
  perplexity: "user" | "platform" | "missing";
}

const PROVIDERS = [
  { id: "anthropic" as const, label: "Anthropic", required: true },
  { id: "firecrawl" as const, label: "Firecrawl", required: false },
  { id: "perplexity" as const, label: "Perplexity", required: false },
];

export default function SetupStatusBar({ onOpenSettings, analysisStatus, previewActive }: SetupStatusBarProps) {
  const [keys, setKeys] = useState<KeyStatus>({ anthropic: "missing", firecrawl: "missing", perplexity: "missing" });
  const [loaded, setLoaded] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const [keysRes, platformRes] = await Promise.all([
        fetch("/api/user/keys"),
        fetch("/api/platform-keys"),
      ]);
      const userKeys = keysRes.ok ? (await keysRes.json()).keys ?? [] : [];
      const platform = platformRes.ok ? await platformRes.json() : {};

      const userProviders = new Set(userKeys.map((k: { provider: string }) => k.provider));
      setKeys({
        anthropic: userProviders.has("anthropic") ? "user" : platform.anthropic ? "platform" : "missing",
        firecrawl: userProviders.has("firecrawl") ? "user" : platform.firecrawl ? "platform" : "missing",
        perplexity: userProviders.has("perplexity") ? "user" : platform.perplexity ? "platform" : "missing",
      });
    } catch {
      // silent
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const hasMissing = Object.values(keys).some((v) => v === "missing");

  const steps = [
    { label: "Collect", active: analysisStatus === "idle" && !previewActive },
    { label: "Preview", active: previewActive },
    { label: "Analyse", active: analysisStatus === "streaming" },
    { label: "Validate", active: analysisStatus === "complete" },
  ];

  if (!loaded) return null;

  return (
    <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
      {/* API key status — only shown when keys are missing */}
      {hasMissing ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500">API Keys:</span>
          {PROVIDERS.map((p) => {
            const status = keys[p.id];
            const configured = status !== "missing";
            return (
              <button
                key={p.id}
                onClick={() => !configured ? onOpenSettings(p.id) : undefined}
                disabled={configured}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                  configured
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 cursor-default"
                    : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer"
                }`}
                title={configured ? `${p.label}: ${status === "user" ? "Your key" : "Platform key"}` : `Click to add ${p.label} key`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`} />
                {p.label}
                {!configured && p.required && <span className="text-amber-500">*</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          All API keys configured
        </div>
      )}

      {/* Pipeline step indicator — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s.label} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="w-3 h-3 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              s.active
                ? "bg-brand-100 text-brand-700 border border-brand-200"
                : "text-gray-400 bg-gray-100"
            }`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

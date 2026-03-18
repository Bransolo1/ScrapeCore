"use client";

import { useState, useEffect } from "react";

interface SettingsModalProps {
  onClose: () => void;
}

declare global {
  interface Window {
    electronAPI?: {
      getApiKey: () => Promise<string>;
      applyApiKey: (key: string) => Promise<boolean>;
    };
  }
}

const isElectron = typeof window !== "undefined" && !!window.electronAPI;

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isElectron) {
      window.electronAPI!.getApiKey().then((k) => {
        if (k) setApiKey(k);
      });
    }
  }, []);

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) { setError("API key is required."); return; }
    if (!trimmed.startsWith("sk-ant-")) { setError("Key should start with sk-ant- — check console.anthropic.com"); return; }

    setError(null);
    if (isElectron) {
      await window.electronAPI!.applyApiKey(trimmed);
    } else {
      // In web/Docker mode: show instructions — can't write to process.env at runtime
      setSaved(true);
      return;
    }
    setSaved(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* API key section */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Anthropic API Key
            </label>
            {isElectron ? (
              <>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setSaved(false); setError(null); }}
                  placeholder="sk-ant-api03-…"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full px-3 py-2 text-sm font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Get your key at{" "}
                  <button
                    onClick={() => window.open("https://console.anthropic.com/settings/keys", "_blank")}
                    className="text-brand-600 hover:text-brand-700 underline"
                  >
                    console.anthropic.com
                  </button>{" "}
                  → API Keys
                </p>
                {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
                {saved && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API key saved — active immediately.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium mb-1">Running in web / Docker mode</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Set <code className="bg-amber-100 px-1 rounded font-mono">ANTHROPIC_API_KEY</code> in your{" "}
                  <code className="bg-amber-100 px-1 rounded font-mono">.env.docker</code> or{" "}
                  <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code> file and restart the server.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Optional keys (display-only for now) */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Optional integrations</p>
            <div className="space-y-2">
              {[
                { label: "Perplexity API Key", env: "PERPLEXITY_API_KEY", hint: "Enables live web research & social listening" },
                { label: "Firecrawl API Key", env: "FIRECRAWL_API_KEY", hint: "Enables JS-rendered site scraping (G2, Capterra, SPAs)" },
              ].map(({ label, env, hint }) => (
                <div key={env} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{hint} — set <code className="font-mono">{env}</code> in your env file.</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        {isElectron && (
          <div className="px-6 pb-6 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium rounded-lg hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

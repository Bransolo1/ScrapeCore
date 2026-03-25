"use client";

import { useState, useEffect, useCallback } from "react";

interface SettingsModalProps {
  onClose: () => void;
  initialProvider?: string;
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

interface KeyInfo {
  provider: string;
  hint: string;
  updatedAt: string;
}

interface PlatformKeys {
  anthropic: boolean;
  firecrawl: boolean;
  perplexity: boolean;
}

const PROVIDERS = [
  {
    id: "anthropic" as const,
    label: "Anthropic (Claude)",
    description: "Powers all COM-B behavioural analysis",
    prefix: "sk-ant-",
    placeholder: "sk-ant-api03-…",
    docsUrl: "https://console.anthropic.com/settings/keys",
    required: true,
  },
  {
    id: "firecrawl" as const,
    label: "Firecrawl",
    description: "JS-rendered scraping for SPAs, G2, Capterra",
    prefix: "fc-",
    placeholder: "fc-…",
    docsUrl: "https://www.firecrawl.dev/app/api-keys",
    required: false,
  },
  {
    id: "perplexity" as const,
    label: "Perplexity",
    description: "Live web research and Twitter/X social listening",
    prefix: "pplx-",
    placeholder: "pplx-…",
    docsUrl: "https://www.perplexity.ai/settings/api",
    required: false,
  },
] as const;

type ProviderId = (typeof PROVIDERS)[number]["id"];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-3.5 h-3.5"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className ?? "w-4 h-4"} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function SettingsModal({ onClose, initialProvider }: SettingsModalProps) {
  const [userKeys, setUserKeys] = useState<KeyInfo[]>([]);
  const [platformKeys, setPlatformKeys] = useState<PlatformKeys>({ anthropic: false, firecrawl: false, perplexity: false });
  const [loading, setLoading] = useState(true);

  // Per-provider editing state
  const [editing, setEditing] = useState<ProviderId | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successProvider, setSuccessProvider] = useState<ProviderId | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const [keysRes, platformRes] = await Promise.all([
        fetch("/api/user/keys"),
        fetch("/api/platform-keys"),
      ]);
      if (keysRes.ok) {
        const data = await keysRes.json();
        setUserKeys(data.keys ?? []);
      }
      if (platformRes.ok) {
        const data = await platformRes.json();
        setPlatformKeys(data);
      }
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys().then(() => {
      if (initialProvider && PROVIDERS.some((p) => p.id === initialProvider)) {
        setEditing(initialProvider as ProviderId);
      }
    });
  }, [fetchKeys, initialProvider]);

  const getUserKey = (provider: ProviderId): KeyInfo | undefined =>
    userKeys.find((k) => k.provider === provider);

  const hasPlatformKey = (provider: ProviderId): boolean =>
    platformKeys[provider] ?? false;

  const handleSave = async (provider: ProviderId) => {
    const trimmed = inputValue.trim();
    const spec = PROVIDERS.find((p) => p.id === provider)!;

    if (!trimmed) {
      setError("API key is required.");
      return;
    }
    if (!trimmed.startsWith(spec.prefix)) {
      setError(`Key must start with "${spec.prefix}"`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/user/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save key");
        return;
      }

      // Also save to Electron if it's the Anthropic key
      if (isElectron && provider === "anthropic") {
        await window.electronAPI!.applyApiKey(trimmed);
      }

      setSuccessProvider(provider);
      setEditing(null);
      setInputValue("");
      setTimeout(() => setSuccessProvider(null), 3000);
      await fetchKeys();
    } catch {
      setError("Network error — could not save key");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (provider: ProviderId) => {
    try {
      await fetch("/api/user/keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      await fetchKeys();
    } catch {
      // silent
    }
  };

  const startEditing = (provider: ProviderId) => {
    setEditing(provider);
    setInputValue("");
    setError(null);
    setSuccessProvider(null);
  };

  const cancelEditing = () => {
    setEditing(null);
    setInputValue("");
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in border border-gray-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <KeyIcon className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Settings</h2>
              <p className="text-[11px] text-gray-400">Manage API keys and preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Section header */}
          <div>
            <p className="text-sm font-semibold text-gray-700">API Keys</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Add your own keys to control costs. Keys are encrypted at rest (AES-256).
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <SpinnerIcon />
              <span className="ml-2 text-xs text-gray-400">Loading…</span>
            </div>
          ) : (
            <div className="space-y-3">
              {PROVIDERS.map((spec) => {
                const userKey = getUserKey(spec.id);
                const platformAvailable = hasPlatformKey(spec.id);
                const isEditing = editing === spec.id;
                const justSaved = successProvider === spec.id;

                return (
                  <div
                    key={spec.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      userKey
                        ? "border-emerald-200 bg-emerald-50/30"
                        : platformAvailable
                        ? "border-gray-200 bg-surface-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-800">{spec.label}</p>
                          {spec.required && (
                            <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{spec.description}</p>
                      </div>

                      {/* Status badge */}
                      <div className="shrink-0">
                        {userKey ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <CheckIcon className="w-3 h-3" />
                            Your key
                          </span>
                        ) : platformAvailable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Platform key
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            Not configured
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connected state */}
                    {userKey && !isEditing && (
                      <div className="mt-3 flex items-center gap-2">
                        <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{userKey.hint}</code>
                        <button
                          onClick={() => startEditing(spec.id)}
                          className="text-[11px] text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => handleRemove(spec.id)}
                          className="text-[11px] text-gray-400 hover:text-red-600 font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {/* Not connected — show Add button */}
                    {!userKey && !isEditing && (
                      <div className="mt-3">
                        <button
                          onClick={() => startEditing(spec.id)}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add your key
                        </button>
                      </div>
                    )}

                    {/* Editing state — input field */}
                    {isEditing && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="password"
                          value={inputValue}
                          onChange={(e) => { setInputValue(e.target.value); setError(null); }}
                          placeholder={spec.placeholder}
                          autoComplete="off"
                          spellCheck={false}
                          autoFocus
                          className="w-full px-3 py-2 text-sm font-mono bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400"
                          onKeyDown={(e) => { if (e.key === "Enter") handleSave(spec.id); if (e.key === "Escape") cancelEditing(); }}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSave(spec.id)}
                            disabled={saving}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {saving ? <SpinnerIcon /> : null}
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                          <a
                            href={spec.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-[11px] text-brand-500 hover:text-brand-600 underline"
                          >
                            Get a key
                          </a>
                        </div>
                        {error && <p className="text-xs text-red-600">{error}</p>}
                      </div>
                    )}

                    {/* Success flash */}
                    {justSaved && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                        <CheckIcon className="w-3.5 h-3.5" />
                        Key saved — active immediately.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Security note */}
          <div className="bg-surface-50 rounded-xl px-4 py-3 border border-gray-100">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <span className="font-semibold">Security:</span> Keys are encrypted with AES-256-GCM before storage. Only the last 4 characters are shown. Keys are never logged or shared with other users.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

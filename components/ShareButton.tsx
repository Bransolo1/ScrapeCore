"use client";

import { useState } from "react";

interface ShareButtonProps {
  analysisId: string;
}

export default function ShareButton({ analysisId }: ShareButtonProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function createLink() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/share`, { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        const fullUrl = `${window.location.origin}${data.url}`;
        setShareUrl(fullUrl);
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revokeLink() {
    if (!window.confirm("Revoke this share link? Anyone with the link will lose access.")) return;
    await fetch(`/api/analyses/${analysisId}/share`, { method: "DELETE" });
    setShareUrl(null);
  }

  if (shareUrl) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 max-w-48">
          <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-xs text-emerald-700 font-medium truncate">{shareUrl.split("/").slice(-1)[0]}</span>
        </div>
        <button
          onClick={copyLink}
          title="Copy link"
          className={`p-1.5 rounded-lg text-xs font-medium transition-all ${copied ? "bg-emerald-500 text-white" : "text-gray-500 hover:bg-gray-100"}`}
        >
          {copied ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        <button
          onClick={revokeLink}
          title="Revoke link"
          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={createLink}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200 transition-all disabled:opacity-50"
      title="Create shareable read-only link"
    >
      {loading ? (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      )}
      Share
    </button>
  );
}

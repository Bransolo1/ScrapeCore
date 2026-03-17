"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export default function ProjectContextInput({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className="text-xs font-medium text-gray-700">Research context</span>
          {value.trim() && (
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" title="Context set" />
          )}
        </div>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 bg-white">
          <p className="text-xs text-gray-500 mb-2 leading-relaxed">
            Describe your research question, target population, or focus area to help Claude tailor the analysis.
          </p>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="e.g. We are a diabetes prevention team targeting adults aged 40–65 in low-income urban areas. Focus on dietary behaviour change."
            rows={3}
            disabled={disabled}
            className="w-full text-xs text-gray-800 placeholder-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent leading-relaxed"
          />
        </div>
      )}
    </div>
  );
}

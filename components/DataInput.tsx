"use client";

import { useRef, useMemo, useState } from "react";
import type { DataType } from "@/lib/types";
import { EXAMPLE_DATA } from "@/lib/prompts";
import ProjectContextInput from "./ProjectContextInput";
import { checkInputDiversity } from "@/lib/diversity";

interface DataInputProps {
  text: string;
  dataType: DataType;
  isLoading: boolean;
  projectContext: string;
  onTextChange: (text: string) => void;
  onDataTypeChange: (dt: DataType) => void;
  onProjectContextChange: (v: string) => void;
  onSubmit: () => void;
}

const DATA_TYPES: { value: DataType; label: string; description: string }[] = [
  { value: "survey", label: "Survey responses", description: "Open-ended survey or questionnaire responses" },
  { value: "interviews", label: "Interview data", description: "Interview transcripts or research notes" },
  { value: "reviews", label: "Reviews", description: "Product, service, or app reviews" },
  { value: "free_text", label: "Free text", description: "Any unstructured qualitative text" },
  { value: "social", label: "Social listening", description: "Social media posts or community comments" },
  { value: "competitor", label: "Competitor intel", description: "Reviews, messaging, or UX signals from a competitor" },
];

export default function DataInput({
  text,
  dataType,
  isLoading,
  projectContext,
  onTextChange,
  onDataTypeChange,
  onProjectContextChange,
  onSubmit,
}: DataInputProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const readFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) return; // 5MB limit
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") onTextChange(result);
    };
    reader.readAsText(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const loadExample = () => {
    if (text.trim().length > 0 && !window.confirm("This will replace your current text with example data. Continue?")) {
      return;
    }
    onTextChange(EXAMPLE_DATA.text);
    onDataTypeChange(EXAMPLE_DATA.dataType);
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text.trim() ? text.trim().split(/\n+/).filter(Boolean).length : 0;
  const canSubmit = text.trim().length > 50 && !isLoading;

  const diversity = useMemo(
    () => (text.trim().length > 50 ? checkInputDiversity(text) : null),
    [text],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 px-4 py-5 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragging
            ? "border-brand-400 bg-brand-50"
            : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100"
        }`}
      >
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-600">
            Drop a file here or <span className="text-brand-600">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Focus group transcripts, interview notes, survey exports (.txt, .csv, .md)
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.md"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400 font-medium">or paste text below</span>
        <div className="flex-1 h-px bg-gray-100" />
      </div>

      {/* Data type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Data type</label>
        <div className="grid grid-cols-2 gap-1.5">
          {DATA_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => onDataTypeChange(dt.value)}
              className={`text-left px-2.5 py-2 rounded-lg border text-xs transition-all ${
                dataType === dt.value
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <span className="font-medium">{dt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Research context */}
      <ProjectContextInput
        value={projectContext}
        onChange={onProjectContextChange}
        disabled={isLoading}
      />

      {/* Text input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-medium text-gray-500">Text input</label>
          <button
            onClick={loadExample}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            disabled={isLoading}
          >
            Load example
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste qualitative text here — one response per line works best."
          className="w-full h-48 px-3 py-3 text-sm text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono leading-relaxed"
          disabled={isLoading}
        />
        <div className="mt-1.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${lineCount} text units` : ""}
            </p>
            {wordCount > 0 && wordCount < 50 && (
              <p className="text-xs text-amber-500">{50 - wordCount} more words needed</p>
            )}
          </div>
          {wordCount > 0 && wordCount < 50 && (
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (wordCount / 50) * 100)}%` }}
              />
            </div>
          )}
        </div>
        {diversity?.warning && (
          <div className="flex items-start gap-2 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-700 leading-snug">{diversity.warning}</p>
          </div>
        )}
      </div>

      {/* Analyse button */}
      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          canSubmit
            ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isLoading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analysing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Run behavioural analysis
          </>
        )}
      </button>

      {/* Framework note */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 font-medium mb-1">What this analyses</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Applies the <strong>COM-B model</strong> (Capability, Opportunity, Motivation → Behaviour) and <strong>Behaviour Change Wheel</strong> to map behavioural signals, barriers, motivators, and intervention opportunities from your data.
        </p>
      </div>
    </div>
  );
}

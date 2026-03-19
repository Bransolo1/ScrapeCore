"use client";

import { useRef, useMemo, useState, useCallback } from "react";
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

/** Try to auto-detect data type from file name or content */
function inferDataType(filename: string, content: string): DataType | null {
  const lower = filename.toLowerCase();
  if (lower.includes("survey") || lower.includes("questionnaire")) return "survey";
  if (lower.includes("interview") || lower.includes("transcript")) return "interviews";
  if (lower.includes("review")) return "reviews";
  if (lower.includes("social") || lower.includes("twitter") || lower.includes("reddit")) return "social";
  if (lower.includes("competitor") || lower.includes("competitive")) return "competitor";

  // Content-based detection
  const sample = content.slice(0, 2000).toLowerCase();
  if (sample.includes("q:") && sample.includes("a:")) return "interviews";
  if (/\b(stars?|rating|★|☆)\b/.test(sample)) return "reviews";
  if (/@\w|#\w|tweet|reddit|r\//.test(sample)) return "social";

  return null;
}

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
  const [isDragOver, setIsDragOver] = useState(false);

  const readFileAsText = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        resolve(typeof result === "string" ? result : "");
      };
      reader.onerror = () => resolve("");
      reader.readAsText(file);
    });
  }, []);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const allText: string[] = [];
    let detectedType: DataType | null = null;

    for (const file of Array.from(files)) {
      const content = await readFileAsText(file);
      if (content.trim()) {
        allText.push(content);
        if (!detectedType) {
          detectedType = inferDataType(file.name, content);
        }
      }
    }

    if (allText.length > 0) {
      onTextChange(allText.join("\n\n---\n\n"));
      if (detectedType) onDataTypeChange(detectedType);
    }
  }, [onTextChange, onDataTypeChange, readFileAsText]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      return;
    }

    const droppedText = e.dataTransfer.getData("text/plain");
    if (droppedText) {
      onTextChange(text ? text + "\n\n" + droppedText : droppedText);
    }
  }, [handleFiles, onTextChange, text]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const loadExample = () => {
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
    <div className="flex flex-col gap-5">
      {/* Data type */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">Data type</label>
        <div className="grid grid-cols-1 gap-1.5">
          {DATA_TYPES.map((dt) => (
            <button
              key={dt.value}
              onClick={() => onDataTypeChange(dt.value)}
              className={`text-left px-3.5 py-2.5 rounded-xl border text-sm transition-all ${
                dataType === dt.value
                  ? "border-brand-400 bg-brand-50 text-brand-700 shadow-sm shadow-brand-100"
                  : "border-gray-200 bg-surface-50 text-gray-600 hover:border-gray-300 hover:bg-white"
              }`}
            >
              <span className="font-medium">{dt.label}</span>
              <span className="text-xs text-gray-400 ml-2">{dt.description}</span>
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-600">Input data</label>
          <div className="flex items-center gap-2">
            <button
              onClick={loadExample}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              disabled={isLoading}
            >
              Load example
            </button>
            <span className="text-gray-200">|</span>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              disabled={isLoading}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload files
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.csv,.tsv,.md,.json,.xml,.log,.rtf"
              className="hidden"
              onChange={handleFile}
              multiple
            />
          </div>
        </div>
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-xl border-2 transition-colors ${
            isDragOver
              ? "border-brand-400 bg-brand-50/50 border-dashed"
              : "border-transparent"
          }`}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-brand-50/80 rounded-xl z-10 pointer-events-none">
              <div className="text-center">
                <svg className="w-8 h-8 text-brand-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-brand-600">Drop files or text here</p>
                <p className="text-xs text-brand-400">.txt, .csv, .json, .md and more</p>
              </div>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Paste text, drag files, or upload — survey responses, interview excerpts, reviews, or social exports.

One response per line works best for the analysis."
            className="w-full h-64 px-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 bg-surface-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 focus:bg-white font-mono leading-relaxed"
            disabled={isLoading}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-gray-400">
            {wordCount > 0 ? `${wordCount.toLocaleString()} words · ${lineCount} text units` : "Paste, drag, or upload files to begin"}
          </p>
          {wordCount > 0 && wordCount < 50 && (
            <p className="text-xs text-amber-500">Add more text for a reliable analysis</p>
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
        className={`w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          canSubmit
            ? "bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/30"
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
      <div className="bg-surface-50 rounded-xl p-3 border border-gray-100">
        <p className="text-xs text-gray-500 font-medium mb-1">What this analyses</p>
        <p className="text-xs text-gray-400 leading-relaxed">
          Applies the <strong className="text-gray-500">COM-B model</strong> (Capability, Opportunity, Motivation → Behaviour) and <strong className="text-gray-500">Behaviour Change Wheel</strong> to map behavioural signals, barriers, motivators, and intervention opportunities from your data.
        </p>
      </div>
    </div>
  );
}

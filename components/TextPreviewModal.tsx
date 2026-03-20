"use client";

import { useState } from "react";
import type { DataType } from "@/lib/types";

const DATA_TYPES: { value: DataType; label: string }[] = [
  { value: "survey", label: "Survey responses" },
  { value: "interviews", label: "Interview data" },
  { value: "reviews", label: "Reviews" },
  { value: "social", label: "Social listening" },
  { value: "free_text", label: "Free text" },
  { value: "competitor", label: "Competitor intel" },
];

interface TextPreviewModalProps {
  text: string;
  dataType: DataType;
  onConfirm: (text: string, dataType: DataType) => void;
  onCancel: () => void;
}

export default function TextPreviewModal({ text, dataType, onConfirm, onCancel }: TextPreviewModalProps) {
  const [editedText, setEditedText] = useState(text);
  const [selectedType, setSelectedType] = useState<DataType>(dataType);

  const wordCount = editedText.trim() ? editedText.trim().split(/\s+/).length : 0;
  const lineCount = editedText.split(/\n+/).filter((l) => l.trim()).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-fade-in flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Review collected text</h2>
              <p className="text-xs text-gray-500 mt-1">Review and edit the assembled text before running analysis.</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cancel"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Data type selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as DataType)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            >
              {DATA_TYPES.map((dt) => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Editable text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-600">Collected text</label>
              <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words · {lineCount} lines</span>
            </div>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={14}
              className="w-full px-3 py-3 text-sm text-gray-800 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none font-mono leading-relaxed"
            />
            {wordCount > 0 && wordCount < 50 && (
              <p className="text-xs text-amber-500 mt-1">{50 - wordCount} more words needed for reliable results</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <button
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(editedText, selectedType)}
            disabled={!editedText.trim() || wordCount < 10}
            className="px-5 py-2 text-sm bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Run analysis
          </button>
        </div>
      </div>
    </div>
  );
}

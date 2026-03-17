"use client";

import type { PIIScanResult, PIIType } from "@/lib/pii";

interface PIIWarningModalProps {
  result: PIIScanResult;
  onContinue: () => void;
  onRedactAndContinue: () => void;
  onCancel: () => void;
}

const PII_ICONS: Partial<Record<PIIType, string>> = {
  email: "✉",
  phone: "📞",
  credit_card: "💳",
  ssn: "🪪",
  national_insurance: "🪪",
  nhs_number: "🏥",
  ip_address: "🌐",
  date_of_birth: "📅",
  passport: "🛂",
};

export default function PIIWarningModal({
  result,
  onContinue,
  onRedactAndContinue,
  onCancel,
}: PIIWarningModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Possible personal data detected</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {result.totalCount} potential PII instance{result.totalCount !== 1 ? "s" : ""} found before sending to Claude. Review before continuing.
            </p>
          </div>
        </div>

        {/* PII breakdown */}
        <div className="px-5 pb-4">
          <div className="space-y-2">
            {result.matches.map((match) => (
              <div key={match.type} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                <span className="text-lg leading-none mt-0.5 shrink-0">
                  {PII_ICONS[match.type] ?? "🔐"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-gray-800">{match.label}</p>
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                      {match.count}×
                    </span>
                  </div>
                  {match.examples.length > 0 && (
                    <p className="text-xs text-gray-500 font-mono truncate">
                      e.g. {match.examples.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <div className="mx-5 mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2">
          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-blue-700 leading-relaxed">
            <strong>Redact and continue</strong> replaces detected PII with <code>[REDACTED_TYPE]</code> tokens before analysis. This is recommended if the data belongs to real people.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onContinue}
            className="flex-1 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl px-4 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Send anyway
          </button>
          <button
            onClick={onRedactAndContinue}
            className="flex-1 text-sm font-semibold bg-gray-900 text-white rounded-xl px-4 py-2.5 hover:bg-gray-700 transition-colors"
          >
            Redact & continue
          </button>
        </div>
      </div>
    </div>
  );
}

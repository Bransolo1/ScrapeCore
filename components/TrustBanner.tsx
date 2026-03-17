"use client";

export default function TrustBanner() {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
      <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-amber-800 leading-snug">
        <strong>AI-generated analysis.</strong> All findings should be reviewed by a qualified behavioural science practitioner before operational or policy use. Grounding scores and validity indicators are provided to assist — not replace — expert judgement.
      </p>
    </div>
  );
}

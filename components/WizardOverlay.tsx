"use client";

import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to ScrapeCore",
    body: "ScrapeCore transforms qualitative text — survey responses, interviews, reviews — into structured behavioural insights using the COM-B framework and Behaviour Change Wheel.",
    icon: (
      <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  {
    title: "Paste your data",
    body: "Paste raw qualitative text into the input panel. Choose the correct data type (survey, interviews, reviews, social) to help the AI calibrate its analysis. You can also scrape URLs or social posts directly.",
    icon: (
      <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    title: "Review with confidence",
    body: "Every analysis shows a grounding score (are quotes traceable?), validity indicators (are interventions well-specified?), and lets you confirm, dispute, or annotate findings. AI-generated — expert review always required.",
    icon: (
      <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

interface Props {
  onDone: () => void;
}

export default function WizardOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 animate-fade-in">
        {/* Step indicator */}
        <div className="flex items-center gap-2 justify-center mb-6">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? "bg-brand-500 w-4" : i < step ? "bg-brand-300" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
            {current.icon}
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.body}</p>
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={onDone}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onDone}
                className="px-5 py-2 text-sm bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
              >
                Get started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

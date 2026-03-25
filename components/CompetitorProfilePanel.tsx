"use client";

import { useState } from "react";
import type { CompanyModel } from "@/lib/types";

interface SectionProps {
  title: string;
  items: string[];
  dotCls: string;
  bgCls: string;
  borderCls: string;
  titleCls: string;
}

function ProfileSection({ title, items, dotCls, bgCls, borderCls, titleCls }: SectionProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-xl border p-4 ${bgCls} ${borderCls}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${titleCls}`}>{title}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${dotCls}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  model: CompanyModel;
}

export default function CompetitorProfilePanel({ model }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <section className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-800 text-left"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-semibold text-white">Competitor profile</span>
          <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">Strategic intelligence</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="p-5 bg-slate-50 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Inferred from publicly available signals. All findings below are inference, not confirmed fact — confidence varies by item.
          </p>

          <ProfileSection
            title="Observed signals"
            items={model.observed_signals}
            dotCls="bg-slate-500"
            bgCls="bg-white"
            borderCls="border-slate-200"
            titleCls="text-slate-600"
          />
          <ProfileSection
            title="High-confidence inferences"
            items={model.high_confidence_inferences}
            dotCls="bg-emerald-500"
            bgCls="bg-emerald-50"
            borderCls="border-emerald-200"
            titleCls="text-emerald-700"
          />
          <ProfileSection
            title="Medium-confidence inferences"
            items={model.medium_confidence_inferences}
            dotCls="bg-amber-400"
            bgCls="bg-amber-50"
            borderCls="border-amber-200"
            titleCls="text-amber-700"
          />
          <ProfileSection
            title="Unknowns"
            items={model.unknowns}
            dotCls="bg-gray-400"
            bgCls="bg-gray-50"
            borderCls="border-gray-200"
            titleCls="text-gray-500"
          />
          <ProfileSection
            title="Strategic implications"
            items={model.strategic_implications}
            dotCls="bg-brand-500"
            bgCls="bg-brand-50"
            borderCls="border-brand-200"
            titleCls="text-brand-700"
          />
          <ProfileSection
            title="Opportunities to beat them"
            items={model.opportunities_to_beat_them}
            dotCls="bg-teal-500"
            bgCls="bg-teal-50"
            borderCls="border-teal-200"
            titleCls="text-teal-700"
          />
        </div>
      )}
    </section>
  );
}

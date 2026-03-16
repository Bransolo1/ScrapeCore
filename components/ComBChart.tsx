"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import type { ComBMapping } from "@/lib/types";

interface ComBChartProps {
  mapping: ComBMapping;
}

const DIMENSIONS = [
  {
    key: "cap_physical",
    label: "Physical\nCapability",
    shortLabel: "C-Phys",
    color: "#7c3aed",
    group: "Capability",
  },
  {
    key: "cap_psych",
    label: "Psychological\nCapability",
    shortLabel: "C-Psych",
    color: "#8b5cf6",
    group: "Capability",
  },
  {
    key: "opp_physical",
    label: "Physical\nOpportunity",
    shortLabel: "O-Phys",
    color: "#0284c7",
    group: "Opportunity",
  },
  {
    key: "opp_social",
    label: "Social\nOpportunity",
    shortLabel: "O-Soc",
    color: "#0ea5e9",
    group: "Opportunity",
  },
  {
    key: "mot_reflective",
    label: "Reflective\nMotivation",
    shortLabel: "M-Ref",
    color: "#d97706",
    group: "Motivation",
  },
  {
    key: "mot_automatic",
    label: "Automatic\nMotivation",
    shortLabel: "M-Auto",
    color: "#f59e0b",
    group: "Motivation",
  },
] as const;

const GROUP_COLORS: Record<string, string> = {
  Capability: "#7c3aed",
  Opportunity: "#0284c7",
  Motivation: "#d97706",
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { fullLabel: string; group: string; items: string[] } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm max-w-52">
      <p className="font-semibold text-gray-800 mb-1">{d.fullLabel}</p>
      <p className="text-xs text-gray-500 mb-2">{d.group} dimension</p>
      {d.items.length > 0 ? (
        <ul className="space-y-1">
          {d.items.map((item: string, i: number) => (
            <li key={i} className="text-xs text-gray-600 flex gap-1.5">
              <span className="text-gray-400 shrink-0">·</span>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-400 italic">No signals identified</p>
      )}
    </div>
  );
}

export default function ComBChart({ mapping }: ComBChartProps) {
  const data = [
    {
      key: "cap_physical",
      shortLabel: "C-Phys",
      fullLabel: "Physical Capability",
      group: "Capability",
      color: DIMENSIONS[0].color,
      value: mapping.capability.physical.length,
      items: mapping.capability.physical,
    },
    {
      key: "cap_psych",
      shortLabel: "C-Psych",
      fullLabel: "Psychological Capability",
      group: "Capability",
      color: DIMENSIONS[1].color,
      value: mapping.capability.psychological.length,
      items: mapping.capability.psychological,
    },
    {
      key: "opp_physical",
      shortLabel: "O-Phys",
      fullLabel: "Physical Opportunity",
      group: "Opportunity",
      color: DIMENSIONS[2].color,
      value: mapping.opportunity.physical.length,
      items: mapping.opportunity.physical,
    },
    {
      key: "opp_social",
      shortLabel: "O-Soc",
      fullLabel: "Social Opportunity",
      group: "Opportunity",
      color: DIMENSIONS[3].color,
      value: mapping.opportunity.social.length,
      items: mapping.opportunity.social,
    },
    {
      key: "mot_ref",
      shortLabel: "M-Ref",
      fullLabel: "Reflective Motivation",
      group: "Motivation",
      color: DIMENSIONS[4].color,
      value: mapping.motivation.reflective.length,
      items: mapping.motivation.reflective,
    },
    {
      key: "mot_auto",
      shortLabel: "M-Auto",
      fullLabel: "Automatic Motivation",
      group: "Motivation",
      color: DIMENSIONS[5].color,
      value: mapping.motivation.automatic.length,
      items: mapping.motivation.automatic,
    },
  ];

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  // Group legend
  const groups = Object.entries(GROUP_COLORS);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">COM-B Dimension Strength</h3>
        <div className="flex items-center gap-3">
          {groups.map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} barCategoryGap="20%" margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="shortLabel"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, maxVal + 1]}
            tickCount={maxVal + 2}
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={entry.color} fillOpacity={entry.value === 0 ? 0.2 : 0.85} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              style={{ fontSize: 11, fontWeight: 600, fill: "#64748b" }}
              formatter={(v: number) => (v > 0 ? v : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-1 text-center">
        Signals identified per sub-dimension — hover bars for detail
      </p>
    </div>
  );
}

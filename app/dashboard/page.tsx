"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number;
  avgInputTokens: number;
  avgOutputTokens: number;
  avgDurationMs: number;
  totalBarriers: number;
  totalMotivators: number;
  totalInterventions: number;
  confidence: Record<string, number>;
  byDataType: Record<string, number>;
  comBStrength: Record<string, number>;
  trend: { date: string; count: number }[];
  rubricGrades: Record<string, number>;
  rubricTrend: { date: string; avgTotal: number; count: number }[];
  promptVersions: Record<string, number>;
  avgGroundingScore: number | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMB_LABELS: Record<string, { label: string; color: string; group: string }> = {
  cap_physical:  { label: "Phys Cap",    color: "#7c3aed", group: "Capability" },
  cap_psych:     { label: "Psych Cap",   color: "#8b5cf6", group: "Capability" },
  opp_physical:  { label: "Phys Opp",   color: "#0284c7", group: "Opportunity" },
  opp_social:    { label: "Soc Opp",    color: "#0ea5e9", group: "Opportunity" },
  mot_reflective:{ label: "Refl Mot",   color: "#d97706", group: "Motivation" },
  mot_automatic: { label: "Auto Mot",   color: "#f59e0b", group: "Motivation" },
};

const DATA_TYPE_COLORS: Record<string, string> = {
  survey:     "#f97316",
  reviews:    "#0ea5e9",
  social:     "#f59e0b",
  interviews: "#10b981",
  free_text:  "#94a3b8",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high:   "#10b981",
  medium: "#f59e0b",
  low:    "#f43f5e",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: color + "1a" }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="text-gray-500 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-gray-800">
          {p.value} {p.name ?? ""}
        </p>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-8">
      <div className="w-16 h-16 bg-brand-50 border border-brand-200 rounded-2xl flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">No analyses yet</h3>
      <p className="text-sm text-gray-400 max-w-sm leading-relaxed mb-6">
        Run your first behavioural analysis to start seeing market intelligence patterns here.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Start analysing
      </Link>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analyses/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setStats(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const formatMs = (ms: number) =>
    ms >= 60_000 ? `${(ms / 60_000).toFixed(1)}m` : `${(ms / 1000).toFixed(1)}s`;

  const formatTokens = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Intelligence Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Patterns and trends across all your behavioural analyses
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center min-h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading intelligence…</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && stats && stats.total === 0 && <EmptyDashboard />}

        {!loading && !error && stats && stats.total > 0 && (
          <div className="space-y-6">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                label="Total Analyses"
                value={stats.total}
                sub="All-time"
                color="#f97316"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <KPICard
                label="Barriers Found"
                value={stats.totalBarriers}
                sub={`${stats.total > 0 ? (stats.totalBarriers / stats.total).toFixed(1) : 0} avg/analysis`}
                color="#f43f5e"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
              <KPICard
                label="Interventions"
                value={stats.totalInterventions}
                sub="BCW opportunities"
                color="#10b981"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
              />
              <KPICard
                label="Avg Analysis Time"
                value={stats.avgDurationMs > 0 ? formatMs(stats.avgDurationMs) : "—"}
                sub={`${formatTokens(stats.avgOutputTokens)} tokens avg out`}
                color="#f59e0b"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Activity Trend + COM-B Strength */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Trend */}
              <SectionCard title="Analysis Activity">
                {stats.trend.length < 2 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">
                    Run more analyses to see activity trend.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={stats.trend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(d) => d.slice(5)} // MM-DD
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="analyses"
                        stroke="#f97316"
                        strokeWidth={2}
                        fill="url(#areaGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: "#f97316" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              {/* COM-B Strength across all analyses */}
              <SectionCard title="COM-B Dimension Frequency (cumulative)">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={Object.entries(stats.comBStrength).map(([key, value]) => ({
                      label: COMB_LABELS[key]?.label ?? key,
                      value,
                      color: COMB_LABELS[key]?.color ?? "#94a3b8",
                    }))}
                    layout="vertical"
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="20%"
                  >
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={62}
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
                    <Bar dataKey="value" name="signals" radius={[0, 4, 4, 0]} maxBarSize={18}>
                      {Object.entries(stats.comBStrength).map(([key]) => (
                        <Cell key={key} fill={COMB_LABELS[key]?.color ?? "#94a3b8"} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            {/* Data type + Confidence */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data type breakdown */}
              <SectionCard title="Analysis Sources">
                {Object.keys(stats.byDataType).length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">No data.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={Object.entries(stats.byDataType).map(([name, value]) => ({
                            name,
                            value,
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={44}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {Object.entries(stats.byDataType).map(([name]) => (
                            <Cell
                              key={name}
                              fill={DATA_TYPE_COLORS[name] ?? "#94a3b8"}
                              fillOpacity={0.85}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2">
                      {Object.entries(stats.byDataType).map(([name, count]) => (
                        <div key={name} className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: DATA_TYPE_COLORS[name] ?? "#94a3b8" }}
                          />
                          <span className="text-sm text-gray-700 capitalize">{name.replace("_", " ")}</span>
                          <span className="text-xs text-gray-400 ml-auto pl-4 font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </SectionCard>

              {/* Confidence distribution */}
              <SectionCard title="Evidence Confidence Distribution">
                <div className="space-y-3 mt-1">
                  {["high", "medium", "low"].map((level) => {
                    const count = stats.confidence[level] ?? 0;
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    const color = CONFIDENCE_COLORS[level];
                    return (
                      <div key={level}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className="text-xs font-semibold uppercase tracking-wide"
                            style={{ color }}
                          >
                            {level}
                          </span>
                          <span className="text-xs text-gray-400">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-800">{formatTokens(stats.avgInputTokens)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">avg input tokens</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{formatTokens(stats.avgOutputTokens)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">avg output tokens</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800">{stats.totalMotivators}</p>
                    <p className="text-xs text-gray-400 mt-0.5">motivators found</p>
                  </div>
                </div>
              </SectionCard>
            </div>

            {/* Quality Trends */}
            {(stats.rubricGrades || stats.promptVersions) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Rubric grade distribution */}
                <SectionCard title="Evaluation Rubric Grades">
                  {Object.values(stats.rubricGrades).every((v) => v === 0) ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No rubric data yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {(["strong", "acceptable", "needs_revision"] as const).map((grade) => {
                        const count = stats.rubricGrades[grade] ?? 0;
                        const total = Object.values(stats.rubricGrades).reduce((s, v) => s + v, 0);
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const colors: Record<string, { bar: string; text: string }> = {
                          strong:          { bar: "bg-emerald-500", text: "text-emerald-700" },
                          acceptable:      { bar: "bg-amber-400",   text: "text-amber-700" },
                          needs_revision:  { bar: "bg-rose-400",    text: "text-rose-700" },
                        };
                        const c = colors[grade];
                        return (
                          <div key={grade}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className={`text-xs font-semibold capitalize ${c.text}`}>
                                {grade.replace("_", " ")}
                              </span>
                              <span className="text-xs text-gray-400">{count} ({pct}%)</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${c.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                      {stats.avgGroundingScore !== null && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Avg grounding score</span>
                          <span className="text-sm font-bold text-brand-700">{stats.avgGroundingScore}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </SectionCard>

                {/* Rubric score trend */}
                <SectionCard title="Avg Rubric Score Over Time">
                  {stats.rubricTrend.length < 2 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">
                      {stats.rubricTrend.length === 0 ? "No rubric data yet." : "Run more analyses to see trend."}
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={stats.rubricTrend} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rubricGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(d) => d.slice(5)} />
                        <YAxis domain={[0, 50]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="avgTotal" name="avg score /50" stroke="#10b981" strokeWidth={2} fill="url(#rubricGrad)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>

                {/* Prompt version breakdown */}
                <SectionCard title="Prompt Versions Used">
                  {Object.keys(stats.promptVersions).length === 0 ? (
                    <p className="text-sm text-gray-400 py-4 text-center">No prompt version data.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(stats.promptVersions)
                        .sort(([, a], [, b]) => b - a)
                        .map(([version, count]) => {
                          const total = Object.values(stats.promptVersions).reduce((s, v) => s + v, 0);
                          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                          return (
                            <div key={version} className="flex items-center gap-3">
                              <span className="text-xs font-mono font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-md w-16 text-center shrink-0">
                                {version}
                              </span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-400 w-8 text-right shrink-0">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </SectionCard>
              </div>
            )}

            {/* CTA */}
            <div className="bg-gradient-to-r from-brand-600 to-amber-700 rounded-2xl p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-semibold text-base">Ready to go deeper?</h3>
                <p className="text-brand-200 text-sm mt-0.5">
                  Add social listening, app store reviews, or scrape competitor sites for your next analysis.
                </p>
              </div>
              <Link
                href="/"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-white text-brand-700 text-sm font-semibold rounded-xl hover:bg-brand-50 transition-colors"
              >
                New analysis
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-gray-100 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            ScrapeCore · Behavioural Market Intelligence
          </p>
          <p className="text-xs text-gray-400">AI-assisted — expert review required</p>
        </div>
      </footer>
    </div>
  );
}

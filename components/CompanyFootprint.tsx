"use client";

import { useState } from "react";
import type { Source, TrustpilotReview, AppStoreReview, GooglePlayReview, WebSearchResult, RssFeedItem } from "@/lib/scraper";

interface CompanyFootprintProps {
  onSourcesReady: (sources: Source[]) => void;
}

type TaskStatus = "idle" | "running" | "done" | "error";

interface TaskState {
  label: string;
  status: TaskStatus;
  count: number;
  error?: string;
}

const INITIAL_TASKS: Record<string, TaskState> = {
  webcrawl: { label: "Website crawl", status: "idle", count: 0 },
  trustpilot: { label: "Trustpilot reviews", status: "idle", count: 0 },
  appstore: { label: "App Store reviews", status: "idle", count: 0 },
  googleplay: { label: "Google Play reviews", status: "idle", count: 0 },
  search: { label: "Web search (DuckDuckGo)", status: "idle", count: 0 },
  rss: { label: "Industry RSS feeds", status: "idle", count: 0 },
};

const INDUSTRY_RSS = [
  "https://www.gamblinginsider.com/feed",
  "https://igamingbusiness.com/feed/",
  "https://www.gamblingcommission.gov.uk/rss.xml",
];

function statusIcon(s: TaskStatus) {
  if (s === "idle") return <span className="w-4 h-4 rounded-full border border-gray-200 inline-block" />;
  if (s === "running") return (
    <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
  if (s === "done") return (
    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
  return (
    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function trustpilotToSource(r: TrustpilotReview, company: string): Source {
  const stars = "★".repeat(r.rating) + "☆".repeat(Math.max(0, 5 - r.rating));
  return {
    id: `tp-${company}-${r.date}-${r.title.slice(0, 10)}`,
    title: r.title || `${r.rating}★ review`,
    text: [r.title, r.text].filter(Boolean).join("\n"),
    url: r.url,
    wordCount: r.text.split(/\s+/).length,
    source: "trustpilot",
    meta: `${stars} · ${r.date.slice(0, 10)}`,
    selected: true,
  };
}

function appStoreToSource(r: AppStoreReview): Source {
  const stars = "★".repeat(r.rating) + "☆".repeat(Math.max(0, 5 - r.rating));
  return {
    id: `as-${encodeURIComponent(r.url).slice(0, 30)}-${r.title.slice(0, 10)}`,
    title: r.title || `${r.rating}★ review`,
    text: [r.title, r.text].filter(Boolean).join("\n"),
    url: r.url,
    wordCount: r.text.split(/\s+/).length,
    source: "appstore",
    meta: stars + (r.version ? ` · v${r.version}` : ""),
    selected: true,
  };
}

function googlePlayToSource(r: GooglePlayReview): Source {
  const stars = "★".repeat(r.rating) + "☆".repeat(Math.max(0, 5 - r.rating));
  return {
    id: `gp-${r.date}-${r.title.slice(0, 10)}`,
    title: r.title || `${r.rating}★ review`,
    text: [r.title, r.text].filter(Boolean).join("\n"),
    url: r.url,
    wordCount: r.text.split(/\s+/).length,
    source: "googleplay",
    meta: `${stars} · ${r.date.slice(0, 10)}`,
    selected: true,
  };
}

function webSearchToSource(r: WebSearchResult, idx: number): Source {
  return {
    id: `ws-${idx}-${encodeURIComponent(r.url).slice(0, 30)}`,
    title: r.title,
    text: [r.title, r.snippet].filter(Boolean).join("\n"),
    url: r.url,
    wordCount: r.snippet.split(/\s+/).length,
    source: "websearch",
    meta: "DuckDuckGo",
    selected: true,
  };
}

function rssFeedItemToSource(item: RssFeedItem): Source {
  return {
    id: `rss-${encodeURIComponent(item.url).slice(0, 40)}`,
    title: item.title,
    text: [item.title, item.text].filter(Boolean).join("\n"),
    url: item.url,
    wordCount: item.text.split(/\s+/).length,
    source: "rss",
    meta: item.feedTitle,
    selected: true,
  };
}

export default function CompanyFootprint({ onSourcesReady }: CompanyFootprintProps) {
  const [companyName, setCompanyName] = useState("");
  const [domain, setDomain] = useState("");
  const [iosAppId, setIosAppId] = useState("");
  const [androidPackage, setAndroidPackage] = useState("");
  const [country, setCountry] = useState("gb");

  const [tasks, setTasks] = useState<Record<string, TaskState>>(INITIAL_TASKS);
  const [isRunning, setIsRunning] = useState(false);
  const [totalSources, setTotalSources] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const setTask = (key: string, update: Partial<TaskState>) => {
    setTasks((prev) => ({ ...prev, [key]: { ...prev[key], ...update } }));
  };

  const canRun = companyName.trim() && domain.trim() && !isRunning;

  const run = async () => {
    if (!canRun) return;
    setIsRunning(true);
    setTotalSources(null);
    setGlobalError(null);

    // Reset all tasks
    setTasks(Object.fromEntries(
      Object.entries(INITIAL_TASKS).map(([k, v]) => [k, { ...v }])
    ));

    const company = companyName.trim();
    const dom = domain.trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
    const allSources: Source[] = [];

    // Build all parallel tasks
    const taskRunners: Promise<void>[] = [];

    // 1. Website crawl
    taskRunners.push((async () => {
      setTask("webcrawl", { status: "running" });
      try {
        const res = await fetch("/api/sources/webcrawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: dom, maxPages: 15 }),
        });
        const data = await res.json() as { sources?: Source[]; error?: string };
        if (data.error) throw new Error(data.error);
        const crawled = data.sources ?? [];
        allSources.push(...crawled);
        setTask("webcrawl", { status: "done", count: crawled.length });
      } catch (err) {
        setTask("webcrawl", { status: "error", error: err instanceof Error ? err.message : "Failed" });
      }
    })());

    // 2. Trustpilot
    taskRunners.push((async () => {
      setTask("trustpilot", { status: "running" });
      try {
        const res = await fetch("/api/sources/trustpilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company: dom, pages: 5 }),
        });
        const data = await res.json() as { reviews?: TrustpilotReview[]; error?: string };
        if (data.error) throw new Error(data.error);
        const items = (data.reviews ?? []).map((r) => trustpilotToSource(r, dom));
        allSources.push(...items);
        setTask("trustpilot", { status: "done", count: items.length });
      } catch (err) {
        setTask("trustpilot", { status: "error", error: err instanceof Error ? err.message : "Failed" });
      }
    })());

    // 3. App Store (if ID provided)
    if (iosAppId.trim()) {
      taskRunners.push((async () => {
        setTask("appstore", { status: "running" });
        try {
          const res = await fetch("/api/sources/appstore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId: iosAppId.trim(), country, pages: 5 }),
          });
          const data = await res.json() as { reviews?: AppStoreReview[]; error?: string };
          if (data.error) throw new Error(data.error);
          const items = (data.reviews ?? []).map(appStoreToSource);
          allSources.push(...items);
          setTask("appstore", { status: "done", count: items.length });
        } catch (err) {
          setTask("appstore", { status: "error", error: err instanceof Error ? err.message : "Failed" });
        }
      })());
    }

    // 4. Google Play (if package ID provided)
    if (androidPackage.trim()) {
      taskRunners.push((async () => {
        setTask("googleplay", { status: "running" });
        try {
          const res = await fetch("/api/sources/googleplay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageId: androidPackage.trim(), country, num: 150 }),
          });
          const data = await res.json() as { reviews?: GooglePlayReview[]; error?: string };
          if (data.error) throw new Error(data.error);
          const items = (data.reviews ?? []).map(googlePlayToSource);
          allSources.push(...items);
          setTask("googleplay", { status: "done", count: items.length });
        } catch (err) {
          setTask("googleplay", { status: "error", error: err instanceof Error ? err.message : "Failed" });
        }
      })());
    }

    // 5. DuckDuckGo web search
    taskRunners.push((async () => {
      setTask("search", { status: "running" });
      try {
        const queries = [
          `"${company}" review`,
          `"${company}" complaints problems`,
          `"${company}" responsible gambling`,
          `"${company}" regulatory fine sanction`,
        ];
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ queries, limit: 8 }),
        });
        const data = await res.json() as { results?: WebSearchResult[]; error?: string };
        if (data.error) throw new Error(data.error);
        const items = (data.results ?? []).map((r, i) => webSearchToSource(r, i));
        allSources.push(...items);
        setTask("search", { status: "done", count: items.length });
      } catch (err) {
        setTask("search", { status: "error", error: err instanceof Error ? err.message : "Failed" });
      }
    })());

    // 6. Industry RSS feeds
    taskRunners.push((async () => {
      setTask("rss", { status: "running" });
      try {
        const res = await fetch("/api/sources/rss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: INDUSTRY_RSS, query: company }),
        });
        const data = await res.json() as { items?: RssFeedItem[]; error?: string };
        if (data.error) throw new Error(data.error);
        const items = (data.items ?? []).map(rssFeedItemToSource);
        allSources.push(...items);
        setTask("rss", { status: "done", count: items.length });
      } catch (err) {
        setTask("rss", { status: "error", error: err instanceof Error ? err.message : "Failed" });
      }
    })());

    await Promise.allSettled(taskRunners);

    setTotalSources(allSources.length);
    if (allSources.length > 0) {
      onSourcesReady(allSources);
    } else {
      setGlobalError("No data collected — check domain spelling and try again.");
    }
    setIsRunning(false);
  };

  const inputCls =
    "w-full px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 bg-surface-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400 focus:bg-white disabled:opacity-50";

  const anyRunning = isRunning;
  const doneCount = Object.values(tasks).filter((t) => t.status === "done" || t.status === "error").length;
  const totalTasks = Object.keys(tasks).length;

  return (
    <div className="space-y-5">
      {/* Company name + domain */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Company name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g. Bet365, William Hill, IG Group, eToro"
            className={inputCls}
            disabled={anyRunning}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="bet365.com · williamhill.com · ig.com"
            className={inputCls}
            disabled={anyRunning}
          />
        </div>
      </div>

      {/* App IDs (optional) */}
      <div className="space-y-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">App store IDs (optional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">iOS App ID</label>
            <input
              type="text"
              value={iosAppId}
              onChange={(e) => setIosAppId(e.target.value)}
              placeholder="1234567890"
              className={inputCls}
              disabled={anyRunning}
            />
            <p className="mt-1 text-xs text-gray-400">id<strong>…</strong> from App Store URL</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Android package ID</label>
            <input
              type="text"
              value={androidPackage}
              onChange={(e) => setAndroidPackage(e.target.value)}
              placeholder="com.bet365.android"
              className={inputCls}
              disabled={anyRunning}
            />
            <p className="mt-1 text-xs text-gray-400">reverse-domain format</p>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">App store region</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400/50 disabled:opacity-50"
            disabled={anyRunning}
          >
            <option value="gb">🇬🇧 United Kingdom</option>
            <option value="us">🇺🇸 United States</option>
            <option value="au">🇦🇺 Australia</option>
            <option value="ie">🇮🇪 Ireland</option>
            <option value="ca">🇨🇦 Canada</option>
          </select>
        </div>
      </div>

      {/* Progress indicators (shown while running or after) */}
      {(anyRunning || totalSources !== null) && (
        <div className="space-y-1.5 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Collection progress</p>
            {anyRunning && (
              <span className="text-xs text-gray-400">{doneCount}/{totalTasks}</span>
            )}
          </div>
          {Object.entries(tasks).map(([key, task]) => {
            // Skip app store / googleplay if no ID provided and task never ran
            if (key === "appstore" && !iosAppId.trim() && task.status === "idle") return null;
            if (key === "googleplay" && !androidPackage.trim() && task.status === "idle") return null;
            return (
              <div key={key} className="flex items-center gap-2.5">
                {statusIcon(task.status)}
                <span className={`text-xs flex-1 ${task.status === "error" ? "text-amber-600" : "text-gray-600"}`}>
                  {task.label}
                </span>
                {task.status === "done" && task.count > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">{task.count}</span>
                )}
                {task.status === "error" && task.error && (
                  <span className="text-xs text-amber-500 truncate max-w-28">{task.error}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Run button */}
      <button
        type="button"
        onClick={run}
        disabled={!canRun}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          canRun
            ? "bg-brand-500 hover:bg-brand-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {anyRunning ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Researching digital footprint…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Research digital footprint
          </>
        )}
      </button>

      {globalError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {globalError}
        </p>
      )}

      {totalSources !== null && !anyRunning && totalSources > 0 && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ {totalSources} sources collected — scroll down to review and analyse
        </p>
      )}
    </div>
  );
}

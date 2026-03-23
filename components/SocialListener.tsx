"use client";

import { useState } from "react";
import type {
  Source,
  RedditPost,
  HNItem,
  GNewsItem,
  StockTwitsMessage,
  TrustpilotReview,
  AppStoreReview,
  RssFeedItem,
  GooglePlayReview,
} from "@/lib/scraper";

interface SocialListenerProps {
  onSourcesReady: (sources: Source[]) => void;
}

// ─── Source definitions ───────────────────────────────────────────────────────

const SOURCE_DEFS = [
  {
    id: "reddit" as const,
    label: "Reddit",
    group: "community",
    activeClass: "border-orange-300 bg-orange-50 text-orange-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    ),
  },
  {
    id: "hackernews" as const,
    label: "Hacker News",
    group: "community",
    activeClass: "border-amber-300 bg-amber-50 text-amber-700",
    icon: <span className="font-black text-sm leading-none">Y</span>,
  },
  {
    id: "gnews" as const,
    label: "Google News",
    group: "news",
    activeClass: "border-blue-300 bg-blue-50 text-blue-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-1M9 12h6M9 16h3" />
      </svg>
    ),
  },
  {
    id: "stocktwits" as const,
    label: "StockTwits",
    group: "finance",
    activeClass: "border-emerald-300 bg-emerald-50 text-emerald-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    id: "trustpilot" as const,
    label: "Trustpilot",
    group: "reviews",
    activeClass: "border-green-300 bg-green-50 text-green-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
      </svg>
    ),
  },
  {
    id: "appstore" as const,
    label: "App Store",
    group: "reviews",
    activeClass: "border-sky-300 bg-sky-50 text-sky-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "rss" as const,
    label: "RSS Feeds",
    group: "feeds",
    activeClass: "border-purple-300 bg-purple-50 text-purple-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16" strokeLinecap="round" />
        <circle cx="5" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "googleplay" as const,
    label: "Google Play",
    group: "reviews",
    activeClass: "border-teal-300 bg-teal-50 text-teal-700",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.18 23.76A1.5 1.5 0 0 1 1.5 22.5V1.5A1.5 1.5 0 0 1 3.18.24L14.93 12 3.18 23.76zm2.64-2.14 8.11-8.11L6.06 5.62 3.44 20.74l2.38.88zM19.28 14.1l-2.82 1.63L13.2 12l3.26-3.73 2.82 1.63c.8.46.8 1.64 0 2.2z" />
      </svg>
    ),
  },
  // ─── The Eyes ────────────────────────────────────────────────────────────────
  {
    id: "g2" as const,
    label: "G2 Reviews",
    group: "b2b",
    activeClass: "border-orange-300 bg-orange-50 text-orange-800",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.86 0 .53-.39 1.37-2.1 1.37-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
      </svg>
    ),
  },
  {
    id: "capterra" as const,
    label: "Capterra",
    group: "b2b",
    activeClass: "border-blue-300 bg-blue-50 text-blue-800",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 8h8M8 16h4" />
      </svg>
    ),
  },
  {
    id: "twitter" as const,
    label: "Twitter / X",
    group: "research",
    activeClass: "border-gray-400 bg-gray-900 text-white",
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    id: "perplexity" as const,
    label: "Perplexity Research",
    group: "research",
    activeClass: "border-brand-300 bg-brand-50 text-brand-800",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" />
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M11 8v6M8 11h6" />
      </svg>
    ),
  },
];

type SourceId = (typeof SOURCE_DEFS)[number]["id"];

const RECENCY_OPTIONS = [
  { value: "day", label: "Past 24 hours" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
];

const TIMEFRAMES = [
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
  { value: "all", label: "All time" },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

const COUNTRY_OPTIONS = [
  { value: "gb", label: "🇬🇧 United Kingdom" },
  { value: "us", label: "🇺🇸 United States" },
  { value: "au", label: "🇦🇺 Australia" },
  { value: "ca", label: "🇨🇦 Canada" },
  { value: "ie", label: "🇮🇪 Ireland" },
  { value: "nz", label: "🇳🇿 New Zealand" },
];

const RSS_PRESETS = [
  { label: "GamblingInsider", url: "https://www.gamblinginsider.com/feed" },
  { label: "iGaming Business", url: "https://igamingbusiness.com/feed/" },
  { label: "Gambling Commission", url: "https://www.gamblingcommission.gov.uk/rss.xml" },
  { label: "FCA News", url: "https://www.fca.org.uk/news/rss.xml" },
  { label: "FT Finance", url: "https://www.ft.com/rss/home/finance" },
  { label: "Reuters Business", url: "https://feeds.reuters.com/reuters/businessNews" },
];

// ─── Source toggle pill ───────────────────────────────────────────────────────

function SourcePill({
  def,
  active,
  onToggle,
}: {
  def: (typeof SOURCE_DEFS)[number];
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
        active
          ? def.activeClass
          : "border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {def.icon}
      {def.label}
    </button>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocialListener({ onSourcesReady }: SocialListenerProps) {
  const [active, setActive] = useState<Set<SourceId>>(new Set<SourceId>(["reddit"]));

  // Shared search
  const [query, setQuery] = useState("");
  // StockTwits
  const [symbol, setSymbol] = useState("");
  // Reddit-specific
  const [subreddit, setSubreddit] = useState("");
  const [timeframe, setTimeframe] = useState("year");
  const [sort, setSort] = useState("relevance");
  const [limit, setLimit] = useState(30);
  const [includeComments, setIncludeComments] = useState(true);
  // Trustpilot
  const [tpDomain, setTpDomain] = useState("");
  const [tpPages, setTpPages] = useState(2);
  // App Store
  const [appId, setAppId] = useState("");
  const [appCountry, setAppCountry] = useState("gb");
  const [appPages, setAppPages] = useState(3);
  // RSS
  const [rssUrls, setRssUrls] = useState("");
  // Google Play
  const [gpPackageId, setGpPackageId] = useState("");
  const [gpCountry, setGpCountry] = useState("gb");
  const [gpNum, setGpNum] = useState(100);
  // G2
  const [g2Slug, setG2Slug] = useState("");
  const [g2Pages, setG2Pages] = useState(2);
  // Capterra
  const [capterraSlug, setCapterraSlug] = useState("");
  const [capterraPages, setCapterraPages] = useState(2);
  // Twitter/X (via Perplexity)
  const [twitterQuery, setTwitterQuery] = useState("");
  const [twitterRecency, setTwitterRecency] = useState("week");
  // Perplexity Research
  const [perplexityQuery, setPerplexityQuery] = useState("");
  const [perplexityRecency, setPerplexityRecency] = useState("month");

  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedCount, setFetchedCount] = useState<number | null>(null);

  const toggle = (id: SourceId) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const needsQuery = active.has("reddit") || active.has("hackernews") || active.has("gnews");
  const hasSocialSearch =
    active.has("reddit") || active.has("hackernews") || active.has("gnews") || active.has("stocktwits");

  const canSubmit =
    active.size > 0 &&
    (!needsQuery || query.trim()) &&
    (!active.has("stocktwits") || query.trim() || symbol.trim()) &&
    (!active.has("trustpilot") || tpDomain.trim()) &&
    (!active.has("appstore") || appId.trim()) &&
    (!active.has("rss") || rssUrls.trim()) &&
    (!active.has("googleplay") || gpPackageId.trim()) &&
    (!active.has("g2") || g2Slug.trim()) &&
    (!active.has("capterra") || capterraSlug.trim()) &&
    (!active.has("twitter") || twitterQuery.trim()) &&
    (!active.has("perplexity") || perplexityQuery.trim());

  // ─── Converters ──────────────────────────────────────────────────────────────

  function socialItemToSource(item: RedditPost | HNItem | GNewsItem | StockTwitsMessage): Source {
    switch (item.source) {
      case "reddit": {
        const r = item as RedditPost;
        return {
          id: `reddit-${r.id}`,
          title: r.title,
          text: r.text,
          url: r.url,
          wordCount: r.text.split(/\s+/).length,
          source: "reddit",
          meta: `r/${r.subreddit} · ${r.type} · ↑${r.score}`,
          selected: true,
        };
      }
      case "hackernews": {
        const h = item as HNItem;
        return {
          id: `hn-${h.id}`,
          title: h.title,
          text: h.text,
          url: h.url,
          wordCount: h.text.split(/\s+/).length,
          source: "hackernews",
          meta: `HN · ${h.type} · ↑${h.score}`,
          selected: true,
        };
      }
      case "gnews": {
        const g = item as GNewsItem;
        return {
          id: `gnews-${encodeURIComponent(g.url).slice(0, 40)}`,
          title: g.title,
          text: g.text,
          url: g.url,
          wordCount: g.text.split(/\s+/).length,
          source: "gnews",
          meta: "Google News",
          selected: true,
        };
      }
      case "stocktwits": {
        const s = item as StockTwitsMessage;
        return {
          id: `st-${s.id}`,
          title: s.text.slice(0, 60),
          text: s.text,
          url: s.url,
          wordCount: s.text.split(/\s+/).length,
          source: "stocktwits",
          meta: s.sentiment ? `${s.sentiment} · ♥${s.likes}` : `♥${s.likes}`,
          selected: true,
        };
      }
    }
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

  // ─── Fetch handler ───────────────────────────────────────────────────────────

  const handleFetch = async () => {
    if (!canSubmit) return;
    setIsFetching(true);
    setError(null);
    setFetchedCount(null);

    const allSources: Source[] = [];
    const allErrors: string[] = [];

    try {
      // 1. Social / news via /api/social
      const socialSources = (["reddit", "hackernews", "gnews", "stocktwits"] as SourceId[]).filter(
        (s) => active.has(s)
      );
      if (socialSources.length > 0) {
        const res = await fetch("/api/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim() || undefined,
            symbol: symbol.trim() || undefined,
            subreddit: subreddit.trim() || undefined,
            timeframe,
            sort,
            limit,
            includeComments,
            sources: socialSources,
          }),
        });
        const data = (await res.json()) as {
          items?: (RedditPost | HNItem | GNewsItem | StockTwitsMessage)[];
          errors?: string[];
          error?: string;
        };
        if (data.error) allErrors.push(data.error);
        if (data.errors?.length) allErrors.push(...data.errors);
        for (const item of data.items ?? []) allSources.push(socialItemToSource(item));
      }

      // 2. Trustpilot
      if (active.has("trustpilot") && tpDomain.trim()) {
        const res = await fetch("/api/sources/trustpilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company: tpDomain.trim(), pages: tpPages }),
        });
        const data = (await res.json()) as {
          reviews?: TrustpilotReview[];
          errors?: string[];
          error?: string;
        };
        if (data.error) allErrors.push(`Trustpilot: ${data.error}`);
        if (data.errors?.length) allErrors.push(...data.errors.map((e) => `Trustpilot: ${e}`));
        for (const r of data.reviews ?? []) allSources.push(trustpilotToSource(r, tpDomain.trim()));
      }

      // 3. App Store
      if (active.has("appstore") && appId.trim()) {
        const res = await fetch("/api/sources/appstore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId: appId.trim(), country: appCountry, pages: appPages }),
        });
        const data = (await res.json()) as {
          reviews?: AppStoreReview[];
          errors?: string[];
          error?: string;
        };
        if (data.error) allErrors.push(`App Store: ${data.error}`);
        if (data.errors?.length) allErrors.push(...data.errors.map((e) => `App Store: ${e}`));
        for (const r of data.reviews ?? []) allSources.push(appStoreToSource(r));
      }

      // 4. Google Play
      if (active.has("googleplay") && gpPackageId.trim()) {
        const res = await fetch("/api/sources/googleplay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packageId: gpPackageId.trim(), country: gpCountry, num: gpNum }),
        });
        const data = (await res.json()) as {
          reviews?: GooglePlayReview[];
          error?: string;
        };
        if (data.error) allErrors.push(`Google Play: ${data.error}`);
        for (const r of data.reviews ?? []) allSources.push(googlePlayToSource(r));
      }

      // 5. RSS
      if (active.has("rss") && rssUrls.trim()) {
        const urls = rssUrls
          .split(/[\n,]+/)
          .map((u) => u.trim())
          .filter(Boolean);
        const res = await fetch("/api/sources/rss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const data = (await res.json()) as {
          items?: RssFeedItem[];
          errors?: string[];
          error?: string;
        };
        if (data.error) allErrors.push(`RSS: ${data.error}`);
        if (data.errors?.length) allErrors.push(...data.errors.map((e) => `RSS: ${e}`));
        for (const item of data.items ?? []) allSources.push(rssFeedItemToSource(item));
      }

      // 6. G2 Reviews
      if (active.has("g2") && g2Slug.trim()) {
        const res = await fetch("/api/sources/g2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: g2Slug.trim(), pages: g2Pages }),
        });
        const data = (await res.json()) as {
          reviews?: Array<{ title: string; text: string; rating: number; author: string; date: string; url: string; pros?: string; cons?: string }>;
          error?: string;
          hint?: string;
        };
        if (data.error) allErrors.push(`G2: ${data.error}${data.hint ? " — " + data.hint : ""}`);
        for (const r of data.reviews ?? []) {
          const stars = "★".repeat(Math.round(r.rating)) + "☆".repeat(Math.max(0, 5 - Math.round(r.rating)));
          const fullText = [r.pros ? `Pros: ${r.pros}` : "", r.cons ? `Cons: ${r.cons}` : "", r.text].filter(Boolean).join("\n");
          allSources.push({
            id: `g2-${r.date}-${r.title.slice(0, 10)}`,
            title: r.title || `${r.rating}★ G2 review`,
            text: fullText,
            url: r.url,
            wordCount: fullText.split(/\s+/).length,
            source: "url",
            meta: `G2 ${stars} · ${r.date.slice(0, 10)}`,
            selected: true,
          });
        }
      }

      // 7. Capterra Reviews
      if (active.has("capterra") && capterraSlug.trim()) {
        const res = await fetch("/api/sources/capterra", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: capterraSlug.trim(), pages: capterraPages }),
        });
        const data = (await res.json()) as {
          reviews?: Array<{ title: string; text: string; pros: string; cons: string; rating: number; author: string; date: string; url: string }>;
          error?: string;
          hint?: string;
        };
        if (data.error) allErrors.push(`Capterra: ${data.error}${data.hint ? " — " + data.hint : ""}`);
        for (const r of data.reviews ?? []) {
          const stars = "★".repeat(Math.round(r.rating)) + "☆".repeat(Math.max(0, 5 - Math.round(r.rating)));
          const fullText = [r.pros ? `Pros: ${r.pros}` : "", r.cons ? `Cons: ${r.cons}` : "", r.text].filter(Boolean).join("\n");
          allSources.push({
            id: `cap-${r.date}-${r.title.slice(0, 10)}`,
            title: r.title || `${r.rating}★ Capterra review`,
            text: fullText,
            url: r.url,
            wordCount: fullText.split(/\s+/).length,
            source: "url",
            meta: `Capterra ${stars} · ${r.date.slice(0, 10)}`,
            selected: true,
          });
        }
      }

      // 8. Twitter/X via Perplexity
      if (active.has("twitter") && twitterQuery.trim()) {
        const res = await fetch("/api/sources/perplexity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: twitterQuery.trim(), mode: "twitter", recency: twitterRecency }),
        });
        const data = (await res.json()) as { title?: string; text?: string; wordCount?: number; citations?: string[]; error?: string };
        if (data.error) allErrors.push(`Twitter/X: ${data.error}`);
        if (data.text) {
          allSources.push({
            id: `twitter-${Date.now()}`,
            title: data.title ?? `Twitter/X — ${twitterQuery.trim()}`,
            text: data.text,
            url: data.citations?.[0] ?? "https://x.com",
            wordCount: data.wordCount ?? 0,
            source: "url",
            meta: `Twitter/X · ${data.citations?.length ?? 0} citations`,
            selected: true,
          });
        }
      }

      // 9. Perplexity Research
      if (active.has("perplexity") && perplexityQuery.trim()) {
        const res = await fetch("/api/sources/perplexity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: perplexityQuery.trim(), mode: "research", recency: perplexityRecency }),
        });
        const data = (await res.json()) as { title?: string; text?: string; wordCount?: number; citations?: string[]; error?: string };
        if (data.error) allErrors.push(`Perplexity: ${data.error}`);
        if (data.text) {
          allSources.push({
            id: `perplexity-${Date.now()}`,
            title: data.title ?? `Perplexity — ${perplexityQuery.trim()}`,
            text: data.text,
            url: data.citations?.[0] ?? "https://perplexity.ai",
            wordCount: data.wordCount ?? 0,
            source: "url",
            meta: `Perplexity · ${data.citations?.length ?? 0} citations`,
            selected: true,
          });
        }
      }
    } catch (err) {
      allErrors.push(err instanceof Error ? err.message : "Network error");
    }

    setFetchedCount(allSources.length);
    if (allErrors.length) setError(allErrors.join(" · "));
    if (allSources.length > 0) onSourcesReady(allSources);
    setIsFetching(false);
  };

  // ─── Shared class helpers ────────────────────────────────────────────────────

  const inputCls =
    "w-full px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";
  const smallLabelCls = "block text-xs font-medium text-gray-500 mb-1";

  const groupedDefs = {
    research: SOURCE_DEFS.filter((s) => s.group === "research"),
    community: SOURCE_DEFS.filter((s) => s.group === "community"),
    news: SOURCE_DEFS.filter((s) => s.group === "news"),
    reviews: SOURCE_DEFS.filter((s) => s.group === "reviews"),
    b2b: SOURCE_DEFS.filter((s) => s.group === "b2b"),
    finance: SOURCE_DEFS.filter((s) => s.group === "finance"),
    feeds: SOURCE_DEFS.filter((s) => s.group === "feeds"),
  };

  const COUNTRY_OPTIONS_GP = [
    { value: "gb", label: "🇬🇧 United Kingdom" },
    { value: "us", label: "🇺🇸 United States" },
    { value: "au", label: "🇦🇺 Australia" },
    { value: "ie", label: "🇮🇪 Ireland" },
    { value: "ca", label: "🇨🇦 Canada" },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Source toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Sources</label>
          <span className="text-xs text-gray-400">Toggle to combine</span>
        </div>
        {(Object.entries(groupedDefs) as [string, typeof SOURCE_DEFS[number][]][]).map(([group, defs]) => {
          if (!defs.length) return null;
          const labels: Record<string, string> = {
            research: "The Eyes — Perplexity + Twitter/X",
            community: "Community",
            news: "News",
            finance: "Finance",
            reviews: "Reviews",
            b2b: "B2B Reviews",
            feeds: "Feeds",
          };
          return (
            <div key={group}>
              <GroupLabel label={labels[group] ?? group} />
              <div className="flex flex-wrap gap-2">
                {defs.map((def) => (
                  <SourcePill key={def.id} def={def} active={active.has(def.id)} onToggle={() => toggle(def.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Search query (Reddit / HN / Google News) ── */}
      {needsQuery && (
        <div>
          <label className={labelCls}>
            Search query{" "}
            <span className="font-normal text-gray-400">
              ({[active.has("reddit") && "Reddit", active.has("hackernews") && "HN", active.has("gnews") && "Google News"].filter(Boolean).join(" · ")})
            </span>
          </label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            placeholder="e.g. Bet365 review, responsible gambling, FCA regulated broker"
            className={inputCls}
            disabled={isFetching}
          />
        </div>
      )}

      {/* ── StockTwits ticker ── */}
      {active.has("stocktwits") && (
        <div>
          <label className={labelCls}>
            Ticker symbol <span className="font-normal text-gray-400">(StockTwits)</span>
          </label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">$</span>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="DKNG, 888, EVRI, IGT, CMC, IG"
              className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none disabled:opacity-50"
              disabled={isFetching}
            />
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Enter ticker for symbol stream, or leave blank to search by query above.
          </p>
        </div>
      )}

      {/* ── Reddit subreddit ── */}
      {active.has("reddit") && (
        <div>
          <label className={labelCls}>
            Subreddit <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">r/</span>
            <input
              type="text"
              value={subreddit}
              onChange={(e) => setSubreddit(e.target.value)}
              placeholder="gambling, sportsbook, UKPersonalFinance, stocks, wallstreetbets…"
              className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none disabled:opacity-50"
              disabled={isFetching}
            />
          </div>
        </div>
      )}

      {/* ── Time / sort / limit controls ── */}
      {hasSocialSearch && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(active.has("reddit") || active.has("hackernews")) && (
              <div>
                <label className={smallLabelCls}>Time range</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  disabled={isFetching}
                >
                  {TIMEFRAMES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            )}
            {active.has("reddit") && (
              <div>
                <label className={smallLabelCls}>Sort by</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                  disabled={isFetching}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Results per source</label>
              <input
                type="number"
                value={limit}
                onChange={(e) =>
                  setLimit(Math.min(100, Math.max(5, parseInt(e.target.value) || 25)))
                }
                className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
                min={5}
                max={100}
                disabled={isFetching}
              />
            </div>
            {active.has("reddit") && (
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIncludeComments(!includeComments)}
                  className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                    includeComments ? "bg-brand-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      includeComments ? "translate-x-4" : ""
                    }`}
                  />
                </div>
                <span className="text-xs text-gray-600">Include comments</span>
              </label>
            )}
          </div>
        </>
      )}

      {/* ── Trustpilot settings ── */}
      {active.has("trustpilot") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="Trustpilot" />
          <div>
            <label className={labelCls}>Company domain</label>
            <input
              type="text"
              value={tpDomain}
              onChange={(e) => setTpDomain(e.target.value)}
              placeholder="bet365.com · williamhill.com · ig.com · etoro.com"
              className={inputCls}
              disabled={isFetching}
            />
            <p className="mt-1 text-xs text-gray-400">
              Domain as shown in: trustpilot.com/review/<strong>bet365.com</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Pages</label>
            <input
              type="number"
              value={tpPages}
              onChange={(e) =>
                setTpPages(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
              min={1}
              max={5}
              disabled={isFetching}
            />
            <span className="text-xs text-gray-400">≈20 reviews / page · max 5</span>
          </div>
        </div>
      )}

      {/* ── App Store settings ── */}
      {active.has("appstore") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="App Store (Apple)" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>App ID</label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="1234567890"
                className={inputCls}
                disabled={isFetching}
              />
              <p className="mt-1 text-xs text-gray-400">
                From URL: apps.apple.com/.../id<strong>1234567890</strong>
              </p>
            </div>
            <div>
              <label className={labelCls}>Store</label>
              <select
                value={appCountry}
                onChange={(e) => setAppCountry(e.target.value)}
                className="w-full px-2.5 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                disabled={isFetching}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Pages</label>
            <input
              type="number"
              value={appPages}
              onChange={(e) =>
                setAppPages(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))
              }
              className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
              min={1}
              max={10}
              disabled={isFetching}
            />
            <span className="text-xs text-gray-400">50 reviews / page · max 10</span>
          </div>
        </div>
      )}

      {/* ── RSS feeds ── */}
      {active.has("rss") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="RSS / Atom feeds" />
          <div>
            <label className={labelCls}>
              Feed URLs <span className="font-normal text-gray-400">(one per line)</span>
            </label>
            <textarea
              value={rssUrls}
              onChange={(e) => setRssUrls(e.target.value)}
              placeholder={"https://www.gamblinginsider.com/feed\nhttps://igamingbusiness.com/feed/"}
              rows={4}
              className={`${inputCls} resize-none font-mono text-xs`}
              disabled={isFetching}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Quick-add:</p>
            <div className="flex flex-wrap gap-1.5">
              {RSS_PRESETS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => {
                    const existing = rssUrls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean);
                    if (!existing.includes(p.url)) {
                      setRssUrls((prev) => (prev.trim() ? `${prev.trim()}\n${p.url}` : p.url));
                    }
                  }}
                  className="px-2 py-1 text-xs bg-purple-50 border border-purple-200 text-purple-700 rounded hover:bg-purple-100 transition-colors disabled:opacity-50"
                  disabled={isFetching}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── G2 settings ── */}
      {active.has("g2") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="G2 Reviews" />
          <div>
            <label className={labelCls}>Product slug</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500">
              <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">g2.com/products/</span>
              <input
                type="text"
                value={g2Slug}
                onChange={(e) => setG2Slug(e.target.value)}
                placeholder="salesforce-crm · hubspot · intercom"
                className="flex-1 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none disabled:opacity-50"
                disabled={isFetching}
              />
              <span className="px-3 py-2.5 text-xs text-gray-400 bg-gray-50 border-l border-gray-200">/reviews</span>
            </div>
            <p className="mt-1 text-xs text-gray-400">From URL: g2.com/products/<strong>salesforce-crm</strong>/reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Pages</label>
            <input
              type="number"
              value={g2Pages}
              onChange={(e) => setG2Pages(Math.min(5, Math.max(1, parseInt(e.target.value) || 2)))}
              className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
              min={1} max={5}
              disabled={isFetching}
            />
            <span className="text-xs text-gray-400">max 5 · Firecrawl gives better results</span>
          </div>
        </div>
      )}

      {/* ── Capterra settings ── */}
      {active.has("capterra") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="Capterra Reviews" />
          <div>
            <label className={labelCls}>Product slug or ID</label>
            <input
              type="text"
              value={capterraSlug}
              onChange={(e) => setCapterraSlug(e.target.value)}
              placeholder="salesforce-crm · hubspot-crm · 12345"
              className={inputCls}
              disabled={isFetching}
            />
            <p className="mt-1 text-xs text-gray-400">From URL: capterra.com/p/<strong>salesforce-crm</strong> or capterra.com/software/<strong>slug</strong></p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Pages</label>
            <input
              type="number"
              value={capterraPages}
              onChange={(e) => setCapterraPages(Math.min(5, Math.max(1, parseInt(e.target.value) || 2)))}
              className="w-16 px-2 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
              min={1} max={5}
              disabled={isFetching}
            />
            <span className="text-xs text-gray-400">max 5 · Firecrawl recommended</span>
          </div>
        </div>
      )}

      {/* ── Twitter / X settings ── */}
      {active.has("twitter") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="Twitter / X" />
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 leading-relaxed">
            Searches Twitter/X via <strong>Perplexity AI</strong> — requires <code className="text-xs bg-gray-100 px-1 rounded">PERPLEXITY_API_KEY</code>
          </p>
          <div>
            <label className={labelCls}>Search query</label>
            <input
              type="text"
              value={twitterQuery}
              onChange={(e) => setTwitterQuery(e.target.value)}
              placeholder="Bet365 app, DraftKings complaints, CFD trading UK"
              className={inputCls}
              disabled={isFetching}
            />
          </div>
          <div>
            <label className={smallLabelCls}>Time range</label>
            <select
              value={twitterRecency}
              onChange={(e) => setTwitterRecency(e.target.value)}
              className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              disabled={isFetching}
            >
              {RECENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Perplexity Research settings ── */}
      {active.has("perplexity") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="Perplexity Research" />
          <p className="text-xs text-gray-500 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2 leading-relaxed">
            AI-powered web research — synthesises market reports, news, competitor intel. Requires <code className="text-xs bg-brand-100 px-1 rounded">PERPLEXITY_API_KEY</code>
          </p>
          <div>
            <label className={labelCls}>Research query</label>
            <input
              type="text"
              value={perplexityQuery}
              onChange={(e) => setPerplexityQuery(e.target.value)}
              placeholder="Bet365 market position UK 2025 · CFD platform switching barriers · responsible gambling tools"
              className={inputCls}
              disabled={isFetching}
            />
            <p className="mt-1 text-xs text-gray-400">Be specific — e.g. company name + topic + market + year</p>
          </div>
          <div>
            <label className={smallLabelCls}>Recency filter</label>
            <select
              value={perplexityRecency}
              onChange={(e) => setPerplexityRecency(e.target.value)}
              className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
              disabled={isFetching}
            >
              {RECENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Google Play settings ── */}
      {active.has("googleplay") && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <GroupLabel label="Google Play (Android)" />
          <div>
            <label className={labelCls}>Package ID</label>
            <input
              type="text"
              value={gpPackageId}
              onChange={(e) => setGpPackageId(e.target.value)}
              placeholder="com.bet365.android · com.williamhill.racing"
              className={inputCls}
              disabled={isFetching}
            />
            <p className="mt-1 text-xs text-gray-400">
              Reverse-domain format — from Play Store URL <strong>id=com.example.app</strong>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={smallLabelCls}>Store country</label>
              <select
                value={gpCountry}
                onChange={(e) => setGpCountry(e.target.value)}
                className="w-full px-2.5 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
                disabled={isFetching}
              >
                {COUNTRY_OPTIONS_GP.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={smallLabelCls}>Number of reviews</label>
              <input
                type="number"
                value={gpNum}
                onChange={(e) => setGpNum(Math.min(200, Math.max(10, parseInt(e.target.value) || 100)))}
                className="w-full px-2.5 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-center disabled:opacity-50"
                min={10}
                max={200}
                disabled={isFetching}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Collect button ── */}
      <button
        type="button"
        onClick={handleFetch}
        disabled={!canSubmit || isFetching}
        className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
          canSubmit && !isFetching
            ? "bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
            : "bg-gray-100 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isFetching ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Collecting data…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Collect — {active.size} source{active.size !== 1 ? "s" : ""}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
          {error}
        </p>
      )}

      {fetchedCount !== null && !isFetching && (
        <p className="text-xs text-emerald-600 font-medium">
          ✓ {fetchedCount} items collected — scroll down to review and analyse
        </p>
      )}
    </div>
  );
}

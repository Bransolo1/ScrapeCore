import type { RedditPost, HNItem, GNewsItem, StockTwitsMessage } from "@/lib/scraper";
import { parseRssItems } from "@/lib/scraper";

const REDDIT_UA = "BehaviourInsight/1.0 (social listening platform; contact via github.com/Bransolo1/ScrapeCore)";

// ─── Reddit ────────────────────────────────────────────────────────────────

interface RedditListing {
  data: {
    children: Array<{
      kind: string;
      data: {
        id: string;
        name: string;
        title?: string;
        selftext?: string;
        url: string;
        permalink: string;
        subreddit: string;
        score: number;
        num_comments: number;
        body?: string;
        is_self?: boolean;
      };
    }>;
  };
}

async function fetchRedditPosts(
  query: string,
  subreddit: string | undefined,
  timeframe: string,
  sort: string,
  limit: number
): Promise<RedditPost[]> {
  const base = subreddit
    ? `https://www.reddit.com/r/${subreddit}/search.json`
    : "https://www.reddit.com/search.json";

  const params = new URLSearchParams({
    q: query,
    sort,
    t: timeframe,
    limit: String(Math.min(limit, 50)),
    ...(subreddit ? { restrict_sr: "1" } : {}),
    raw_json: "1",
  });

  const res = await fetch(`${base}?${params}`, {
    headers: { "User-Agent": REDDIT_UA },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Reddit API returned ${res.status}`);

  const json = (await res.json()) as RedditListing;
  const posts: RedditPost[] = [];

  for (const child of json.data.children) {
    const d = child.data;
    const text = [d.title ?? "", d.selftext ?? ""].filter(Boolean).join("\n\n").trim();
    if (!text) continue;
    posts.push({
      id: d.id,
      title: d.title ?? "(no title)",
      text,
      url: `https://www.reddit.com${d.permalink}`,
      permalink: d.permalink,
      subreddit: d.subreddit,
      score: d.score,
      numComments: d.num_comments,
      source: "reddit",
      type: "post",
    });
  }

  return posts;
}

async function fetchRedditComments(permalink: string, maxComments = 20): Promise<RedditPost[]> {
  const res = await fetch(
    `https://www.reddit.com${permalink}.json?limit=${maxComments}&raw_json=1`,
    { headers: { "User-Agent": REDDIT_UA }, signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) return [];

  const json = (await res.json()) as RedditListing[];
  if (!Array.isArray(json) || json.length < 2) return [];

  const comments: RedditPost[] = [];
  const flatten = (children: RedditListing["data"]["children"]) => {
    for (const child of children) {
      if (child.kind !== "t1") continue;
      const d = child.data;
      const body = d.body?.trim();
      if (!body || body === "[deleted]" || body === "[removed]" || body.length < 20) continue;
      comments.push({
        id: d.id,
        title: `Comment on: ${d.permalink.split("/")[5]?.replace(/_/g, " ") ?? "post"}`,
        text: body,
        url: `https://www.reddit.com${d.permalink}`,
        permalink: d.permalink,
        subreddit: d.subreddit,
        score: d.score,
        numComments: 0,
        source: "reddit",
        type: "comment",
      });
      if (comments.length >= maxComments) break;
    }
  };

  flatten(json[1].data.children);
  return comments;
}

// ─── Hacker News (Algolia) ──────────────────────────────────────────────────

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_title?: string;
  story_text?: string;
  comment_text?: string;
  url?: string;
  points?: number;
  _tags?: string[];
}

async function fetchHackerNews(query: string, limit: number): Promise<HNItem[]> {
  const params = new URLSearchParams({
    query,
    tags: "(story,comment)",
    hitsPerPage: String(Math.min(limit, 50)),
  });

  const res = await fetch(`https://hn.algolia.com/api/v1/search?${params}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HN Algolia API returned ${res.status}`);

  const json = (await res.json()) as { hits: AlgoliaHit[] };
  const items: HNItem[] = [];

  for (const hit of json.hits) {
    const isComment = hit._tags?.includes("comment");
    const title = hit.title ?? hit.story_title ?? "(HN discussion)";
    const rawText = isComment ? (hit.comment_text ?? "") : (hit.story_text ?? "");
    const text = rawText.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const displayText = text || title;
    if (!displayText || displayText.length < 15) continue;
    items.push({
      id: parseInt(hit.objectID),
      title,
      text: displayText,
      url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
      score: hit.points ?? 0,
      source: "hackernews",
      type: isComment ? "comment" : "story",
    });
  }

  return items;
}

// ─── Google News RSS ────────────────────────────────────────────────────────

async function fetchGoogleNews(query: string, limit: number): Promise<GNewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-GB&gl=GB&ceid=GB:en`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; BehaviourInsight/1.0; +https://github.com/Bransolo1/ScrapeCore)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Google News returned ${res.status}`);

  const xml = await res.text();
  const items = parseRssItems(xml, url);

  return items.slice(0, limit).map((item) => ({
    title: item.title,
    text: item.text || item.title,
    url: item.url,
    publishedAt: new Date().toISOString(),
    source: "gnews" as const,
  }));
}

// ─── StockTwits ─────────────────────────────────────────────────────────────

interface StockTwitsResponse {
  messages?: Array<{
    id: number;
    body: string;
    created_at: string;
    entities?: { sentiment?: { basic?: string } };
    likes?: { total?: number };
  }>;
  results?: Array<{
    id: number;
    body: string;
    created_at: string;
    entities?: { sentiment?: { basic?: string } };
    likes?: { total?: number };
  }>;
}

async function fetchStockTwits(
  symbolOrQuery: string,
  limit: number,
  mode: "symbol" | "search"
): Promise<StockTwitsMessage[]> {
  const clean = symbolOrQuery.trim().toUpperCase().replace(/^\$/, "");
  const url =
    mode === "symbol"
      ? `https://api.stocktwits.com/api/2/streams/symbol/${encodeURIComponent(clean)}.json?limit=${Math.min(limit, 30)}`
      : `https://api.stocktwits.com/api/2/search/messages.json?q=${encodeURIComponent(symbolOrQuery)}&limit=${Math.min(limit, 30)}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; BehaviourInsight/1.0)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`StockTwits API returned ${res.status}`);

  const json = (await res.json()) as StockTwitsResponse;
  const raw = json.messages ?? json.results ?? [];

  return raw
    .filter((m) => m.body && m.body.length > 10)
    .map((m) => ({
      id: m.id,
      text: m.body.trim(),
      url: `https://stocktwits.com/message/${m.id}`,
      sentiment: m.entities?.sentiment?.basic,
      likes: m.likes?.total ?? 0,
      source: "stocktwits" as const,
    }));
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const {
      query,
      symbol,
      subreddit,
      timeframe = "year",
      sort = "relevance",
      limit = 25,
      includeComments = false,
      sources = ["reddit"],
    } = (await req.json()) as {
      query?: string;
      symbol?: string;
      subreddit?: string;
      timeframe?: string;
      sort?: string;
      limit?: number;
      includeComments?: boolean;
      sources?: string[];
    };

    const hasQuery = !!query?.trim();
    const hasSymbol = !!symbol?.trim();

    if (!hasQuery && !hasSymbol) {
      return Response.json({ error: "No query or symbol provided" }, { status: 400 });
    }

    const tasks: Promise<(RedditPost | HNItem | GNewsItem | StockTwitsMessage)[]>[] = [];

    if (sources.includes("reddit") && hasQuery) {
      tasks.push(
        fetchRedditPosts(query!, subreddit, timeframe, sort, limit).then(async (posts) => {
          if (!includeComments) return posts;
          const commentArrays = await Promise.all(
            posts.slice(0, 5).map((p) => fetchRedditComments(p.permalink, 15))
          );
          return [...posts, ...commentArrays.flat()];
        })
      );
    }

    if (sources.includes("hackernews") && hasQuery) {
      tasks.push(fetchHackerNews(query!, limit));
    }

    if (sources.includes("gnews") && hasQuery) {
      tasks.push(fetchGoogleNews(query!, limit));
    }

    if (sources.includes("stocktwits")) {
      if (hasSymbol) {
        tasks.push(fetchStockTwits(symbol!, limit, "symbol"));
      } else if (hasQuery) {
        tasks.push(fetchStockTwits(query!, limit, "search"));
      }
    }

    const settled = await Promise.allSettled(tasks);
    const items: (RedditPost | HNItem | GNewsItem | StockTwitsMessage)[] = [];
    const errors: string[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") items.push(...result.value);
      else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    }

    return Response.json({ items, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

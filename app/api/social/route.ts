import type { RedditPost, HNItem } from "@/lib/scraper";

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
        body?: string; // comments
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

async function fetchRedditComments(
  permalink: string,
  maxComments = 20
): Promise<RedditPost[]> {
  const res = await fetch(`https://www.reddit.com${permalink}.json?limit=${maxComments}&raw_json=1`, {
    headers: { "User-Agent": REDDIT_UA },
    signal: AbortSignal.timeout(8_000),
  });

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

interface AlgoliaResponse {
  hits: AlgoliaHit[];
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

  const json = (await res.json()) as AlgoliaResponse;
  const items: HNItem[] = [];

  for (const hit of json.hits) {
    const isComment = hit._tags?.includes("comment");
    const title = hit.title ?? hit.story_title ?? "(HN discussion)";
    const rawText = isComment ? (hit.comment_text ?? "") : (hit.story_text ?? "");

    // Strip HTML tags from HN text
    const text = rawText
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

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

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const {
      query,
      subreddit,
      timeframe = "year",
      sort = "relevance",
      limit = 25,
      includeComments = false,
      sources = ["reddit"],
    } = (await req.json()) as {
      query: string;
      subreddit?: string;
      timeframe?: string;
      sort?: string;
      limit?: number;
      includeComments?: boolean;
      sources?: string[];
    };

    if (!query?.trim()) {
      return Response.json({ error: "No query provided" }, { status: 400 });
    }

    const tasks: Promise<(RedditPost | HNItem)[]>[] = [];

    if (sources.includes("reddit")) {
      tasks.push(
        fetchRedditPosts(query, subreddit, timeframe, sort, limit).then(
          async (posts) => {
            if (!includeComments) return posts;
            // Fetch comments for top 5 posts
            const commentArrays = await Promise.all(
              posts.slice(0, 5).map((p) => fetchRedditComments(p.permalink, 15))
            );
            return [...posts, ...commentArrays.flat()];
          }
        )
      );
    }

    if (sources.includes("hackernews")) {
      tasks.push(fetchHackerNews(query, limit));
    }

    const settled = await Promise.allSettled(tasks);
    const items: (RedditPost | HNItem)[] = [];
    const errors: string[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") {
        items.push(...result.value);
      } else {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
      }
    }

    return Response.json({ items, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

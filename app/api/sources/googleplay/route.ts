import type { GooglePlayReview } from "@/lib/scraper";

interface GPlayReview {
  id: string;
  userName: string;
  date: string;
  score: number;
  title: string | null;
  text: string;
  url: string;
  version: string | null;
}

// ─── Route handler ──────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const { packageId, country = "gb", num = 100 } = (await req.json()) as {
      packageId: string;
      country?: string;
      num?: number;
    };

    if (!packageId?.trim()) {
      return Response.json({ error: "No Google Play package ID provided" }, { status: 400 });
    }

    const cleanId = packageId.trim().replace(/\s/g, "");
    // Basic package ID validation: reverse-domain format
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(cleanId)) {
      return Response.json(
        { error: "Invalid package ID — use reverse-domain format e.g. com.bet365.android" },
        { status: 400 }
      );
    }

    const cleanCountry = (country ?? "gb").trim().toLowerCase().slice(0, 2);
    const count = Math.min(Math.max(10, num), 200);

    // Dynamic import to handle ESM package in Next.js
    const gplay = (await import("google-play-scraper")).default;

    const { data } = await (gplay.reviews as unknown as (opts: Record<string, unknown>) => Promise<{ data: GPlayReview[] }>)({
      appId: cleanId,
      lang: "en",
      country: cleanCountry,
      sort: 2, // NEWEST
      num: count,
    });

    const reviews: GooglePlayReview[] = data
      .filter((r) => r.text && r.text.length > 5)
      .map((r) => ({
        title: r.title ?? "",
        text: r.text,
        rating: r.score,
        date: r.date,
        version: r.version ?? "",
        url: r.url ?? `https://play.google.com/store/apps/details?id=${cleanId}`,
        source: "googleplay" as const,
      }));

    return Response.json({
      reviews,
      packageId: cleanId,
      country: cleanCountry,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

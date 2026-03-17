/**
 * Grounding Check
 *
 * Verifies that each AI-generated `source_text` quote is actually traceable to
 * the original input text the analyst submitted. Three levels:
 *
 *  grounded   — exact or near-exact verbatim match found in input
 *  partial    — significant word overlap but not verbatim (paraphrase/summary)
 *  ungrounded — no meaningful trace found; potential hallucination
 *
 * This is intentionally conservative: false positives (marking real quotes as
 * partial) are preferable to false negatives (missing hallucinations).
 */

import type { BehaviourAnalysis } from "@/lib/types";

export type GroundingLevel = "grounded" | "partial" | "ungrounded";

export interface GroundingItem {
  section: "barriers" | "motivators" | "key_behaviours";
  index: number;
  quote: string;
  level: GroundingLevel;
  similarity: number; // 0–1
}

export interface GroundingReport {
  /** Overall weighted score 0–100 */
  score: number;
  groundedCount: number;
  partialCount: number;
  ungroundedCount: number;
  total: number;
  items: GroundingItem[];
}

// ---------------------------------------------------------------------------
// Core algorithm
// ---------------------------------------------------------------------------

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201a\u201b\u2032\u2035']/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f\u2033\u2036"]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function wordBag(text: string): Record<string, number> {
  const bag: Record<string, number> = {};
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const w of words) bag[w] = (bag[w] ?? 0) + 1;
  return bag;
}

function cosineLike(a: Record<string, number>, b: Record<string, number>): number {
  let overlap = 0;
  let totalA = 0;
  let totalB = 0;
  for (const w of Object.keys(a)) {
    totalA += a[w];
    if (w in b) overlap += Math.min(a[w], b[w]);
  }
  for (const w of Object.keys(b)) totalB += b[w];
  if (totalA === 0 || totalB === 0) return 0;
  const precision = overlap / totalB;
  const recall = overlap / totalA;
  if (precision + recall === 0) return 0;
  // F1 but up-weight recall (how much of the quote is covered by the input)
  return (2.5 * precision * recall) / (1.5 * precision + recall);
}

function sumBag(bag: Record<string, number>): number {
  return Object.values(bag).reduce((acc: number, v: number) => acc + v, 0);
}

function slidingWindowSimilarity(quote: string, inputText: string): number {
  const quoteBag = wordBag(quote);
  const quoteLen = sumBag(quoteBag);
  if (quoteLen === 0) return 0;

  const inputWords = inputText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const windowSize = Math.max(quoteLen * 3, 30); // generous window

  let best = 0;
  for (let i = 0; i <= inputWords.length - quoteLen; i++) {
    const window = inputWords.slice(i, i + windowSize);
    const windowBag = wordBag(window.join(" "));
    const sim = cosineLike(quoteBag, windowBag);
    if (sim > best) best = sim;
    if (best > 0.9) break; // close enough
  }
  return best;
}

export function groundQuote(quote: string, inputText: string): { level: GroundingLevel; similarity: number } {
  if (!quote?.trim() || !inputText?.trim()) {
    return { level: "ungrounded", similarity: 0 };
  }

  const normQuote = normalise(quote);
  const normInput = normalise(inputText);

  // 1. Exact substring match (most reliable signal)
  if (normInput.includes(normQuote)) {
    return { level: "grounded", similarity: 1.0 };
  }

  // 2. Fuzzy window match
  const sim = slidingWindowSimilarity(normQuote, normInput);

  if (sim >= 0.7) return { level: "grounded", similarity: sim };
  if (sim >= 0.35) return { level: "partial", similarity: sim };
  return { level: "ungrounded", similarity: sim };
}

// ---------------------------------------------------------------------------
// Full analysis grounding
// ---------------------------------------------------------------------------

export function groundAnalysis(analysis: BehaviourAnalysis, inputText: string): GroundingReport {
  const items: GroundingItem[] = [];

  const check = (section: GroundingItem["section"], index: number, quote: string | undefined) => {
    if (!quote?.trim()) return;
    const { level, similarity } = groundQuote(quote, inputText);
    items.push({ section, index, quote, level, similarity });
  };

  (analysis.barriers ?? []).forEach((b, i) => check("barriers", i, b.source_text));
  (analysis.motivators ?? []).forEach((m, i) => check("motivators", i, m.source_text));
  (analysis.key_behaviours ?? []).forEach((kb, i) => check("key_behaviours", i, kb.source_text));

  const groundedCount = items.filter((x) => x.level === "grounded").length;
  const partialCount = items.filter((x) => x.level === "partial").length;
  const ungroundedCount = items.filter((x) => x.level === "ungrounded").length;
  const total = items.length;

  // Score: grounded=1, partial=0.5, ungrounded=0
  const raw = total > 0 ? (groundedCount + partialCount * 0.5) / total : 1;
  const score = Math.round(raw * 100);

  return { score, groundedCount, partialCount, ungroundedCount, total, items };
}

/** Build a lookup map: section → itemIndex → GroundingItem */
export function buildGroundingMap(report: GroundingReport): Map<string, GroundingItem> {
  const map = new Map<string, GroundingItem>();
  for (const item of report.items) {
    map.set(`${item.section}:${item.index}`, item);
  }
  return map;
}

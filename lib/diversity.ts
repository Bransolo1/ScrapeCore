/**
 * Input Diversity Check
 *
 * Detects single-source input or high duplication before analysis runs.
 * Surfaces a warning (not a gate) so analysts know to interpret cautiously.
 */

export interface DiversityCheck {
  lineCount: number;
  uniqueLineRatio: number; // unique lines / total lines (0–1)
  avgLineLength: number;
  isSingleBlock: boolean;  // fewer than 3 non-empty lines
  warning: string | null;
}

export function checkInputDiversity(text: string): DiversityCheck {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const lineCount = lines.length;

  if (lineCount === 0) {
    return { lineCount: 0, uniqueLineRatio: 1, avgLineLength: 0, isSingleBlock: true, warning: null };
  }

  const uniqueLines = new Set(lines.map((l) => l.toLowerCase().replace(/\s+/g, " ")));
  const uniqueLineRatio = uniqueLines.size / lineCount;
  const avgLineLength = Math.round(lines.reduce((s, l) => s + l.length, 0) / lineCount);
  const isSingleBlock = lineCount < 3;

  let warning: string | null = null;

  if (isSingleBlock) {
    warning =
      "Input looks like a single text block. For richer analysis, separate individual responses with line breaks.";
  } else if (uniqueLineRatio < 0.5) {
    const dupPct = Math.round((1 - uniqueLineRatio) * 100);
    warning = `${dupPct}% of text units appear to be duplicates. Results may over-represent repeated content — check your source data.`;
  }

  return { lineCount, uniqueLineRatio, avgLineLength, isSingleBlock, warning };
}

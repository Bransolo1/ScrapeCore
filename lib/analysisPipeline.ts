/**
 * Analysis Pipeline — the core behavioural insights engine.
 *
 * Extracts the analysis logic from the /api/analyze route into a reusable,
 * composable pipeline. Called by:
 *   - /api/analyze (HTTP route with SSE streaming)
 *   - /api/monitoring/run/[id] (competitor monitoring, direct call)
 *
 * ┌─────────────────┐      ┌──────────────┐      ┌───────────────────────┐
 * │  Data Sources    │─────▶│ /api/analyze │─────▶│      Pipeline         │
 * │  (sources/*)     │      │ (HTTP layer) │      │                       │
 * └─────────────────┘      └──────────────┘      │  1. Project Memory    │
 *                                                 │  2. Build Prompt      │
 * ┌─────────────────┐      ┌──────────────┐      │  3. Stream Claude     │
 * │  Monitoring      │─────▶│  Pipeline    │─────▶│  4. Parse & Validate  │
 * │  (cron / manual) │      │ (direct call)│      │  5. Clarify (if low)  │
 * └─────────────────┘      └──────────────┘      │  6. PII Detection     │
 *                                                 │  7. Grounding Check   │
 * ┌─────────────────┐      ┌──────────────┐      │  8. Validity Scoring  │
 * │  Compare         │─────▶│ 2 Analyses   │      │  9. Rubric Scoring    │
 * │  (/compare)      │      │ (Claude diff)│      │ 10. Persist to DB     │
 * └─────────────────┘      └──────────────┘      │ 11. Eval Log          │
 *                                                 └───────────────────────┘
 */

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, COMPETITOR_PROMPT_SUFFIX, buildUserPrompt, PROMPT_VERSION } from "@/lib/prompts";
import type { BehaviourAnalysis, DataType } from "@/lib/types";
import { validateAnalysis } from "@/lib/analysisSchema";
import { buildProjectMemoryBlock } from "@/lib/projectMemory";
import { scanForPII } from "@/lib/pii";
import { groundAnalysis } from "@/lib/grounding";
import type { GroundingReport } from "@/lib/grounding";
import { scoreAllInterventions } from "@/lib/validity";
import { scoreRubric } from "@/lib/rubric";
import type { RubricResult } from "@/lib/rubric";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { appendEvalLog } from "@/lib/evalLog";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineParams {
  text: string;
  dataType: DataType;
  apiKey: string;
  userId: string;
  actor?: string;
  project?: string;
  projectContext?: string;
  piiDetected?: boolean;
  /** Called with each text chunk during streaming. Omit for non-streaming use. */
  onChunk?: (text: string) => void;
}

export interface PipelineResult {
  analysis: BehaviourAnalysis;
  savedId: string | null;
  usage: { inputTokens: number; outputTokens: number };
  durationMs: number;
  truncated: boolean;
  eval: {
    groundingScore: number;
    ungroundedCount: number;
    avgValidityScore: number | null;
    weakInterventions: number[];
  };
  rubric: RubricResult;
}

export class PipelineError extends Error {
  constructor(message: string, public readonly rawText?: string) {
    super(message);
    this.name = "PipelineError";
  }
}

// ─── Pipeline Steps ──────────────────────────────────────────────────────────

/** Step 1: Resolve project memory — inject prior findings for same project */
async function resolveProjectMemory(
  project: string | undefined,
  userId: string,
): Promise<string | null> {
  if (!project) return null;
  return buildProjectMemoryBlock(project, userId);
}

/** Step 2: Build the Claude prompt (system + user messages) */
function buildPromptMessages(
  text: string,
  dataType: DataType,
  projectContext: string | undefined,
  priorMemory: string | null,
): { system: string; userContent: string } {
  const system = dataType === "competitor"
    ? SYSTEM_PROMPT + COMPETITOR_PROMPT_SUFFIX
    : SYSTEM_PROMPT;

  const contextWithMemory = [projectContext, priorMemory].filter(Boolean).join("\n\n") || undefined;
  const userContent = buildUserPrompt(text, dataType, contextWithMemory ?? projectContext);

  return { system, userContent };
}

/** Step 3: Stream Claude and collect the full response */
async function streamClaude(
  system: string,
  userContent: string,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<{
  fullText: string;
  inputTokens: number;
  outputTokens: number;
  truncated: boolean;
}> {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    system,
    messages: [{ role: "user", content: userContent }],
  });

  let fullText = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const chunk = event.delta.text;
      fullText += chunk;
      onChunk?.(chunk);
    }
  }

  const finalMessage = await stream.finalMessage();
  return {
    fullText,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
    truncated: finalMessage.stop_reason === "max_tokens",
  };
}

/** Step 4: Parse and validate the Claude response into a BehaviourAnalysis */
function parseAndValidate(text: string): BehaviourAnalysis | null {
  let raw: unknown;
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    raw = JSON.parse(cleaned);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { raw = JSON.parse(match[0]); } catch { return null; }
    }
    if (!raw) return null;
  }

  return validateAnalysis(raw) as BehaviourAnalysis | null;
}

/** Step 5: Fetch clarification note when confidence is low */
async function fetchClarificationIfNeeded(
  analysis: BehaviourAnalysis,
  originalText: string,
  apiKey: string,
): Promise<void> {
  if (analysis.confidence?.overall !== "low") return;

  try {
    const client = new Anthropic({ apiKey });
    const prompt = `Here is the low-confidence analysis JSON:\n${JSON.stringify({
      confidence: analysis.confidence,
      key_behaviours: analysis.key_behaviours?.slice(0, 3),
      barriers: analysis.barriers?.slice(0, 3),
      text_units_analysed: analysis.text_units_analysed,
    }, null, 2)}\n\nOriginal input excerpt (first 800 chars):\n${originalText.slice(0, 800)}\n\nWrite the clarification note now.`;

    const msg = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: `You are a concise behavioural science analyst. You have just completed a low-confidence analysis of some qualitative data. Your task is to write a short, helpful clarification note (2–4 sentences) for the human analyst that:
1. Explains the key reason confidence is low (e.g. thin data, ambiguous signals, single source)
2. Suggests the most important gap to address — a concrete data collection action (e.g. "Run 6–8 user interviews focusing on...")
3. Notes any tentative signal that, if confirmed, would most change the intervention recommendations

Keep it plain English. No jargon. No bullet points. Speak directly to the analyst.`,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    if (block.type === "text") analysis.clarification_note = block.text.trim();
  } catch {
    // Non-critical — skip silently
  }
}

/** Step 6: Detect PII in the input text */
function detectPII(
  text: string,
  clientPiiFlag: boolean | undefined,
): { hasPII: boolean; matches: { type: string }[]; totalCount: number } {
  const piiScan = scanForPII(text);
  return {
    hasPII: clientPiiFlag || piiScan.hasPII,
    matches: piiScan.matches,
    totalCount: piiScan.totalCount,
  };
}

/** Step 7: Evaluate grounding — verify source quotes exist in input */
function evaluateGrounding(
  analysis: BehaviourAnalysis,
  inputText: string,
): GroundingReport {
  return groundAnalysis(analysis, inputText);
}

/** Step 8: Evaluate intervention validity */
function evaluateInterventions(analysis: BehaviourAnalysis): {
  avgValidityScore: number | null;
  weakInterventions: number[];
} {
  const validityResults = scoreAllInterventions(analysis.intervention_opportunities ?? []);
  const avgValidityScore = validityResults.length > 0
    ? Math.round(validityResults.reduce((s, r) => s + r.score, 0) / validityResults.length * 10) / 10
    : null;
  const weakInterventions = validityResults
    .filter((r) => r.level === "weak")
    .map((r) => r.score);
  return { avgValidityScore, weakInterventions };
}

/** Step 9: Score rubric — 10-dimension quality evaluation */
function evaluateRubric(
  analysis: BehaviourAnalysis,
  groundingScore: number,
  avgValidityScore: number | null,
): RubricResult {
  return scoreRubric(analysis, groundingScore, avgValidityScore);
}

/** Step 10: Persist analysis to database */
async function persistAnalysis(params: {
  title: string;
  dataType: string;
  analysisJson: string;
  inputText: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  piiDetected: boolean;
  promptVersion: string;
  projectContext?: string;
  project?: string;
  evalJson?: string;
  rubricJson?: string;
  evalPassed?: boolean;
  evalNotes?: string;
  actor?: string;
  userId?: string;
}): Promise<string | null> {
  try {
    const { actor, ...data } = params;
    const record = await prisma.analysis.create({ data });
    await logAudit({
      event: "analysis.created",
      actor: actor ?? "system",
      analysisId: record.id,
      entityId: record.id,
      entityType: "analysis",
      metadata: {
        dataType: data.dataType,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        durationMs: data.durationMs,
        piiDetected: data.piiDetected,
      },
    });
    return record.id;
  } catch {
    return null;
  }
}

/** Derive a title from the analysis content */
function deriveTitle(analysis: BehaviourAnalysis): string {
  const first = analysis.key_behaviours?.[0]?.behaviour;
  if (first) return first.slice(0, 80);
  const barrier = analysis.barriers?.[0]?.barrier;
  if (barrier) return barrier.slice(0, 80);
  return "Behavioural Analysis";
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Run the full behavioural analysis pipeline.
 *
 * Steps: Memory → Prompt → Claude → Parse → Clarify → PII → Ground → Validity → Rubric → Save → Log
 */
export async function runAnalysisPipeline(params: PipelineParams): Promise<PipelineResult> {
  const {
    text, dataType, apiKey, userId,
    actor, project, projectContext, piiDetected: clientPiiFlag, onChunk,
  } = params;

  const startMs = Date.now();

  // Step 1: Resolve project memory
  const priorMemory = await resolveProjectMemory(project, userId);

  // Step 2: Build prompt
  const { system, userContent } = buildPromptMessages(text, dataType, projectContext, priorMemory);

  // Step 3: Stream Claude
  const { fullText, inputTokens, outputTokens, truncated } = await streamClaude(
    system, userContent, apiKey, onChunk,
  );

  // Step 4: Parse and validate
  const analysis = parseAndValidate(fullText);
  if (!analysis) {
    throw new PipelineError("Failed to parse analysis output", fullText);
  }

  const durationMs = Date.now() - startMs;

  // Step 5: Clarification note (if confidence is low)
  await fetchClarificationIfNeeded(analysis, text, apiKey);

  // Step 6: PII detection
  const piiResult = detectPII(text, clientPiiFlag);
  if (piiResult.hasPII) {
    await logAudit({
      event: "pii.detected",
      actor: actor ?? "system",
      entityType: "analysis",
      metadata: { piiTypes: piiResult.matches.map((m) => m.type), total: piiResult.totalCount },
    });
  }

  // Step 7: Grounding check
  const groundingReport = evaluateGrounding(analysis, text);

  // Step 8: Intervention validity
  const { avgValidityScore, weakInterventions } = evaluateInterventions(analysis);

  // Step 9: Rubric scoring
  const rubricResult = evaluateRubric(analysis, groundingReport.score, avgValidityScore);

  const evalJson = JSON.stringify({
    groundingScore: groundingReport.score,
    ungroundedCount: groundingReport.ungroundedCount,
    avgValidityScore,
    weakInterventions,
  });
  const rubricJson = JSON.stringify(rubricResult);
  const evalPassed = rubricResult.grade !== "needs_revision";
  const evalNotes = `${rubricResult.grade.toUpperCase()} — ${rubricResult.total}/50 rubric score. Grounding: ${groundingReport.score}%. Confidence: ${analysis.confidence?.overall ?? "unknown"}.`;

  // Step 10: Persist to DB
  const savedId = await persistAnalysis({
    title: deriveTitle(analysis),
    dataType,
    analysisJson: JSON.stringify(analysis),
    inputText: text,
    inputTokens,
    outputTokens,
    durationMs,
    piiDetected: piiResult.hasPII,
    promptVersion: PROMPT_VERSION,
    projectContext,
    project,
    evalJson,
    rubricJson,
    evalPassed,
    evalNotes,
    actor,
    userId,
  });

  // Step 11: Eval log (fire-and-forget)
  appendEvalLog({
    date: new Date().toISOString().slice(0, 10),
    promptVersion: PROMPT_VERSION,
    rubricGrade: rubricResult.grade,
    rubricTotal: rubricResult.total,
    groundingScore: groundingReport.score,
    dataType,
    wordCount: text.trim().split(/\s+/).length,
    analysisId: savedId ?? "unsaved",
  });

  return {
    analysis,
    savedId,
    usage: { inputTokens, outputTokens },
    durationMs,
    truncated,
    eval: {
      groundingScore: groundingReport.score,
      ungroundedCount: groundingReport.ungroundedCount,
      avgValidityScore,
      weakInterventions,
    },
    rubric: rubricResult,
  };
}

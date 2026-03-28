import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, COMPETITOR_PROMPT_SUFFIX, buildUserPrompt, PROMPT_VERSION } from "@/lib/prompts";
import type { BehaviourAnalysis, DataType } from "@/lib/types";
import { validateAnalysis } from "@/lib/analysisSchema";

const CLARIFICATION_SYSTEM = `You are a concise behavioural science analyst. You have just completed a low-confidence analysis of some qualitative data. Your task is to write a short, helpful clarification note (2–4 sentences) for the human analyst that:
1. Explains the key reason confidence is low (e.g. thin data, ambiguous signals, single source)
2. Suggests the most important gap to address — a concrete data collection action (e.g. "Run 6–8 user interviews focusing on...")
3. Notes any tentative signal that, if confirmed, would most change the intervention recommendations

Keep it plain English. No jargon. No bullet points. Speak directly to the analyst.`;

async function fetchClarificationNote(
  analysis: BehaviourAnalysis,
  originalText: string,
  claudeClient: Anthropic
): Promise<string | null> {
  try {
    const prompt = `Here is the low-confidence analysis JSON:\n${JSON.stringify({ confidence: analysis.confidence, key_behaviours: analysis.key_behaviours?.slice(0, 3), barriers: analysis.barriers?.slice(0, 3), text_units_analysed: analysis.text_units_analysed }, null, 2)}\n\nOriginal input excerpt (first 800 chars):\n${originalText.slice(0, 800)}\n\nWrite the clarification note now.`;
    const msg = await claudeClient.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: CLARIFICATION_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    return block.type === "text" ? block.text.trim() : null;
  } catch {
    return null;
  }
}
import { requireAuth } from "@/lib/apiAuth";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { logAudit } from "@/lib/audit";
import { scanForPII } from "@/lib/pii";
import { groundAnalysis } from "@/lib/grounding";
import { scoreAllInterventions } from "@/lib/validity";
import { scoreRubric } from "@/lib/rubric";
import { appendEvalLog } from "@/lib/evalLog";
import { buildProjectMemoryBlock } from "@/lib/projectMemory";
import { validateCSRF } from "@/lib/csrf";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { checkBudget, incrementUsage } from "@/lib/costGuard";

function parseAnalysis(text: string): BehaviourAnalysis | null {
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
      try {
        raw = JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    if (!raw) return null;
  }

  // Runtime validation with Zod — fills defaults for missing optional fields
  const validated = validateAnalysis(raw);
  return validated as BehaviourAnalysis | null;
}

function encodeSSE(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

function deriveTitle(analysis: BehaviourAnalysis): string {
  const first = analysis.key_behaviours?.[0]?.behaviour;
  if (first) return first.slice(0, 80);
  const barrier = analysis.barriers?.[0]?.barrier;
  if (barrier) return barrier.slice(0, 80);
  return "Behavioural Analysis";
}

async function saveAnalysis(params: {
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

export async function POST(req: Request) {
  // CSRF protection
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  // Rate limit check
  const ip = getClientIp(req);
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.allowed) {
    const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return Response.json(
      {
        error: `Rate limit exceeded. You can run ${rateLimit.limit} analyses per hour. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
        },
      }
    );
  }

  try {
    // Enforce authentication
    const authResult = await requireAuth();
    if (authResult instanceof Response) return authResult;
    const sessionUserId = authResult.userId;

    // Resolve API key (user's own → platform → 503)
    const resolved = await resolveApiKey("anthropic", sessionUserId);
    if (!resolved) {
      return Response.json({ error: "No Anthropic API key configured. Add your key in Settings.", code: "no_api_key" }, { status: 503 });
    }

    // Check Anthropic budget before proceeding
    const budget = await checkBudget(sessionUserId, "anthropic");
    if (!budget.allowed) {
      return Response.json(
        { error: `Monthly Anthropic budget exceeded ($${((budget.limit ?? 0) / 100).toFixed(2)}). Adjust in Settings > Cost Controls.`, code: "budget_exceeded" },
        { status: 402 }
      );
    }

    const { text, dataType, actor, piiDetected: clientPiiFlag, projectContext, project } = (await req.json()) as {
      text: string;
      dataType: DataType;
      actor?: string;
      piiDetected?: boolean;
      projectContext?: string;
      project?: string;
    };

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    // Input size limit: 100KB
    const INPUT_LIMIT = 100 * 1024;
    if (text.length > INPUT_LIMIT) {
      return Response.json(
        { error: `Input too large (${Math.round(text.length / 1024)}KB). Maximum is 100KB (~20,000 words). Trim your input and try again.` },
        { status: 413 }
      );
    }

    // Project memory: inject prior findings for same project as additional context
    const priorMemory = project ? await buildProjectMemoryBlock(project, sessionUserId) : null;
    const contextWithMemory = [projectContext, priorMemory].filter(Boolean).join("\n\n") || undefined;

    const startMs = Date.now();
    const systemPrompt =
      dataType === "competitor"
        ? SYSTEM_PROMPT + COMPETITOR_PROMPT_SUFFIX
        : SYSTEM_PROMPT;

    const claudeClient = new Anthropic({ apiKey: resolved.key });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = claudeClient.messages.stream({
            model: "claude-opus-4-6",
            max_tokens: 8192,
            system: systemPrompt,
            messages: [
              {
                role: "user",
                content: buildUserPrompt(text, dataType, contextWithMemory ?? projectContext),
              },
            ],
          });

          let fullText = "";

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(encodeSSE({ type: "chunk", text: chunk }));
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          const inputTokens = finalMessage.usage.input_tokens;
          const outputTokens = finalMessage.usage.output_tokens;
          const durationMs = Date.now() - startMs;
          const wasTruncated = finalMessage.stop_reason === "max_tokens";

          // Track Anthropic token usage for budget enforcement
          const totalTokens = inputTokens + outputTokens;
          await incrementUsage(sessionUserId, "anthropic", totalTokens);

          const analysis = parseAnalysis(fullText);

          if (analysis) {
            // Fallback clarification note when confidence is low
            if (analysis.confidence?.overall === "low") {
              const note = await fetchClarificationNote(analysis, text, claudeClient);
              if (note) analysis.clarification_note = note;
            }

            // PII check on the input text (server-side confirmation)
            const piiScan = scanForPII(text);
            const hasPII = clientPiiFlag || piiScan.hasPII;

            if (hasPII) {
              await logAudit({
                event: "pii.detected",
                actor: actor ?? "system",
                entityType: "analysis",
                metadata: { piiTypes: piiScan.matches.map((m) => m.type), total: piiScan.totalCount },
              });
            }

            // Server-side eval: grounding + validity scores
            const groundingReport = groundAnalysis(analysis, text);
            const validityResults = scoreAllInterventions(analysis.intervention_opportunities ?? []);
            const avgValidityScore =
              validityResults.length > 0
                ? Math.round(validityResults.reduce((s, r) => s + r.score, 0) / validityResults.length * 10) / 10
                : null;
            const weakInterventions = validityResults.filter((r) => r.level === "weak").map((r) => r.score);
            const evalJson = JSON.stringify({
              groundingScore: groundingReport.score,
              ungroundedCount: groundingReport.ungroundedCount,
              avgValidityScore,
              weakInterventions,
            });

            const rubricResult = scoreRubric(analysis, groundingReport.score, avgValidityScore);
            const rubricJson = JSON.stringify(rubricResult);
            const evalPassed = rubricResult.grade !== "needs_revision";
            const evalNotes = `${rubricResult.grade.toUpperCase()} — ${rubricResult.total}/50 rubric score. Grounding: ${groundingReport.score}%. Confidence: ${analysis.confidence?.overall ?? "unknown"}.`;

            // Persist to DB
            const savedId = await saveAnalysis({
              title: deriveTitle(analysis),
              dataType,
              analysisJson: JSON.stringify(analysis),
              inputText: text,
              inputTokens,
              outputTokens,
              durationMs,
              piiDetected: hasPII,
              promptVersion: PROMPT_VERSION,
              projectContext,
              project,
              evalJson,
              rubricJson,
              evalPassed,
              evalNotes,
              actor,
              userId: sessionUserId,
            });

            // Append to eval log file (fire-and-forget)
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

            controller.enqueue(
              encodeSSE({
                type: "complete",
                analysis,
                savedId,
                usage: { inputTokens, outputTokens },
                truncated: wasTruncated,
                rateLimitRemaining: rateLimit.remaining,
              })
            );
          } else {
            controller.enqueue(
              encodeSSE({
                type: "error",
                error: "Failed to parse analysis output. Raw text returned.",
                rawText: fullText,
              })
            );
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encodeSSE({ type: "error", error: message }));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rateLimit.resetAt / 1000)),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

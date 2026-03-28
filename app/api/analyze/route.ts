import { requireAuth } from "@/lib/apiAuth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { validateCSRF } from "@/lib/csrf";
import { resolveApiKey } from "@/lib/resolveApiKey";
import { checkBudget, incrementUsage } from "@/lib/costGuard";
import { runAnalysisPipeline, PipelineError } from "@/lib/analysisPipeline";
import type { DataType } from "@/lib/types";

function encodeSSE(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
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

    // Budget check — block if Anthropic monthly budget exceeded
    const budget = await checkBudget(sessionUserId, "anthropic");
    if (!budget.allowed) {
      return Response.json(
        { error: `Monthly Anthropic budget exceeded ($${((budget.limit ?? 0) / 100).toFixed(2)}). Adjust in Settings > Cost Controls.`, code: "budget_exceeded" },
        { status: 402 }
      );
    }

    const { text, dataType, actor, piiDetected, projectContext, project } = (await req.json()) as {
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

    // Stream the analysis pipeline via SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await runAnalysisPipeline({
            text,
            dataType,
            apiKey: resolved.key,
            userId: sessionUserId,
            actor,
            project,
            projectContext,
            piiDetected,
            onChunk: (chunk) => {
              controller.enqueue(encodeSSE({ type: "chunk", text: chunk }));
            },
          });

          // Track Anthropic usage for budget enforcement
          incrementUsage(sessionUserId, "anthropic", result.usage.inputTokens + result.usage.outputTokens);

          controller.enqueue(
            encodeSSE({
              type: "complete",
              analysis: result.analysis,
              savedId: result.savedId,
              usage: result.usage,
              truncated: result.truncated,
              rateLimitRemaining: rateLimit.remaining,
            })
          );
        } catch (err) {
          if (err instanceof PipelineError && err.rawText) {
            controller.enqueue(
              encodeSSE({
                type: "error",
                error: "Failed to parse analysis output. Raw text returned.",
                rawText: err.rawText,
              })
            );
          } else {
            const message = err instanceof Error ? err.message : "Unknown error";
            controller.enqueue(encodeSSE({ type: "error", error: message }));
          }
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

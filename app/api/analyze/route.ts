import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import type { BehaviourAnalysis, DataType } from "@/lib/types";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const client = new Anthropic();

function parseAnalysis(text: string): BehaviourAnalysis | null {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as BehaviourAnalysis;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as BehaviourAnalysis;
      } catch {
        return null;
      }
    }
    return null;
  }
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
}) {
  try {
    await prisma.analysis.create({ data: params });
  } catch {
    // Saving should never crash the stream — log silently
  }
}

export async function POST(req: Request) {
  // Rate limit check
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(ip);

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
    const { text, dataType } = (await req.json()) as {
      text: string;
      dataType: DataType;
    };

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

    const startMs = Date.now();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = client.messages.stream({
            model: "claude-opus-4-6",
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: buildUserPrompt(text, dataType),
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

          const analysis = parseAnalysis(fullText);

          if (analysis) {
            // Persist to DB (fire-and-forget, non-blocking)
            saveAnalysis({
              title: deriveTitle(analysis),
              dataType,
              analysisJson: JSON.stringify(analysis),
              inputText: text,
              inputTokens,
              outputTokens,
              durationMs,
            });

            controller.enqueue(
              encodeSSE({
                type: "complete",
                analysis,
                usage: { inputTokens, outputTokens },
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

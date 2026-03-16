import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/prompts";
import type { BehaviourAnalysis, DataType } from "@/lib/types";

const client = new Anthropic();

function parseAnalysis(text: string): BehaviourAnalysis | null {
  try {
    // Strip any accidental markdown fencing
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned) as BehaviourAnalysis;
  } catch {
    // Try to find JSON object in the text
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

export async function POST(req: Request) {
  try {
    const { text, dataType } = (await req.json()) as {
      text: string;
      dataType: DataType;
    };

    if (!text?.trim()) {
      return Response.json({ error: "No text provided" }, { status: 400 });
    }

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
              controller.enqueue(
                encodeSSE({ type: "chunk", text: chunk })
              );
            }
          }

          const finalMessage = await anthropicStream.finalMessage();
          const inputTokens = finalMessage.usage.input_tokens;
          const outputTokens = finalMessage.usage.output_tokens;

          const analysis = parseAnalysis(fullText);

          if (analysis) {
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
          const message =
            err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(
            encodeSSE({ type: "error", error: message })
          );
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
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

import { buildSystemPrompt, buildUserPrompt, type CopilotPromptContext } from "@/lib/copilot/prompts";

export type CopilotToolResponse = {
  reply: string;
  citations?: Array<{ label: string; url?: string }>;
  toolCalls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
};

export type CopilotStreamEvent =
  | { type: "token"; token: string }
  | { type: "done"; payload: CopilotToolResponse }
  | { type: "error"; message: string }
  | { type: "function_call"; functionName: string; arguments: string }
  | { type: "function_result"; result: unknown };

export type FunctionDefinition = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
  name?: string;
};

type StreamOptions = {
  signal?: AbortSignal;
  functions?: FunctionDefinition[];
  messages?: ChatMessage[];
};

const DEFAULT_MODEL = process.env.COPILOT_MODEL ?? "gpt-5-mini";
const OPENAI_URL = process.env.OPENAI_API_URL ?? "https://api.openai.com/v1/chat/completions";

export async function streamCopilotResponse(
  context: CopilotPromptContext,
  emit: (event: CopilotStreamEvent) => void | Promise<void>,
  options: StreamOptions = {},
): Promise<CopilotToolResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    const fallback = buildFallbackResponse(context, "OpenAI credentials not configured.");
    await emit({ type: "done", payload: fallback });
    return fallback;
  }

  const enriched = enrichMetrics(context.metrics);
  const updatedContext = { ...context, metrics: enriched };
  const citations = buildCitations(enriched);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  if (process.env.OPENAI_ORGANIZATION) {
    headers["OpenAI-Organization"] = process.env.OPENAI_ORGANIZATION;
  }

  if (process.env.OPENAI_PROJECT) {
    headers["OpenAI-Project"] = process.env.OPENAI_PROJECT;
  }

  const useResponsesAPI = OPENAI_URL.includes("/responses");

  // Build messages array - use provided messages or construct default
  const messages =
    options.messages ||
    ([
      { role: "system" as const, content: buildSystemPrompt(updatedContext) },
      { role: "user" as const, content: buildUserPrompt(updatedContext) },
    ] as ChatMessage[]);

  const requestBody = useResponsesAPI
    ? {
        model: DEFAULT_MODEL,
        max_output_tokens: 600,
        stream: true,
        input: [
          {
            role: "system" as const,
            content: [
              {
                type: "input_text" as const,
                text: buildSystemPrompt(updatedContext),
              },
            ],
          },
          {
            role: "user" as const,
            content: [
              {
                type: "input_text" as const,
                text: buildUserPrompt(updatedContext),
              },
            ],
          },
        ],
      }
    : {
        model: DEFAULT_MODEL,
        stream: true,
        messages,
        ...(options.functions && options.functions.length > 0
          ? { tools: options.functions.map((fn) => ({ type: "function" as const, function: fn })) }
          : {}),
      };

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const errorBody = await safeReadBody(response);
      console.warn("[copilot] OpenAI request failed:", response.status, errorBody);
      const message =
        response.status === 401
          ? "Copilot credentials look off—refresh the OpenAI key and try again."
          : `Copilot is smoothing a connection hiccup—try again in a moment. (HTTP ${response.status})`;
      const fallback = buildFallbackResponse(updatedContext, message, {
        code: response.status,
        body: errorBody,
        endpoint: OPENAI_URL,
      });
      await emit({ type: "done", payload: fallback });
      return fallback;
    }

    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let buffer = "";
    let aggregated = "";
    let completed = false;
    let lastStructuredText = "";
    let finishReason: string | null = null;

    // Tool call accumulation
    type ToolCallAccumulator = {
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    };
    const toolCalls: Map<number, ToolCallAccumulator> = new Map();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const delimiterIndex = buffer.indexOf("\n\n");
        if (delimiterIndex === -1) {
          break;
        }

        const rawEvent = buffer.slice(0, delimiterIndex).trim();
        buffer = buffer.slice(delimiterIndex + 2);

        if (!rawEvent) {
          continue;
        }

        for (const line of rawEvent.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) {
            continue;
          }

          const data = trimmed.slice(5).trim();
          if (!data || data === "[DONE]") {
            continue;
          }

          let chunk: unknown;
          try {
            chunk = JSON.parse(data);
          } catch (error) {
            console.warn("[copilot] Failed parsing OpenAI chunk:", error);
            continue;
          }

          if (useResponsesAPI) {
            const parsed = chunk as {
              type?: string;
              delta?: unknown;
              response?: {
                output_text?: string[];
                output?: Array<{
                  content?: Array<{ type?: string; text?: string }>;
                }>;
              };
              error?: { message?: string };
            };

            if (parsed.type === "response.error") {
              const errorMessage = parsed.error?.message ?? "OpenAI returned an error.";
              await emit({ type: "error", message: errorMessage });
              continue;
            }

            if (parsed.type === "response.completed") {
              completed = true;
              continue;
            }

            if (parsed.type === "response.output_text.delta") {
              const token =
                typeof parsed.delta === "string"
                  ? parsed.delta
                  : typeof (parsed.delta as { text?: string })?.text === "string"
                    ? (parsed.delta as { text?: string }).text ?? ""
                    : "";

              if (token) {
                aggregated += token;
                await emit({ type: "token", token });
              }
              continue;
            }

            if (parsed.type === "response.output_text.done") {
              completed = true;
              continue;
            }

            const structuredText =
              parsed.response?.output_text?.join("") ??
              parsed.response?.output
                ?.flatMap((item) =>
                  item.content
                    ?.filter((entry) => entry.type === undefined || entry.type === "text")
                    .map((entry) => entry.text ?? "")
                    .filter(Boolean),
                )
                .join("");

            if (structuredText) {
              lastStructuredText = structuredText;
            }
          } else {
            const parsed = chunk as {
              choices?: Array<{
                delta?: {
                  content?: string | null;
                  tool_calls?: Array<{
                    index: number;
                    id?: string;
                    type?: string;
                    function?: {
                      name?: string;
                      arguments?: string;
                    };
                  }>;
                };
                finish_reason?: string | null;
              }>;
              error?: { message?: string };
            };

            if (parsed.error?.message) {
              await emit({ type: "error", message: parsed.error.message });
              continue;
            }

            const choice = parsed.choices?.[0];
            if (!choice) continue;

            // Handle content delta
            const delta = choice.delta?.content ?? null;
            if (delta) {
              aggregated += delta;
              await emit({ type: "token", token: delta });
            }

            // Handle tool_calls delta
            if (choice.delta?.tool_calls) {
              for (const toolCallDelta of choice.delta.tool_calls) {
                const index = toolCallDelta.index;
                let toolCall = toolCalls.get(index);

                if (!toolCall) {
                  // Initialize new tool call
                  toolCall = {
                    id: toolCallDelta.id ?? "",
                    type: toolCallDelta.type ?? "function",
                    function: {
                      name: toolCallDelta.function?.name ?? "",
                      arguments: toolCallDelta.function?.arguments ?? "",
                    },
                  };
                  toolCalls.set(index, toolCall);
                } else {
                  // Accumulate deltas
                  if (toolCallDelta.id) {
                    toolCall.id = toolCallDelta.id;
                  }
                  if (toolCallDelta.type) {
                    toolCall.type = toolCallDelta.type;
                  }
                  if (toolCallDelta.function?.name) {
                    toolCall.function.name += toolCallDelta.function.name;
                  }
                  if (toolCallDelta.function?.arguments) {
                    toolCall.function.arguments += toolCallDelta.function.arguments;
                  }
                }
              }
            }

            const finish = choice.finish_reason ?? null;
            if (finish) {
              finishReason = finish;
              completed = true;
            }
          }
        }
      }
    }

    // Check if we have tool calls instead of a text response
    if (toolCalls.size > 0 && finishReason === "tool_calls") {
      // Emit function_call events for each tool call
      const toolCallsArray = Array.from(toolCalls.values());
      for (const toolCall of toolCallsArray) {
        await emit({
          type: "function_call",
          functionName: toolCall.function.name,
          arguments: toolCall.function.arguments,
        });
      }

      // Return response with tool calls
      // The caller is responsible for executing functions and continuing the conversation
      const payload: CopilotToolResponse = {
        reply: "", // No text reply when tool calls are present
        citations,
        toolCalls: toolCallsArray,
      };
      return payload;
    }

    let reply = aggregated.trim();
    if (!reply && lastStructuredText) {
      reply = lastStructuredText.trim();
    }

    if (!reply || (!completed && !aggregated && !finishReason)) {
      const fallback = buildFallbackResponse(updatedContext, "Copilot didn't return a reply. Let's try again shortly.", {
        note: "No tokens returned",
        finishReason,
        useResponsesAPI,
      });
      await emit({ type: "done", payload: fallback });
      return fallback;
    }

    const payload: CopilotToolResponse = {
      reply,
      citations,
    };

    await emit({ type: "done", payload });
    return payload;
  } catch (error) {
    if (!(error instanceof Error && error.name === "AbortError")) {
      console.error("[copilot] OpenAI request threw:", error);
    }
    const fallback = buildFallbackResponse(updatedContext, "Copilot hit a snag reaching GPT-5-mini.", {
      error: error instanceof Error ? error.message : String(error),
    });
    await emit({ type: "done", payload: fallback });
    return fallback;
  }
}

export async function generateCopilotResponse(context: CopilotPromptContext): Promise<CopilotToolResponse> {
  let response: CopilotToolResponse | null = null;
  await streamCopilotResponse(
    context,
    (event) => {
      if (event.type === "done") {
        response = event.payload;
      }
    },
    {},
  );
  return (
    response ?? {
      reply: "Copilot did not produce a response.",
      citations: buildCitations(enrichMetrics(context.metrics)),
    }
  );
}

function buildFallbackResponse(
  context: CopilotPromptContext,
  reason: string,
  debug?: Record<string, unknown>,
): CopilotToolResponse {
  const metrics = enrichMetrics(context.metrics);
  const lines = [
    reason,
    metrics.revenueStatusSummary,
    metrics.cadenceSummary,
    metrics.hotlistSummary,
    debug ? `Debug: ${JSON.stringify(debug)}` : "",
  ].filter(Boolean);

  return {
    reply: lines.join(" "),
    citations: buildCitations(metrics),
  };
}

function buildCitations(metrics: ReturnType<typeof enrichMetrics>) {
  const citations: Array<{ label: string; url?: string }> = [{ label: "Dashboard metrics" }];

  if (metrics.atRiskCount > 0 || metrics.dueSoonCount > 0) {
    citations.push({ label: "Cadence hotlist", url: "/portal" });
  }

  return citations;
}

async function safeReadBody(response: Response) {
  try {
    return await response.text();
  } catch (error) {
    console.warn("[copilot] Unable to read failed response body:", error);
    return null;
  }
}

function enrichMetrics(metrics: CopilotPromptContext["metrics"]) {
  const currencySymbol = metrics.arpddSummary.includes("$")
    ? metrics.arpddSummary.charAt(0)
    : metrics.revenueStatus === "Awaiting data"
      ? "$"
      : "$";

  const revenueStatusSummary =
    metrics.revenueStatus === "Awaiting data"
      ? "Revenue trend data needs to be refreshed before I can quantify it."
      : metrics.revenueStatus === "Growing"
        ? `Revenue trend is ${metrics.revenueStatus.toLowerCase()} with positive movement.`
        : `Revenue trend is ${metrics.revenueStatus.toLowerCase()}.`;

  const cadenceSummary =
    metrics.paceLabel === "Awaiting data"
      ? "Cadence data may need to be refreshed."
      : `Cadence is ${metrics.paceLabel.toLowerCase()}.`;

  const hotlistSummary =
    metrics.atRiskCount > 0
      ? `${metrics.atRiskCount} account${metrics.atRiskCount === 1 ? "" : "s"} are past cadence—queue outreach.`
      : metrics.dueSoonCount > 0
        ? `${metrics.dueSoonCount} account${metrics.dueSoonCount === 1 ? "" : "s"} come due soon; line up reminders.`
        : "No cadence risks are on the radar right now.";

  const arpddNumeric =
    "arpddValue" in metrics && typeof (metrics as { arpddValue?: unknown }).arpddValue === "number"
      ? (metrics as { arpddValue?: number }).arpddValue ?? null
      : null;

  const arpddSummary =
    arpddNumeric !== null ? `${currencySymbol}${Math.round(arpddNumeric)} / day` : metrics.arpddSummary;

  return {
    ...metrics,
    revenueStatusSummary,
    cadenceSummary,
    hotlistSummary,
    arpddSummary,
  };
}

/**
 * Helper to build message history for continuing a conversation after function execution.
 *
 * Usage:
 * 1. Call streamCopilotResponse with functions
 * 2. If toolCalls are returned, execute the functions
 * 3. Use this helper to build new messages array with results
 * 4. Call streamCopilotResponse again with the new messages
 */
export function buildMessagesWithFunctionResults(
  previousMessages: ChatMessage[],
  assistantToolCalls: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>,
  functionResults: Array<{
    tool_call_id: string;
    name: string;
    result: unknown;
  }>,
): ChatMessage[] {
  const newMessages: ChatMessage[] = [...previousMessages];

  // Add assistant message with tool calls
  newMessages.push({
    role: "assistant",
    content: null,
    tool_calls: assistantToolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: tc.function,
    })),
  });

  // Add tool result messages
  for (const result of functionResults) {
    newMessages.push({
      role: "tool",
      content: JSON.stringify(result.result),
      tool_call_id: result.tool_call_id,
      name: result.name,
    });
  }

  return newMessages;
}

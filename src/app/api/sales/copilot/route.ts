import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import { computeOrderHealthMetrics } from "@/lib/analytics";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/copilot/prompts";
import { streamCopilotResponse, buildMessagesWithFunctionResults } from "@/lib/copilot/service";
import { FUNCTION_DEFINITIONS, FUNCTIONS } from "@/lib/copilot/functions";

type CopilotRequestPayload = {
  message?: string;
};

export async function POST(request: NextRequest) {
  let payload: CopilotRequestPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = payload.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required." }, { status: 400 });
  }

  return withSalesSession(request, async ({ db, tenantId, session }) => {
    const startTime = Date.now();
    console.log(`[copilot-timing] Request started at ${new Date().toISOString()}`);

    const baseWhere: Prisma.OrderWhereInput = {
      tenantId,
    };

    // Sales reps see data filtered by their territory
    if (session.user.salesRep?.territoryId) {
      baseWhere.customer = {
        territoryId: session.user.salesRep.territoryId,
      };
    }

    const recentOrders = await db.order.findMany({
      where: baseWhere,
      select: {
        orderedAt: true,
        total: true,
        currency: true,
        status: true,
        customerId: true,
      },
      orderBy: {
        orderedAt: "desc",
      },
      take: 250,
    });

    const metrics = computeOrderHealthMetrics(
      recentOrders.map((order) => ({
        orderedAt: order.orderedAt,
        total: order.total,
        currency: order.currency,
        status: order.status,
        customerId: order.customerId,
      })),
    );

    const hotlistCustomerIds = metrics.accountSignals.hotlist.map((entry) => entry.customerId);
    let hotlistWithNames: Array<
      ReturnType<typeof computeOrderHealthMetrics>["accountSignals"]["hotlist"][number] & {
        name: string | null;
      }
    > = [];
    if (hotlistCustomerIds.length > 0) {
      const customers = await db.customer.findMany({
        where: {
          id: {
            in: hotlistCustomerIds,
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      const nameMap = new Map(customers.map((customer) => [customer.id, customer.name]));
      hotlistWithNames = metrics.accountSignals.hotlist.map((entry) => ({
        ...entry,
        name: nameMap.get(entry.customerId) ?? null,
      }));
    }

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    // Calculate actual weekly and monthly revenue
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const weeklyRevenue = recentOrders
      .filter((order) => order.orderedAt && new Date(order.orderedAt) >= weekAgo)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const monthlyRevenue = recentOrders
      .filter((order) => order.orderedAt && new Date(order.orderedAt) >= monthAgo)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const weeklyOrderCount = recentOrders.filter(
      (order) => order.orderedAt && new Date(order.orderedAt) >= weekAgo,
    ).length;

    const monthlyOrderCount = recentOrders.filter(
      (order) => order.orderedAt && new Date(order.orderedAt) >= monthAgo,
    ).length;

    const contextualMetrics = {
      revenueStatus: metrics.revenueStatus,
      paceLabel: metrics.paceLabel,
      arpddSummary: metrics.arpdd.summary,
      atRiskCount: metrics.accountSignals.atRisk,
      dueSoonCount: metrics.accountSignals.dueSoon,
      revenueSummary: metrics.revenueSummary,
      revenueChangePercent: metrics.revenueSummary.includes("(")
        ? metrics.revenueSummary.split("(")[1].replace(")", "").trim()
        : null,
      arpddValue: metrics.arpdd.currentValue,
      arpddChangePercent: metrics.arpdd.changePercent,
      weeklyRevenue,
      weeklyOrderCount,
      monthlyRevenue,
      monthlyOrderCount,
      currency: recentOrders[0]?.currency || "USD",
    };

    const promptContext = {
      tenantName: tenant?.name ?? null,
      metrics: contextualMetrics,
      userMessage: message,
    };

    const prompts = {
      system: buildSystemPrompt(promptContext),
      user: buildUserPrompt(promptContext),
    };

    const followUps = buildFollowUps(metrics, hotlistWithNames);

    const abortController = new AbortController();
    const detachAbort = linkAbortSignals(request.signal, abortController);

    // Get territoryId for function scoping
    const territoryId = session.user.salesRep?.territoryId;

    // Execute initial AI call to detect if functions are needed
    // This MUST happen inside the transaction scope
    let initialResponseForFunctions: Awaited<ReturnType<typeof streamCopilotResponse>> | null = null;
    let functionResults: Array<{ tool_call_id: string; name: string; result: unknown }> = [];
    let messagesWithResults: any[] | null = null;

    // First: Get AI decision on whether to use functions (non-streaming, just to detect tool calls)
    const detectionStart = Date.now();
    const detectionResponse = await streamCopilotResponse(
      promptContext,
      async () => {
        // Don't stream during detection phase
      },
      {
        signal: abortController.signal,
        functions: FUNCTION_DEFINITIONS,
      },
    );
    console.log(`[copilot-timing] First OpenAI call took ${Date.now() - detectionStart}ms`);

    // If functions needed, execute them NOW while transaction is open
    if (detectionResponse.toolCalls && detectionResponse.toolCalls.length > 0) {
      console.log(`[copilot-timing] Executing ${detectionResponse.toolCalls.length} function(s): ${detectionResponse.toolCalls.map(tc => tc.function.name).join(', ')}`);
      const functionStart = Date.now();

      functionResults = await Promise.all(
        detectionResponse.toolCalls.map(async (toolCall) => {
          try {
            const args = JSON.parse(toolCall.function.arguments);
            const fn = FUNCTIONS[toolCall.function.name];
            if (!fn) {
              return {
                tool_call_id: toolCall.id,
                name: toolCall.function.name,
                result: { error: `Function ${toolCall.function.name} not found` },
              };
            }

            // Execute NOW while transaction is still open
            const result = await fn(db, tenantId, territoryId, args);
            return {
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              result,
            };
          } catch (error) {
            console.error(`[copilot] Function execution error:`, error);
            return {
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              result: {
                error: error instanceof Error ? error.message : "Function execution failed",
              },
            };
          }
        }),
      );

      // Build messages with results
      const initialMessages = [
        { role: "system" as const, content: buildSystemPrompt(promptContext) },
        { role: "user" as const, content: buildUserPrompt(promptContext) },
      ];

      console.log(`[copilot-timing] Function execution took ${Date.now() - functionStart}ms`);

      messagesWithResults = buildMessagesWithFunctionResults(
        initialMessages,
        detectionResponse.toolCalls,
        functionResults,
      );
    }

    console.log(`[copilot-timing] Total time before streaming: ${Date.now() - startTime}ms`);

    // NOW create the stream with cached function results
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        };

        send({
          type: "meta",
          metrics: {
            ...contextualMetrics,
            hotlist: hotlistWithNames,
          },
          followUps,
        });

        try {
          // If we have function results, make second call with them
          if (messagesWithResults) {
            await streamCopilotResponse(
              promptContext,
              async (event) => {
                if (event.type === "token") {
                  send({ type: "token", token: event.token });
                } else if (event.type === "done") {
                  send({
                    type: "done",
                    reply: event.payload.reply,
                    citations: event.payload.citations ?? [],
                    metrics: {
                      revenueStatus: contextualMetrics.revenueStatus,
                      paceLabel: contextualMetrics.paceLabel,
                      arpddSummary:
                        contextualMetrics.arpddSummary === "—" && contextualMetrics.arpddValue !== null
                          ? `${contextualMetrics.arpddValue.toFixed(0)} ${metrics.arpdd.currency}/day`
                          : contextualMetrics.arpddSummary,
                      atRiskCount: contextualMetrics.atRiskCount,
                      dueSoonCount: contextualMetrics.dueSoonCount,
                      hotlist: hotlistWithNames,
                      revenueSummary: contextualMetrics.revenueSummary,
                      revenueChangePercent: contextualMetrics.revenueChangePercent,
                      arpddValue: contextualMetrics.arpddValue,
                      arpddChangePercent: contextualMetrics.arpddChangePercent,
                    },
                    followUps,
                    prompts,
                  });
                } else if (event.type === "error") {
                  send({ type: "error", message: event.message });
                }
              },
              {
                signal: abortController.signal,
                messages: messagesWithResults,
                functions: FUNCTION_DEFINITIONS,
              },
            );
          } else {
            // No function calls, stream the initial response
            await streamCopilotResponse(
              promptContext,
              async (event) => {
                if (event.type === "token") {
                  send({ type: "token", token: event.token });
                } else if (event.type === "done") {
                  send({
                    type: "done",
                    reply: event.payload.reply,
                    citations: event.payload.citations ?? [],
                    metrics: {
                      revenueStatus: contextualMetrics.revenueStatus,
                      paceLabel: contextualMetrics.paceLabel,
                      arpddSummary:
                        contextualMetrics.arpddSummary === "—" && contextualMetrics.arpddValue !== null
                          ? `${contextualMetrics.arpddValue.toFixed(0)} ${metrics.arpdd.currency}/day`
                          : contextualMetrics.arpddSummary,
                      atRiskCount: contextualMetrics.atRiskCount,
                      dueSoonCount: contextualMetrics.dueSoonCount,
                      hotlist: hotlistWithNames,
                      revenueSummary: contextualMetrics.revenueSummary,
                      revenueChangePercent: contextualMetrics.revenueChangePercent,
                      arpddValue: contextualMetrics.arpddValue,
                      arpddChangePercent: contextualMetrics.arpddChangePercent,
                    },
                    followUps,
                    prompts,
                  });
                } else if (event.type === "error") {
                  send({ type: "error", message: event.message });
                }
              },
              {
                signal: abortController.signal,
                functions: FUNCTION_DEFINITIONS,
              },
            );
          }
        } finally {
          if (detachAbort) {
            detachAbort();
          }
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
        if (detachAbort) {
          detachAbort();
        }
      },
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  });
}

function buildFollowUps(
  metrics: ReturnType<typeof computeOrderHealthMetrics>,
  hotlist: Array<
    ReturnType<typeof computeOrderHealthMetrics>["accountSignals"]["hotlist"][number] & {
      name: string | null;
    }
  > = [],
) {
  const suggestions: string[] = [];

  if (hotlist.length > 0) {
    const customer = hotlist[0];
    const label = customer.name ?? customer.customerId;
    suggestions.push(`Show cadence history for ${label}.`);
  }

  suggestions.push("What's the latest ARPDD change versus last month?");
  suggestions.push("List invoices contributing to the current revenue status.");

  return suggestions;
}

function linkAbortSignals(source: AbortSignal | undefined, target: AbortController) {
  if (!source) {
    return undefined;
  }

  if (source.aborted) {
    target.abort();
    return undefined;
  }

  const handler = () => target.abort();
  source.addEventListener("abort", handler, { once: true });
  return () => source.removeEventListener("abort", handler);
}

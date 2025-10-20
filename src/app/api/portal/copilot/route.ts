import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";
import { computeOrderHealthMetrics } from "@/lib/analytics";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/copilot/prompts";
import { streamCopilotResponse } from "@/lib/copilot/service";

type CopilotRequestPayload = {
  message?: string;
};

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

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

  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const baseWhere: Prisma.OrderWhereInput = {
        tenantId,
      };

      // Admin users (Portal Admin) see all tenant data
      // Customer users (Portal Viewer, Portal Buyer) see only their data
      if (!hasTenantWideScope(roles)) {
        if (session.portalUser.customerId) {
          baseWhere.customerId = session.portalUser.customerId;
        } else {
          baseWhere.portalUserId = session.portalUserId;
        }
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
      let hotlistWithNames: Array<ReturnType<typeof computeOrderHealthMetrics>["accountSignals"]["hotlist"][number] & { name: string | null }> = [];
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

      const contextualMetrics = {
        revenueStatus: metrics.revenueStatus,
        paceLabel: metrics.paceLabel,
        arpddSummary: metrics.arpdd.summary,
        atRiskCount: metrics.accountSignals.atRisk,
        dueSoonCount: metrics.accountSignals.dueSoon,
        revenueSummary: metrics.revenueSummary,
        revenueChangePercent: metrics.revenueSummary.includes("(")
          ? metrics.revenueSummary
              .split("(")[1]
              .replace(")", "")
              .trim()
          : null,
        arpddValue: metrics.arpdd.currentValue,
        arpddChangePercent: metrics.arpdd.changePercent,
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
              { signal: abortController.signal },
            );
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
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

function buildFollowUps(
  metrics: ReturnType<typeof computeOrderHealthMetrics>,
  hotlist: Array<ReturnType<typeof computeOrderHealthMetrics>["accountSignals"]["hotlist"][number] & { name: string | null }> = [],
) {
  const suggestions: string[] = [];

  if (hotlist.length > 0) {
    const customer = hotlist[0];
    const label = customer.name ?? customer.customerId;
    suggestions.push(`Show cadence history for ${label}.`);
  }

  suggestions.push("What’s the latest ARPDD change versus last month?");
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

import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, Prisma, type PrismaClient } from "@prisma/client";
import { withPortalSession } from "@/lib/auth/portal";
import { computeOrderHealthMetrics } from "@/lib/analytics";
import type { AccountSignal } from "@/lib/analytics";

const CUSTOMER_SCOPED_ROLES = new Set(["portal.viewer", "portal.buyer"]);

function hasTenantWideScope(roles: string[]) {
  return roles.some((role) => !CUSTOMER_SCOPED_ROLES.has(role));
}

const DEFAULT_ORDER_LIMIT = 5;

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || DEFAULT_ORDER_LIMIT, 100) : DEFAULT_ORDER_LIMIT;
  const rangeParam = request.nextUrl.searchParams.get("range");
  const statusesParam = request.nextUrl.searchParams.get("statuses");

  return withPortalSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const baseWhere = buildOrderWhere(tenantId, session.portalUser.customerId, session.portalUserId, roles);
      const orderStatuses = parseStatuses(statusesParam);
      const startDate = parseRange(rangeParam);

      let orderWhere: Prisma.OrderWhereInput = { ...baseWhere };

      if (orderStatuses?.length) {
        orderWhere = {
          ...orderWhere,
          status: { in: orderStatuses },
        };
      }

      if (startDate) {
        orderWhere = {
          ...orderWhere,
          orderedAt: {
            ...(orderWhere.orderedAt as Prisma.DateTimeFilter | undefined),
            gte: startDate,
          },
        };
      }

      const [orders, grouped, totalCount, ingestion, analyticsOrders] = await Promise.all([
        db.order.findMany({
          where: orderWhere,
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            invoices: {
              select: {
                id: true,
                status: true,
                total: true,
              },
            },
          },
          orderBy: {
            orderedAt: "desc",
          },
          take: limit,
        }),
        db.order.groupBy({
          by: ["status"],
          where: orderWhere,
          _sum: {
            total: true,
          },
          _count: {
            _all: true,
          },
        }),
        db.order.count({ where: orderWhere }),
        computeIngestionStatus(db, tenantId, session.portalUser.customerId, session.portalUserId, roles),
        db.order.findMany({
          where: orderWhere,
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
        }),
      ]);

      const summary = grouped.reduce<OrdersSummary>(
        (acc, group) => {
          acc.byStatus[group.status as OrderStatus] = {
            count: group._count._all,
            total: Number(group._sum.total ?? 0),
          };

          if (OPEN_STATUSES.includes(group.status as OrderStatus)) {
            acc.openTotal += Number(group._sum.total ?? 0);
          }

          return acc;
        },
        {
          totalCount,
          openTotal: 0,
          byStatus: {},
        },
      );

      const health = computeOrderHealthMetrics(
        analyticsOrders.map((order) => ({
          orderedAt: order.orderedAt,
          total: order.total,
          currency: order.currency,
          customerId: order.customerId,
          status: order.status,
        })),
      );

      const customerIdsForNames = new Set<string>(
        health.accountSignals.hotlist.map((item) => item.customerId),
      );

      let accountHotlist: AccountHotlistItem[] = [];
      if (customerIdsForNames.size > 0) {
        const customers = await db.customer.findMany({
          where: {
            id: {
              in: Array.from(customerIdsForNames),
            },
          },
          select: {
            id: true,
            name: true,
          },
        });

        const customerNameMap = new Map(customers.map((customer) => [customer.id, customer.name]));
        accountHotlist = health.accountSignals.hotlist.map((item) => ({
          ...item,
          name: customerNameMap.get(item.customerId) ?? null,
        }));
      }

      const enhancedHealth = {
        ...health,
        accountSignals: {
          ...health.accountSignals,
          hotlist: accountHotlist,
        },
      };

      return NextResponse.json({
        summary,
        orders: orders.map(serializeOrder),
        health: enhancedHealth,
        ingestion,
        recommendations: enhancedHealth.suggestions,
      });
    },
    { requiredPermissions: ["portal.orders.read"] },
  );
}

const OPEN_STATUSES: OrderStatus[] = ["SUBMITTED", "PARTIALLY_FULFILLED"];

type OrdersSummary = {
  totalCount: number;
  openTotal: number;
  byStatus: Partial<Record<OrderStatus, { count: number; total: number }>>;
};

type AccountHotlistItem = AccountSignal & { name: string | null };

function buildOrderWhere(tenantId: string, customerId: string | null, portalUserId: string, roles: string[]) {
  const base: Prisma.OrderWhereInput = {
    tenantId,
  };

  if (hasTenantWideScope(roles)) {
    return base satisfies Prisma.OrderWhereInput;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    } satisfies Prisma.OrderWhereInput;
  }

  return {
    ...base,
    portalUserId,
  } satisfies Prisma.OrderWhereInput;
}

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        name: true;
      };
    };
    invoices: {
      select: {
        id: true;
        status: true;
        total: true;
      };
    };
  };
}>;

function serializeOrder(order: OrderWithRelations) {
  const total = order.total ? Number(order.total) : null;
  const invoiceTotals = order.invoices.reduce(
    (acc, invoice) => {
      const value = invoice.total ? Number(invoice.total) : 0;
      acc.byStatus[invoice.status] = (acc.byStatus[invoice.status] ?? 0) + value;
      acc.total += value;
      return acc;
    },
    {
      total: 0,
      byStatus: {} as Record<string, number>,
    },
  );

  return {
    id: order.id,
    status: order.status,
    orderedAt: order.orderedAt,
    fulfilledAt: order.fulfilledAt,
    customer: order.customer
      ? {
          id: order.customer.id,
          name: order.customer.name,
        }
      : null,
    total,
    currency: order.currency,
    invoiceTotals,
  };
}

type IngestionStatus = "fresh" | "stale" | "pending";

function parseStatuses(value: string | null): OrderStatus[] | undefined {
  if (!value) return undefined;
  const entries = value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean) as OrderStatus[];
  const valid = entries.filter((item) => Object.values(OrderStatus).includes(item));
  return valid.length > 0 ? valid : undefined;
}

function parseRange(value: string | null): Date | null {
  if (!value || value === "all") return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (parsed - 1));
  return start;
}

async function computeIngestionStatus(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  roles: string[],
) {
  const now = new Date();

  const [latestOrder, latestInvoice, latestActivity, replay] = await Promise.all([
    db.order.findFirst({
      where: buildOrderWhere(tenantId, customerId, portalUserId, roles),
      select: { orderedAt: true },
      orderBy: { orderedAt: "desc" },
    }),
    db.invoice.findFirst({
      where: buildInvoiceWhere(tenantId, customerId, portalUserId, roles),
      select: { issuedAt: true },
      orderBy: { issuedAt: "desc" },
    }),
    db.activity.findFirst({
      where: buildActivityWhere(tenantId, customerId, portalUserId, roles),
      select: { occurredAt: true },
      orderBy: { occurredAt: "desc" },
    }),
    loadReplaySnapshot(db, tenantId, now),
  ]);

  const feeds = [
    {
      name: "Orders",
      status: deriveIngestionStatus(latestOrder?.orderedAt ?? null, now),
      lastSyncedAt: latestOrder?.orderedAt ?? null,
    },
    {
      name: "Invoices",
      status: deriveIngestionStatus(latestInvoice?.issuedAt ?? null, now),
      lastSyncedAt: latestInvoice?.issuedAt ?? null,
    },
    {
      name: "Activities",
      status: deriveIngestionStatus(latestActivity?.occurredAt ?? null, now),
      lastSyncedAt: latestActivity?.occurredAt ?? null,
    },
  ];

  const aggregateStatus = feeds.reduce<IngestionStatus>((agg, feed) => {
    return statusSeverity(feed.status) > statusSeverity(agg) ? feed.status : agg;
  }, "pending");
  const combinedStatus =
    statusSeverity(replay.status) > statusSeverity(aggregateStatus) ? replay.status : aggregateStatus;

  let message: string;
  if (replay.blocking) {
    message =
      replay.status === "pending"
        ? "Waiting on Supabase replay to finish before analytics can load."
        : "Supabase replay hasn’t succeeded in the last 30 minutes. Run the replay job to refresh analytics.";
  } else if (combinedStatus === "fresh") {
    message = "Ingestion looks healthy. Data reflects recent Supabase syncs.";
  } else if (combinedStatus === "stale") {
    message = "Some feeds look stale. Re-run the Supabase replay when ready.";
  } else {
    message = "Waiting on initial Supabase replay to populate live metrics.";
  }

  return {
    status: combinedStatus,
    message,
    feeds,
    replay: {
      status: replay.status,
      blocking: replay.blocking,
      latest: replay.latest
        ? {
            name: replay.latest.name,
            status: replay.latest.status,
            startedAt: replay.latest.startedAt?.toISOString() ?? null,
            completedAt: replay.latest.completedAt?.toISOString() ?? null,
            recordCount: replay.latest.recordCount,
            errorCount: replay.latest.errorCount,
            durationMs: replay.latest.durationMs,
          }
        : null,
      feeds: replay.feeds.map((feed) => ({
        name: feed.name,
        status: feed.status,
        startedAt: feed.startedAt?.toISOString() ?? null,
        completedAt: feed.completedAt?.toISOString() ?? null,
        recordCount: feed.recordCount,
        errorCount: feed.errorCount,
        durationMs: feed.durationMs,
      })),
    },
  };
}

function buildInvoiceWhere(
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  roles: string[],
) {
  const base: Prisma.InvoiceWhereInput = {
    tenantId,
  };

  if (hasTenantWideScope(roles)) {
    return base;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    };
  }

  return {
    ...base,
    order: {
      portalUserId,
    },
  };
}

function buildActivityWhere(
  tenantId: string,
  customerId: string | null,
  portalUserId: string,
  roles: string[],
) {
  const base: Prisma.ActivityWhereInput = {
    tenantId,
  };

  if (hasTenantWideScope(roles)) {
    return base;
  }

  if (customerId) {
    return {
      ...base,
      customerId,
    };
  }

  return {
    ...base,
    portalUserId,
  };
}

function deriveIngestionStatus(timestamp: Date | null, now: Date): IngestionStatus {
  if (!timestamp) return "pending";
  const diff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60 * 24);
  if (diff <= 2) return "fresh";
  if (diff <= 14) return "stale";
  return "pending";
}

function statusSeverity(status: IngestionStatus) {
  switch (status) {
    case "fresh":
      return 1;
    case "stale":
      return 2;
    default:
      return 3;
  }
}

type ReplaySnapshot = {
  status: IngestionStatus;
  blocking: boolean;
  latest: {
    name: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    recordCount: number | null;
    errorCount: number | null;
    durationMs: number | null;
  } | null;
  feeds: Array<{
    name: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    recordCount: number | null;
    errorCount: number | null;
    durationMs: number | null;
  }>;
};

async function loadReplaySnapshot(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  now: Date,
): Promise<ReplaySnapshot> {
  const records = await db.portalReplayStatus.findMany({
    where: { tenantId },
    orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
  });

  if (records.length === 0) {
    return {
      status: "fresh",
      blocking: false,
      latest: null,
      feeds: [],
    };
  }

  const feeds = records.map((record) => ({
    name: formatFeedName(record.feed),
    status: record.status,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    recordCount: record.recordCount,
    errorCount: record.errorCount,
    durationMs: record.durationMs,
  }));

  const latest = records.reduce<typeof records[number] | null>((acc, record) => {
    if (!acc) return record;
    const accTime = acc.completedAt ?? acc.startedAt ?? new Date(0);
    const recordTime = record.completedAt ?? record.startedAt ?? new Date(0);
    return recordTime > accTime ? record : acc;
  }, null);

  const latestTimestamp = latest?.completedAt ?? latest?.startedAt ?? null;
  const ageMinutes = latestTimestamp
    ? (now.getTime() - latestTimestamp.getTime()) / (1000 * 60)
    : Number.POSITIVE_INFINITY;
  const hasErrors = (latest?.errorCount ?? 0) > 0 || latest?.status === "FAILED";

  let status: IngestionStatus;
  if (!latest || latest.status === "RUNNING") {
    status = "pending";
  } else if (hasErrors || ageMinutes > 30) {
    status = "stale";
  } else {
    status = "fresh";
  }

  return {
    status,
    blocking: status !== "fresh",
    latest: latest
      ? {
          name: formatFeedName(latest.feed),
          status: latest.status,
          startedAt: latest.startedAt,
          completedAt: latest.completedAt,
          recordCount: latest.recordCount,
          errorCount: latest.errorCount,
          durationMs: latest.durationMs,
        }
      : null,
    feeds,
  };
}

function formatFeedName(feed: string) {
  return feed
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

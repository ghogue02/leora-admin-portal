import { performance } from "perf_hooks";
import type {
  HealthPingStatus,
  JobRunStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import { withTenant } from "@/lib/prisma";
import { getJobMetadata } from "@/lib/observability/job-metadata";

export type DevCheckStatus = "ok" | "warn" | "error";

export type DevCheck = {
  id: string;
  label: string;
  status: DevCheckStatus;
  detail?: string;
  durationMs?: number;
};

export type MetricTrend = "up" | "down" | "flat";

export type DevMetric = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  changePercent?: number | null;
  trend: MetricTrend;
  helperText?: string;
};

export type ActivityHighlight = {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  userName?: string | null;
};

export type ExternalLink = {
  label: string;
  href: string;
  description: string;
};

export type JobRunHighlight = {
  id: string;
  jobName: string;
  status: JobRunStatus;
  startedAt: string;
  finishedAt?: string | null;
  durationMs?: number | null;
  errorMessage?: string | null;
};

export type JobRunSummary = {
  jobName: string;
  runs: number;
  successRate: number;
  averageDurationMs: number;
  lastRunStatus?: JobRunStatus;
  lastRunAt?: string;
  owner?: string | null;
  schedule?: string | null;
  overdue?: boolean;
  contact?: string | null;
};

export type HealthPingSummary = {
  id?: string;
  status: HealthPingStatus;
  checkedAt: string;
  responseTimeMs?: number | null;
  statusCode?: number | null;
  detail?: string | null;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
};

export type SyntheticJourney = {
  id: string;
  label: string;
  status: DevCheckStatus;
  detail: string;
};

export type ResourceMetric = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  helperText?: string;
};

export type OperationalSnapshot = {
  tenantId: string;
  generatedAt: string;
  checks: DevCheck[];
  performance: {
    throughput: DevMetric;
    revenue: DevMetric;
    averageOrderValue: DevMetric;
  };
  workloads: {
    approvals: DevMetric;
    backlog: DevMetric;
    openTasks: DevMetric;
  };
  engagement: {
    activeCustomers: DevMetric;
    activities: DevMetric;
    portalLogins: DevMetric;
  };
  incidents: {
    webhookFailures: DevMetric;
    webhookRetries: DevMetric;
    auditHighlights: ActivityHighlight[];
  };
  jobs: {
    successRate: DevMetric;
    averageDuration: DevMetric;
    recentRuns: JobRunHighlight[];
    perJob: JobRunSummary[];
  };
  uptime: {
    availability: DevMetric;
    lastPing?: HealthPingSummary;
    recentPings: HealthPingSummary[];
  };
  journeys: SyntheticJourney[];
  resources: ResourceMetric[];
  release: {
    environment: string;
    commitSha?: string;
    commitRef?: string;
    deploymentId?: string;
    commitMessage?: string;
  };
  links: ExternalLink[];
};

const SNAPSHOT_TTL_MS = 30_000;

const snapshotCache = new Map<string, { expiresAt: number; data: OperationalSnapshot }>();

type SnapshotParams = {
  tenantId: string;
  tenantSlug: string;
};

export async function getOperationalSnapshot(
  params: SnapshotParams,
): Promise<OperationalSnapshot> {
  const cacheKey = `${params.tenantId}:${params.tenantSlug}`;
  const cached = snapshotCache.get(cacheKey);
  const nowMs = Date.now();
  if (cached && cached.expiresAt > nowMs) {
    return cached.data;
  }

  const snapshot = await computeSnapshot(params.tenantId, params.tenantSlug);
  snapshotCache.set(cacheKey, { data: snapshot, expiresAt: nowMs + SNAPSHOT_TTL_MS });
  return snapshot;
}

async function computeSnapshot(tenantId: string, tenantSlug: string): Promise<OperationalSnapshot> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const prevHourStart = new Date(hourAgo.getTime() - 60 * 60 * 1000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const uptimeWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return withTenant(tenantId, async (db) => {
    const checks: DevCheck[] = [];

    const dbCheck = await measureDatabase(db);
    checks.push(dbCheck);

    const ordersLastHour = await db.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: hourAgo,
        },
      },
    });

    const ordersPrevHour = await db.order.count({
      where: {
        tenantId,
        createdAt: {
          gte: prevHourStart,
          lt: hourAgo,
        },
      },
    });

    const lastOrder = await db.order.findFirst({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    const lastOrderAgeHours = lastOrder
      ? (now.getTime() - lastOrder.createdAt.getTime()) / (60 * 60 * 1000)
      : null;

    const orderDetail = lastOrderAgeHours == null
      ? "No orders recorded"
      : lastOrderAgeHours < 1
        ? "Fresh orders in the last hour"
        : `Last order ${lastOrderAgeHours.toFixed(1)}h ago`;

    checks.push({
      id: "order-flow",
      label: "Order Flow",
      status: !lastOrderAgeHours || lastOrderAgeHours < 4
        ? "ok"
        : lastOrderAgeHours < 72
          ? "warn"
          : "error",
      detail: orderDetail,
    });

    const pendingApprovals = await db.order.count({
      where: {
        tenantId,
        requiresApproval: true,
        status: {
          in: ["SUBMITTED", "PENDING", "READY_TO_DELIVER", "DRAFT"],
        },
      },
    });

    checks.push({
      id: "approvals",
      label: "Approvals",
      status: pendingApprovals > 25 ? "warn" : "ok",
      detail: `${pendingApprovals} waiting`,
    });

    const webhookFailures24h = await db.webhookDelivery.count({
      where: {
        status: "FAILED",
        createdAt: {
          gte: dayAgo,
        },
        event: {
          tenantId,
        },
      },
    });

    const webhookRetrying24h = await db.webhookDelivery.count({
      where: {
        status: "RETRYING",
        createdAt: {
          gte: dayAgo,
        },
        event: {
          tenantId,
        },
      },
    });

    checks.push({
      id: "webhooks",
      label: "Webhooks",
      status: webhookFailures24h > 0 ? (webhookFailures24h > 5 ? "error" : "warn") : "ok",
      detail: webhookFailures24h > 0
        ? `${webhookFailures24h} failed / ${webhookRetrying24h} retrying`
        : "All deliveries healthy",
    });

    const ordersDeliveredLastDayResult = await db.order.aggregate({
      where: {
        tenantId,
        deliveredAt: {
          gte: dayAgo,
        },
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        total: true,
      },
      _count: {
        _all: true,
      },
    });

    const ordersDeliveredCount = ordersDeliveredLastDayResult._count?._all ?? 0;
    const revenueLastDay = Number(ordersDeliveredLastDayResult._sum.total ?? 0);
    const avgOrderValue = ordersDeliveredCount === 0 ? 0 : revenueLastDay / ordersDeliveredCount;

    const backlogOrders = await db.order.count({
      where: {
        tenantId,
        status: {
          in: ["SUBMITTED", "PENDING", "READY_TO_DELIVER"],
        },
      },
    });

    const openTasks = await db.task.count({
      where: {
        tenantId,
        status: {
          in: ["PENDING", "IN_PROGRESS"],
        },
      },
    });

    const activities24h = await db.activity.count({
      where: {
        tenantId,
        occurredAt: {
          gte: dayAgo,
        },
      },
    });

    const activeCustomers24h = await db.activity.findMany({
      where: {
        tenantId,
        occurredAt: {
          gte: dayAgo,
        },
        customerId: {
          not: null,
        },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const portalLogins24h = await db.portalSession.count({
      where: {
        tenantId,
        createdAt: {
          gte: dayAgo,
        },
      },
    });

    const auditHighlights = await db.auditLog.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: sixHoursAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    const auditHighlightsFormatted: ActivityHighlight[] = auditHighlights.map((item) => ({
      id: item.id,
      action: item.action,
      entityType: item.entityType,
      createdAt: item.createdAt.toISOString(),
      userName: item.user?.fullName ?? undefined,
    }));

    const throughputMetric: DevMetric = {
      id: "orders-last-hour",
      label: "Orders / hr",
      value: ordersLastHour,
      trend: deriveTrend(ordersLastHour, ordersPrevHour),
      changePercent: derivePercentChange(ordersLastHour, ordersPrevHour),
      helperText: `${(ordersLastHour / 60).toFixed(2)} per minute`,
    };

    const revenueMetric: DevMetric = {
      id: "revenue-last-day",
      label: "Revenue (24h)",
      value: revenueLastDay,
      unit: "USD",
      trend: deriveTrend(revenueLastDay, 0),
      changePercent: null,
      helperText: ordersDeliveredCount ? `${ordersDeliveredCount} orders delivered` : "No deliveries last 24h",
    };

    const avgOrderMetric: DevMetric = {
      id: "avg-order-value",
      label: "Avg Order Value",
      value: avgOrderValue,
      unit: "USD",
      trend: deriveTrend(avgOrderValue, 0),
      changePercent: null,
      helperText: revenueLastDay ? `Based on ${ordersDeliveredCount} deliveries` : undefined,
    };

    const approvalsMetric: DevMetric = {
      id: "approvals-open",
      label: "Approvals Waiting",
      value: pendingApprovals,
      trend: pendingApprovals > 0 ? "up" : "flat",
      changePercent: null,
      helperText: pendingApprovals > 0 ? "Review queues in admin > orders" : "All approvals cleared",
    };

    const backlogMetric: DevMetric = {
      id: "order-backlog",
      label: "Fulfillment Backlog",
      value: backlogOrders,
      trend: backlogOrders > 0 ? "up" : "flat",
      changePercent: null,
      helperText: backlogOrders > 0 ? "Orders waiting to move forward" : "All caught up",
    };

    const tasksMetric: DevMetric = {
      id: "open-tasks",
      label: "Open Tasks",
      value: openTasks,
      trend: openTasks > 0 ? "up" : "flat",
      changePercent: null,
      helperText: openTasks > 50 ? "Consider triaging overdue tasks" : undefined,
    };

    const activeCustomersMetric: DevMetric = {
      id: "active-customers",
      label: "Customers touched (24h)",
      value: activeCustomers24h.length,
      trend: activeCustomers24h.length > 0 ? "up" : "flat",
      changePercent: null,
      helperText: `${activities24h} total activities`,
    };

    const activitiesMetric: DevMetric = {
      id: "activities",
      label: "Activities Logged (24h)",
      value: activities24h,
      trend: activities24h > 0 ? "up" : "flat",
      changePercent: null,
      helperText: activities24h > 0 ? "Sales + portal touchpoints" : "No activities captured",
    };

    const portalMetric: DevMetric = {
      id: "portal-logins",
      label: "Portal logins (24h)",
      value: portalLogins24h,
      trend: portalLogins24h > 0 ? "up" : "flat",
      changePercent: null,
      helperText: portalLogins24h > 0 ? "Unique session records" : "No recent logins",
    };

    const failureMetric: DevMetric = {
      id: "webhook-failures",
      label: "Webhook failures (24h)",
      value: webhookFailures24h,
      trend: webhookFailures24h > 0 ? "up" : "flat",
      changePercent: null,
      helperText: webhookFailures24h > 0 ? "Investigate retries" : "All clear",
    };

    const retryMetric: DevMetric = {
      id: "webhook-retries",
      label: "Webhook retries (24h)",
      value: webhookRetrying24h,
      trend: webhookRetrying24h > 0 ? "up" : "flat",
      changePercent: null,
      helperText: webhookRetrying24h > 0 ? "Monitor for stuck deliveries" : "0 pending",
    };

    const jobMeta = await getJobMetadata();
    const jobMetrics = await buildJobMetrics(db, tenantSlug, dayAgo, jobMeta);
    const healthMetrics = await buildHealthMetrics(db, tenantSlug, uptimeWindowStart);
    const journeys = await runSyntheticJourneys(db, tenantId, tenantSlug);
    const resources = await buildResourceMetrics(db, tenantId);

    checks.push(healthMetrics.check);

    const releaseContext = buildReleaseContext();
    const links = buildExternalLinks();

    journeys.forEach((journey) => {
      checks.push({
        id: journey.id,
        label: journey.label,
        status: journey.status,
        detail: journey.detail,
      });
    });

    return {
      tenantId,
      generatedAt: now.toISOString(),
      checks,
      performance: {
        throughput: throughputMetric,
        revenue: revenueMetric,
        averageOrderValue: avgOrderMetric,
      },
      workloads: {
        approvals: approvalsMetric,
        backlog: backlogMetric,
        openTasks: tasksMetric,
      },
      engagement: {
        activeCustomers: activeCustomersMetric,
        activities: activitiesMetric,
        portalLogins: portalMetric,
      },
      incidents: {
        webhookFailures: failureMetric,
        webhookRetries: retryMetric,
        auditHighlights: auditHighlightsFormatted,
      },
      jobs: jobMetrics.metrics,
      uptime: healthMetrics.summary,
      journeys,
      resources,
      release: releaseContext,
      links,
    };
  });
}

async function buildJobMetrics(
  db: PrismaClient | Prisma.TransactionClient,
  tenantSlug: string,
  dayAgo: Date,
  metadata: Map<string, { owner?: string | null; schedule?: string | null; maxInterval?: number | null }>,
) {
  const jobRuns = await db.jobRunLog.findMany({
    where: {
      tenantSlug,
      startedAt: {
        gte: dayAgo,
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 25,
  });

  const totalRuns = jobRuns.length;
  const successRuns = jobRuns.filter((run) => run.status === "SUCCESS").length;
  const avgDuration =
    totalRuns === 0
      ? 0
      : jobRuns.reduce((acc, run) => acc + (run.durationMs ?? 0), 0) / totalRuns;

  const successRate = totalRuns === 0 ? 100 : (successRuns / totalRuns) * 100;

  const successMetric: DevMetric = {
    id: "job-success",
    label: "Job success (24h)",
    value: Number(successRate.toFixed(1)),
    unit: "%",
    trend: deriveTrend(successRate, 100),
    changePercent: null,
    helperText: totalRuns ? `${successRuns}/${totalRuns} succeeded` : "No runs logged",
  };

  const durationMetric: DevMetric = {
    id: "job-duration",
    label: "Avg duration",
    value: Math.round(avgDuration),
    unit: "ms",
    trend: deriveTrend(avgDuration, avgDuration || 1),
    changePercent: null,
    helperText: totalRuns ? `Across ${totalRuns} runs` : undefined,
  };

  const recentRuns: JobRunHighlight[] = jobRuns.slice(0, 5).map((run) => ({
    id: run.id,
    jobName: run.jobName,
    status: run.status,
    durationMs: run.durationMs ?? null,
    finishedAt: run.finishedAt?.toISOString() ?? null,
    startedAt: run.startedAt.toISOString(),
    errorMessage: run.errorMessage ?? null,
  }));

  const grouped: Record<string, JobRunSummary> = {};
  jobRuns.forEach((run) => {
    if (!grouped[run.jobName]) {
      grouped[run.jobName] = {
        jobName: run.jobName,
        runs: 0,
        successRate: 0,
        averageDurationMs: 0,
      };
    }
    const group = grouped[run.jobName];
    group.runs += 1;
    group.averageDurationMs += run.durationMs ?? 0;
    if (run.status === "SUCCESS") {
      group.successRate += 1;
    }
    if (!group.lastRunAt || run.startedAt.toISOString() > group.lastRunAt) {
      group.lastRunAt = run.startedAt.toISOString();
      group.lastRunStatus = run.status;
    }
  });

  const perJob = Object.values(grouped).map((group) => {
    const meta = metadata.get(group.jobName);
    const avgDuration = group.runs ? Math.round(group.averageDurationMs / group.runs) : 0;
    const success = group.runs ? Number(((group.successRate / group.runs) * 100).toFixed(1)) : 100;
    const lastRunAt = group.lastRunAt;
    let overdue = false;
    if (meta?.maxInterval && lastRunAt) {
      const minutesSince = (Date.now() - new Date(lastRunAt).getTime()) / 60000;
      overdue = minutesSince > meta.maxInterval;
    }
    return {
      ...group,
      averageDurationMs: avgDuration,
      successRate: success,
      owner: meta?.owner ?? undefined,
      schedule: meta?.schedule ?? undefined,
      overdue,
      contact: meta?.contact ?? undefined,
    };
  }).sort((a, b) => (b.lastRunAt ?? "").localeCompare(a.lastRunAt ?? ""));

  return {
    metrics: {
      successRate: successMetric,
      averageDuration: durationMetric,
      recentRuns,
      perJob: perJob.slice(0, 10),
    },
  };
}

async function buildHealthMetrics(
  db: PrismaClient | Prisma.TransactionClient,
  tenantSlug: string,
  windowStart: Date,
) {
  const pings = await db.healthPingLog.findMany({
    where: {
      targetTenant: tenantSlug,
      checkedAt: {
        gte: windowStart,
      },
    },
    orderBy: {
      checkedAt: "desc",
    },
    take: 30,
  });

  const totalPings = pings.length;
  const upPings = pings.filter((ping) => ping.status === "UP").length;
  const availability = totalPings === 0 ? 100 : (upPings / totalPings) * 100;

  const availabilityMetric: DevMetric = {
    id: "uptime-availability",
    label: "Synthetic availability (7d)",
    value: Number(availability.toFixed(1)),
    unit: "%",
    trend: deriveTrend(availability, 100),
    changePercent: null,
    helperText: totalPings ? `${upPings}/${totalPings} pings succeeded` : "Awaiting first ping",
  };

  const lastPing = pings.at(0);
  const check: DevCheck = lastPing
    ? {
        id: "uptime",
        label: "Uptime",
        status: mapHealthStatus(lastPing.status),
        detail: `Last ping ${(Date.now() - lastPing.checkedAt.getTime()) / 60000 < 60
          ? `${((Date.now() - lastPing.checkedAt.getTime()) / 60000).toFixed(1)}m`
          : `${((Date.now() - lastPing.checkedAt.getTime()) / 3600000).toFixed(1)}h`} ago`,
      }
    : {
        id: "uptime",
        label: "Uptime",
        status: "warn",
        detail: "No synthetic pings recorded",
      };

  const summary = {
    availability: availabilityMetric,
    lastPing: lastPing
      ? {
          id: lastPing.id,
          status: lastPing.status,
          checkedAt: lastPing.checkedAt.toISOString(),
          responseTimeMs: lastPing.responseTimeMs ?? undefined,
          statusCode: lastPing.statusCode ?? undefined,
          detail: lastPing.detail ?? undefined,
          acknowledgedAt: lastPing.acknowledgedAt?.toISOString() ?? null,
          acknowledgedBy: lastPing.acknowledgedBy ?? null,
        }
      : undefined,
    recentPings: pings.map((ping) => ({
      id: ping.id,
      status: ping.status,
      checkedAt: ping.checkedAt.toISOString(),
      responseTimeMs: ping.responseTimeMs ?? undefined,
      statusCode: ping.statusCode ?? undefined,
      detail: ping.detail ?? undefined,
      acknowledgedAt: ping.acknowledgedAt?.toISOString() ?? null,
      acknowledgedBy: ping.acknowledgedBy ?? null,
    })),
  } satisfies OperationalSnapshot["uptime"];

  return { summary, check };
}

async function runSyntheticJourneys(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  tenantSlug: string,
): Promise<SyntheticJourney[]> {
  const journeys: SyntheticJourney[] = [];

  const recentOrder = await db.order.findFirst({
    where: {
      tenantId,
      status: {
        not: "CANCELLED",
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      createdAt: true,
      status: true,
    },
  });

  if (recentOrder) {
    const hours = (Date.now() - recentOrder.createdAt.getTime()) / 36e5;
    journeys.push({
      id: "journey-order",
      label: "Order fetch",
      status: hours > 12 ? "warn" : "ok",
      detail: `Last order ${hours.toFixed(1)}h ago (${recentOrder.status})`,
    });
  } else {
    journeys.push({
      id: "journey-order",
      label: "Order fetch",
      status: "warn",
      detail: "No orders found",
    });
  }

  const portalSessions = await db.portalSession.count({
    where: {
      tenantId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  journeys.push({
    id: "journey-portal",
    label: "Portal logins",
    status: portalSessions === 0 ? "warn" : "ok",
    detail: `${portalSessions} sessions in last 24h`,
  });

  const replayRun = await db.jobRunLog.findFirst({
    where: {
      tenantSlug,
      jobName: "supabase-replay",
    },
    orderBy: { startedAt: "desc" },
  });

  if (replayRun) {
    const hours = (Date.now() - replayRun.startedAt.getTime()) / 36e5;
    const status: DevCheckStatus = replayRun.status === "FAILED"
      ? "error"
      : hours > 24
        ? "warn"
        : "ok";
    journeys.push({
      id: "journey-replay",
      label: "Replay worker",
      status,
      detail: replayRun.status === "FAILED"
        ? `Failed ${hours.toFixed(1)}h ago`
        : `Last run ${hours.toFixed(1)}h ago`,
    });
  }

  return journeys;
}

async function buildResourceMetrics(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
): Promise<ResourceMetric[]> {
  const connectionSummaryPromise = db.$queryRawUnsafe<
    { active_connections: number; idle_connections: number; max_connections: number }[]
  >("select active_connections, idle_connections, max_connections from observability.connection_summary").catch(() => [
    { active_connections: 0, idle_connections: 0, max_connections: 0 },
  ]);

  const [orders30d, activities30d, customers, portalUsers, connectionSummary] = await Promise.all([
    db.order.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.activity.count({
      where: {
        tenantId,
        occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    db.customer.count({ where: { tenantId } }),
    db.portalUser.count({ where: { tenantId } }),
    connectionSummaryPromise,
  ]);

  const storageEstimateMb = (orders30d * 4 + activities30d * 0.5) / 1024;
  const connectionStats = connectionSummary[0] ?? { active_connections: 0, idle_connections: 0, max_connections: 0 };

  return [
    {
      id: "orders-30d",
      label: "Orders (30d)",
      value: orders30d,
      helperText: "All statuses",
    },
    {
      id: "activities-30d",
      label: "Activities (30d)",
      value: activities30d,
      helperText: "Touchpoints logged",
    },
    {
      id: "customers-total",
      label: "Customers",
      value: customers,
    },
    {
      id: "portal-users",
      label: "Portal users",
      value: portalUsers,
    },
    {
      id: "storage-est",
      label: "Storage est.",
      value: Number(storageEstimateMb.toFixed(1)),
      unit: "MB",
      helperText: "Approx based on orders + activities",
    },
    {
      id: "connections",
      label: "DB connections",
      value: connectionStats.active_connections,
      helperText: `Max ${connectionStats.max_connections}`,
    },
  ];
}

function mapHealthStatus(status: HealthPingStatus): DevCheckStatus {
  if (status === "UP") {
    return "ok";
  }
  if (status === "DEGRADED") {
    return "warn";
  }
  return "error";
}

function deriveTrend(current: number, previous: number): MetricTrend {
  if (previous === 0) {
    return current === 0 ? "flat" : "up";
  }

  if (current === previous) {
    return "flat";
  }

  return current > previous ? "up" : "down";
}

function derivePercentChange(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }

  const delta = current - previous;
  return (delta / previous) * 100;
}

async function measureDatabase(db: PrismaClient | Prisma.TransactionClient): Promise<DevCheck> {
  const start = performance.now();
  try {
    await db.$queryRaw`select 1`;
    const durationMs = performance.now() - start;
    return {
      id: "database",
      label: "Supabase",
      status: durationMs < 800 ? "ok" : "warn",
      detail: `${durationMs.toFixed(0)}ms latency`,
      durationMs,
    };
  } catch (error) {
    return {
      id: "database",
      label: "Supabase",
      status: "error",
      detail: error instanceof Error ? error.message : "Unknown database error",
    };
  }
}

function buildReleaseContext() {
  const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development";
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA;
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH;
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;
  const commitMessage = process.env.VERCEL_GIT_COMMIT_MESSAGE;

  return {
    environment,
    commitSha,
    commitRef,
    deploymentId,
    commitMessage,
  };
}

function buildExternalLinks(): ExternalLink[] {
  const vercelProject = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "https://vercel.com/dashboard";
  const supabaseProject = process.env.SUPABASE_URL
    ? `${process.env.SUPABASE_URL.replace("https://", "https://app.supabase.com/project/").replace(".supabase.co", "")}`
    : "https://app.supabase.com";

  return [
    {
      label: "Vercel Deployment",
      href: vercelProject,
      description: "Check build logs and serverless analytics",
    },
    {
      label: "Supabase Health",
      href: supabaseProject,
      description: "Database metrics and slow query insights",
    },
    {
      label: "Better Uptime",
      href: "https://betterstack.com/status",
      description: "Synthetic checks for /health and order creation",
    },
  ];
}

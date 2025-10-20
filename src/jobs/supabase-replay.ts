import { ReplayRunStatus } from "@prisma/client";
import { prisma, withTenant } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/supabase";

type SupabaseReplayRow = {
  feed: string | null;
  status: string | null;
  started_at: string | null;
  completed_at: string | null;
  record_count: number | null;
  error_count: number | null;
  duration_ms: number | null;
};

type RunOptions = {
  tenantId?: string;
  tenantSlug?: string;
  disconnectAfterRun?: boolean;
};

export async function run(options: RunOptions = {}) {
  const { tenantId: explicitTenantId, tenantSlug: explicitTenantSlug } = options;
  const disconnectAfterRun = options.disconnectAfterRun ?? true;

  try {
    const adminClient = getSupabaseAdminClient();

    const tenantSelector = explicitTenantId
      ? { id: explicitTenantId }
      : {
          slug: explicitTenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "well-crafted",
        };

    const tenant = await prisma.tenant.findFirst({
      where: tenantSelector,
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      console.warn(
        `[supabase-replay] Tenant lookup failed for selector ${JSON.stringify(tenantSelector)}. Skipping sync.`,
      );
      return;
    }

    let rows: SupabaseReplayRow[] = [];

    if (adminClient) {
      const { data, error } = await adminClient
        .from("ingestion_runs")
        .select("feed,status,started_at,completed_at,record_count,error_count,duration_ms")
        .order("started_at", { ascending: false })
        .limit(100);

      if (error) {
        if (isMissingTableError(error)) {
          console.warn(
            "[supabase-replay] Supabase table ingestion_runs not found; falling back to local analytics snapshots.",
          );
        } else {
          throw new Error(`Failed to fetch Supabase ingestion runs: ${error.message}`);
        }
      } else {
        rows = data ?? [];
      }
    } else {
      console.warn(
        "[supabase-replay] Supabase admin credentials are not configured; falling back to local analytics snapshots.",
      );
    }

    if (rows.length === 0) {
      rows = await loadLocalReplayRows(tenant.id);
    }

    if (rows.length === 0) {
      console.warn(
        `[supabase-replay] No replay metrics available for ${tenant.name ?? tenant.slug ?? tenant.id}. Skipping sync.`,
      );
      return;
    }

    const latestByFeed = buildLatestByFeed(rows);

    if (latestByFeed.size === 0) {
      console.log("[supabase-replay] No ingestion runs returned from Supabase.");
      return;
    }

    await maybeSendAlerts(latestByFeed, rows, {
      tenantLabel: tenant.name ?? tenant.slug ?? tenant.id,
    });

    await withTenant(tenant.id, async (tx) => {
      await Promise.all(
        Array.from(latestByFeed.entries()).map(async ([feed, row]) => {
          const status = mapStatus(row.status);
          const startedAt = row.started_at ? new Date(row.started_at) : null;
          const completedAt = row.completed_at ? new Date(row.completed_at) : null;

          await tx.portalReplayStatus.upsert({
            where: {
              tenantId_feed: {
                tenantId: tenant.id,
                feed,
              },
            },
            update: {
              status,
              startedAt,
              completedAt,
              recordCount: row.record_count ?? undefined,
              errorCount: row.error_count ?? undefined,
              durationMs: row.duration_ms ?? undefined,
            },
            create: {
              tenantId: tenant.id,
              feed,
              status,
              startedAt,
              completedAt,
              recordCount: row.record_count ?? undefined,
              errorCount: row.error_count ?? undefined,
              durationMs: row.duration_ms ?? undefined,
            },
          });
        }),
      );
    });

    console.log(
      `[supabase-replay] Synced ${latestByFeed.size} replay feeds for ${tenant.name ?? tenant.slug ?? tenant.id}.`,
    );
  } finally {
    if (disconnectAfterRun) {
      await prisma.$disconnect().catch(() => {
        // ignore disconnect failures in job runner context
      });
    }
  }
}

function mapStatus(status: string | null): ReplayRunStatus {
  switch (status?.toLowerCase()) {
    case "completed":
    case "success":
      return "COMPLETED";
    case "failed":
    case "error":
      return "FAILED";
    case "running":
    case "in_progress":
    default:
      return "RUNNING";
  }
}

export default run;

function buildLatestByFeed(rows: SupabaseReplayRow[]) {
  const latestByFeed = new Map<string, SupabaseReplayRow>();

  rows.forEach((row) => {
    const feed = row.feed ?? "default";
    const existing = latestByFeed.get(feed);
    if (!existing) {
      latestByFeed.set(feed, row);
      return;
    }

    const existingTimestamp = getRowTimestamp(existing);
    const candidateTimestamp = getRowTimestamp(row);
    if (candidateTimestamp > existingTimestamp) {
      latestByFeed.set(feed, row);
    }
  });

  return latestByFeed;
}

function getRowTimestamp(row: SupabaseReplayRow) {
  const timestamp = row.completed_at ?? row.started_at;
  return timestamp ? new Date(timestamp).getTime() : 0;
}

async function loadLocalReplayRows(tenantId: string): Promise<SupabaseReplayRow[]> {
  return withTenant(tenantId, async (tx) => {
    const [orders, invoices, activities] = await Promise.all([
      tx.order.aggregate({
        where: { tenantId },
        _max: { updatedAt: true },
        _count: { _all: true },
      }),
      tx.invoice.aggregate({
        where: { tenantId },
        _max: { updatedAt: true },
        _count: { _all: true },
      }),
      tx.activity.aggregate({
        where: { tenantId },
        _max: { updatedAt: true },
        _count: { _all: true },
      }),
    ]);

    return [
      buildLocalRow("orders", orders),
      buildLocalRow("invoices", invoices),
      buildLocalRow("activities", activities),
    ];
  });
}

function buildLocalRow(
  feed: string,
  aggregate: {
    _max: { updatedAt: Date | null };
    _count: { _all: number };
  },
): SupabaseReplayRow {
  const latest = aggregate._max.updatedAt;
  const now = new Date();
  const startedAt = latest ?? now;

  return {
    feed,
    status: "completed",
    started_at: startedAt.toISOString(),
    completed_at: now.toISOString(),
    record_count: aggregate._count._all,
    error_count: 0,
    duration_ms: 180_000,
  };
}

function isMissingTableError(error: { code?: string; message?: string }) {
  if (!error) {
    return false;
  }

  if (error.code === "PGRST108") {
    return true;
  }

  return Boolean(error.message && /ingestion_runs/i.test(error.message));
}

async function maybeSendAlerts(
  latestByFeed: Map<string, SupabaseReplayRow>,
  rows: SupabaseReplayRow[],
  context: { tenantLabel: string },
) {
  const webhook = process.env.REPLAY_ALERT_WEBHOOK;
  if (!webhook) {
    return;
  }

  const now = Date.now();
  const thresholdMinutes = Number(process.env.REPLAY_ALERT_THRESHOLD_MINUTES ?? "120");
  const thresholdMs = thresholdMinutes * 60_000;

  const failures = rows.filter((row) => {
    const status = row.status?.toLowerCase();
    return status === "failed" || (row.error_count ?? 0) > 0;
  });

  const latestSuccess = rows.find((row) => row.status?.toLowerCase() === "completed");
  const latestSuccessTimestamp = latestSuccess
    ? new Date(latestSuccess.completed_at ?? latestSuccess.started_at ?? "").getTime()
    : NaN;
  const successAgeMs = Number.isFinite(latestSuccessTimestamp) ? now - latestSuccessTimestamp : Infinity;

  const shouldAlert = failures.length > 0 || successAgeMs > thresholdMs;
  if (!shouldAlert) {
    return;
  }

  const feedSummaries = Array.from(latestByFeed.entries()).map(([feed, row]) => {
    const status = row.status ?? "unknown";
    const completedAt = row.completed_at ?? row.started_at ?? "n/a";
    const errors = row.error_count ?? 0;
    return `• ${feed}: ${status}${errors ? ` (${errors} errors)` : ""} · last run ${completedAt ?? "n/a"}`;
  });

  const summaryLines = [];
  if (failures.length > 0) {
    summaryLines.push(`Detected ${failures.length} failed replay run${failures.length > 1 ? "s" : ""}.`);
  }
  if (successAgeMs > thresholdMs) {
    summaryLines.push(
      `No successful replay in the past ${thresholdMinutes} minutes (last success: ${
        isFinite(successAgeMs) ? new Date(latestSuccessTimestamp).toISOString() : "never"
      }).`,
    );
  }

  const message = [
    `:warning: Supabase replay attention needed for ${context.tenantLabel}`,
    ...summaryLines,
    "",
    ...feedSummaries,
  ].join("\n");

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      console.warn(
        `[supabase-replay] Alert webhook responded with ${response.status} ${response.statusText}`,
      );
    }
  } catch (error) {
    console.warn("[supabase-replay] Failed to send alert webhook:", error);
  }
}

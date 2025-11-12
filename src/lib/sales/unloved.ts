import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { differenceInCalendarDays, subMonths } from "date-fns";

const IN_PERSON_ACTIVITY_CODES = ["visit", "tasting", "event"] as const;
export const MONTHS_FOR_UNLOVED_AVG = 6;
const MAX_UNLOVED_ACCOUNTS = 10;

export const UNLOVED_BUCKETS = [
  { key: "HIGH", label: "Priority 1 (High)", thresholdDays: 7 },
  { key: "MEDIUM", label: "Priority 2 (Medium)", thresholdDays: 14 },
  { key: "LOW", label: "Priority 3 (Low)", thresholdDays: 30 },
  { key: "NONE", label: "Unassigned", thresholdDays: 30 },
] as const;

export type UnlovedBucketKey = (typeof UNLOVED_BUCKETS)[number]["key"];

type UnlovedRow = {
  id: string;
  name: string;
  account_priority: "HIGH" | "MEDIUM" | "LOW" | null;
  last_order: Date | null;
  last_activity: Date | null;
  revenue_6m: Prisma.Decimal | number | null;
};

export type UnlovedCustomerState = {
  id: string;
  name: string;
  priority: UnlovedBucketKey;
  thresholdDays: number;
  avgMonthlyRevenue: number;
  lastLovedAt: Date | null;
  daysSinceLove: number | null;
  isUnloved: boolean;
};

type ComputeStatesArgs = {
  db: PrismaClient;
  tenantId: string;
  now: Date;
  salesRepIds?: string[];
};

const BUCKET_MAP = new Map(UNLOVED_BUCKETS.map((bucket) => [bucket.key, bucket]));

function evaluateRow(row: UnlovedRow, now: Date): UnlovedCustomerState {
  const priority = (row.account_priority ?? "NONE") as UnlovedBucketKey;
  const bucket = BUCKET_MAP.get(priority) ?? BUCKET_MAP.get("NONE")!;
  const revenueSixMonths = Number(row.revenue_6m ?? 0);
  const avgMonthlyRevenue = revenueSixMonths / MONTHS_FOR_UNLOVED_AVG;
  const lastOrder = row.last_order ? new Date(row.last_order) : null;
  const lastActivity = row.last_activity ? new Date(row.last_activity) : null;
  const lastLovedAt =
    lastOrder && lastActivity
      ? new Date(Math.max(lastOrder.getTime(), lastActivity.getTime()))
      : lastOrder || lastActivity || null;
  const daysSinceLove = lastLovedAt ? differenceInCalendarDays(now, lastLovedAt) : null;
  const isUnloved = !lastLovedAt || (daysSinceLove ?? Number.MAX_SAFE_INTEGER) > bucket.thresholdDays;

  return {
    id: row.id,
    name: row.name,
    priority,
    thresholdDays: bucket.thresholdDays,
    avgMonthlyRevenue,
    lastLovedAt,
    daysSinceLove,
    isUnloved,
  };
}

async function fetchUnlovedRows({
  db,
  tenantId,
  now,
  salesRepIds,
}: ComputeStatesArgs) {
  const sixMonthsAgo = subMonths(now, MONTHS_FOR_UNLOVED_AVG);
  const inPersonArray = Prisma.sql`ARRAY[${Prisma.join(
    IN_PERSON_ACTIVITY_CODES.map((code) => Prisma.sql`${code}`)
  )}]::text[]`;
  const salesRepFilter =
    salesRepIds && salesRepIds.length > 0
      ? Prisma.sql`AND c."salesRepId" IN (${Prisma.join(
          salesRepIds.map((id) => Prisma.sql`${id}::uuid`)
        )})`
      : Prisma.sql``;

  const rows = await db.$queryRaw<UnlovedRow[]>(Prisma.sql`
    WITH recent_revenue AS (
      SELECT o."customerId" AS customer_id,
             COALESCE(SUM(o.total), 0) AS total
      FROM "Order" o
      WHERE o."tenantId" = ${tenantId}
        AND o."status" != 'CANCELLED'
        AND o."orderedAt" >= ${sixMonthsAgo}
      GROUP BY o."customerId"
    )
    SELECT
      c.id,
      c.name,
      c."accountPriority" AS account_priority,
      MAX(ord."orderedAt") AS last_order,
      MAX(CASE WHEN at.code IS NOT NULL THEN act."occurredAt" END) AS last_activity,
      COALESCE(rr.total, 0) AS revenue_6m
    FROM "Customer" c
    LEFT JOIN "Order" ord
      ON ord."customerId" = c.id
     AND ord."tenantId" = c."tenantId"
     AND ord."status" != 'CANCELLED'
    LEFT JOIN "Activity" act
      ON act."customerId" = c.id
     AND act."tenantId" = c."tenantId"
    LEFT JOIN "ActivityType" at
      ON at.id = act."activityTypeId"
     AND at.code = ANY(${inPersonArray})
    LEFT JOIN recent_revenue rr
      ON rr.customer_id = c.id
    WHERE c."tenantId" = ${tenantId}
      AND c."isPermanentlyClosed" = false
      ${salesRepFilter}
    GROUP BY c.id, c.name, c."accountPriority", rr.total
  `);

  return rows;
}

export async function computeUnlovedStates(args: ComputeStatesArgs) {
  const rows = await fetchUnlovedRows(args);
  return rows.map((row) => evaluateRow(row, args.now));
}

export async function buildUnlovedSummary({
  db,
  tenantId,
  salesRepId,
  now,
}: {
  db: PrismaClient;
  tenantId: string;
  salesRepId: string;
  now: Date;
}) {
  const states = await computeUnlovedStates({ db, tenantId, now, salesRepIds: [salesRepId] });

  const bucketMap = new Map(
    UNLOVED_BUCKETS.map((bucket) => [bucket.key, { ...bucket, count: 0, potentialMonthlyRevenue: 0, accounts: [] as Array<{
      id: string;
      name: string;
      avgMonthlyRevenue: number;
      lastLovedAt: string | null;
      daysSinceLove: number | null;
    }> }])
  );

  for (const state of states) {
    if (!state.isUnloved) continue;
    const bucket = bucketMap.get(state.priority)!;
    bucket.count += 1;
    bucket.potentialMonthlyRevenue += state.avgMonthlyRevenue;
    bucket.accounts.push({
      id: state.id,
      name: state.name,
      avgMonthlyRevenue: state.avgMonthlyRevenue,
      lastLovedAt: state.lastLovedAt ? state.lastLovedAt.toISOString() : null,
      daysSinceLove: state.daysSinceLove,
    });
  }

  const buckets = UNLOVED_BUCKETS.map((config) => {
    const bucket = bucketMap.get(config.key)!;
    bucket.accounts.sort(
      (a, b) =>
        b.avgMonthlyRevenue - a.avgMonthlyRevenue ||
        (b.daysSinceLove ?? -1) - (a.daysSinceLove ?? -1)
    );
    bucket.accounts = bucket.accounts.slice(0, MAX_UNLOVED_ACCOUNTS);
    bucket.potentialMonthlyRevenue = Number(bucket.potentialMonthlyRevenue.toFixed(2));
    return bucket;
  });

  return {
    buckets,
    updatedAt: now.toISOString(),
  };
}

export async function getUnlovedStateMap(args: ComputeStatesArgs) {
  const states = await computeUnlovedStates(args);
  return new Map(states.map((state) => [state.id, state]));
}

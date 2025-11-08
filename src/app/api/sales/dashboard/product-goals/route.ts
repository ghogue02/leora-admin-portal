import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withSalesSession } from "@/lib/auth/sales";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
} from "date-fns";

const METRIC_TYPES = ["revenue", "cases", "pod"] as const;
type MetricType = (typeof METRIC_TYPES)[number];

const PERIOD_TYPES = ["week", "month", "quarter", "year"] as const;
type PeriodType = (typeof PERIOD_TYPES)[number];

const PERIOD_SCOPES = ["current", "previous"] as const;
type PeriodScope = (typeof PERIOD_SCOPES)[number];

const isMetricType = (value: string): value is MetricType =>
  METRIC_TYPES.includes(value as MetricType);

const isPeriodType = (value: string): value is PeriodType =>
  PERIOD_TYPES.includes(value as PeriodType);

type GoalStatsRow = {
  total: Prisma.Decimal | number | null;
  cases: Prisma.Decimal | number | null;
  distribution: Prisma.Decimal | number | null;
};

const goalStatsTotals = (row?: GoalStatsRow) => ({
  revenue: toNumber(row?.total),
  cases: toNumber(row?.cases),
  pod: toNumber(row?.distribution),
});

const createGoalSchema = z.object({
  productCategory: z.union([z.string(), z.null()]).optional(),
  skuId: z.union([z.string().uuid(), z.null()]).optional(),
  targetRevenue: z.union([z.number(), z.string(), z.null()]).optional(),
  targetCases: z.union([z.number(), z.string(), z.null()]).optional(),
  targetPod: z.union([z.number(), z.string(), z.null()]).optional(),
  metricType: z.enum(METRIC_TYPES).optional(),
  periodType: z.enum(PERIOD_TYPES).optional(),
  periodScope: z.enum(PERIOD_SCOPES).optional(),
});

const normalizeNumericInput = (value?: string | number | null) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeOptionalString = (value?: string | null) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toNumber = (value: Prisma.Decimal | number | bigint | null | undefined) =>
  Number(value ?? 0);

const hasPositiveValue = (value: Prisma.Decimal | number | bigint | null | undefined) =>
  toNumber(value) > 0;

const percentOfTarget = (current: number, target: number) =>
  target > 0 ? (current / target) * 100 : 0;

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      const goals = await db.repProductGoal.findMany({
        where: {
          tenantId: salesRep.tenantId,
          salesRepId: salesRep.id,
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
      });

      type GoalRecord = (typeof goals)[number];

      const deriveMetricType = (goal: GoalRecord): MetricType => {
        const rawType = goal.metricType?.toLowerCase();
        if (rawType && isMetricType(rawType)) {
          return rawType;
        }
        if (hasPositiveValue(goal.targetRevenue)) return "revenue";
        if (hasPositiveValue(goal.targetCases)) return "cases";
        if (hasPositiveValue(goal.targetPod)) return "pod";
        return "revenue";
      };

      const derivePeriodType = (goal: GoalRecord): PeriodType => {
        const raw = goal.periodType?.toLowerCase();
        if (raw && isPeriodType(raw)) {
          return raw;
        }

        const durationMs = goal.periodEnd.getTime() - goal.periodStart.getTime();
        const days = Math.round(durationMs / (24 * 60 * 60 * 1000));
        if (days <= 7) return "week";
        if (days <= 31) return "month";
        if (days <= 92) return "quarter";
        return "year";
      };

      const goalsWithProgress = await Promise.all(
        goals.map(async (goal) => {
          let currentRevenue = 0;
          let currentCases = 0;
          let currentPod = 0;

          if (goal.skuId) {
            const stats = await db.$queryRaw<GoalStatsRow[]>`
              SELECT
                COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL AS total,
                COALESCE(SUM(ol.quantity), 0)::INT AS cases,
                COALESCE(COUNT(DISTINCT o."customerId"), 0)::INT AS distribution
              FROM "OrderLine" ol
              INNER JOIN "Order" o ON ol."orderId" = o.id
              INNER JOIN "Customer" c ON o."customerId" = c.id
              WHERE ol."tenantId" = ${salesRep.tenantId}
                AND ol."skuId" = ${goal.skuId}
                AND o.status = 'FULFILLED'
                AND o."deliveredAt" >= ${goal.periodStart}
                AND o."deliveredAt" <= ${goal.periodEnd}
                AND c."salesRepId" = ${salesRep.id}
            `;
            const totals = goalStatsTotals(stats[0]);
            currentRevenue = totals.revenue;
            currentCases = totals.cases;
            currentPod = totals.pod;
          } else if (goal.productCategory) {
            const stats = await db.$queryRaw<GoalStatsRow[]>`
              SELECT
                COALESCE(SUM(ol.quantity * ol."unitPrice"), 0)::DECIMAL AS total,
                COALESCE(SUM(ol.quantity), 0)::INT AS cases,
                COALESCE(COUNT(DISTINCT o."customerId"), 0)::INT AS distribution
              FROM "OrderLine" ol
              INNER JOIN "Order" o ON ol."orderId" = o.id
              INNER JOIN "Customer" c ON o."customerId" = c.id
              INNER JOIN "Sku" s ON ol."skuId" = s.id
              INNER JOIN "Product" p ON s."productId" = p.id
              WHERE ol."tenantId" = ${salesRep.tenantId}
                AND p.category = ${goal.productCategory}
                AND o.status = 'FULFILLED'
                AND o."deliveredAt" >= ${goal.periodStart}
                AND o."deliveredAt" <= ${goal.periodEnd}
                AND c."salesRepId" = ${salesRep.id}
            `;
            const totals = goalStatsTotals(stats[0]);
            currentRevenue = totals.revenue;
            currentCases = totals.cases;
            currentPod = totals.pod;
          }

          const metricType = deriveMetricType(goal);
          const periodType = derivePeriodType(goal);

          const targetRevenueValue = hasPositiveValue(goal.targetRevenue)
            ? toNumber(goal.targetRevenue)
            : null;
          const targetCasesValue = hasPositiveValue(goal.targetCases)
            ? toNumber(goal.targetCases)
            : null;
          const targetPodValue = hasPositiveValue(goal.targetPod)
            ? toNumber(goal.targetPod)
            : null;

          let progressPercent = 0;
          if (metricType === "revenue" && targetRevenueValue) {
            progressPercent = percentOfTarget(currentRevenue, targetRevenueValue);
          } else if (metricType === "cases" && targetCasesValue) {
            progressPercent = percentOfTarget(currentCases, targetCasesValue);
          } else if (metricType === "pod" && targetPodValue) {
            progressPercent = percentOfTarget(currentPod, targetPodValue);
          }

          return {
            id: goal.id,
            skuId: goal.skuId,
            productCategory: goal.productCategory,
            targetRevenue: targetRevenueValue,
            targetCases: targetCasesValue,
            targetPod: targetPodValue,
            metricType,
            periodType,
            periodStart: goal.periodStart.toISOString(),
            periodEnd: goal.periodEnd.toISOString(),
            productName: goal.sku?.product?.name ?? null,
            skuCode: goal.sku?.code ?? null,
            currentRevenue,
            currentCases,
            currentPod,
            progressPercent: Math.round(progressPercent),
          };
        })
      );

      return NextResponse.json({
        goals: goalsWithProgress,
      });
    } catch (error) {
      console.error("Product goals error:", error);
      return NextResponse.json(
        { error: "Failed to load product goals" },
        { status: 500 }
      );
    }
  });
}

function calculatePeriodDates(periodType: PeriodType, scope: PeriodScope = "current") {
  const now = new Date();
  let reference = now;

  if (scope === "previous") {
    switch (periodType) {
      case "week":
        reference = subWeeks(now, 1);
        break;
      case "quarter":
        reference = subQuarters(now, 1);
        break;
      case "year":
        reference = subYears(now, 1);
        break;
      case "month":
      default:
        reference = subMonths(now, 1);
        break;
    }
  }

  switch (periodType) {
    case "week": {
      const start = startOfWeek(reference, { weekStartsOn: 1 });
      const end = endOfWeek(reference, { weekStartsOn: 1 });
      return { periodStart: start, periodEnd: end };
    }
    case "quarter": {
      return {
        periodStart: startOfQuarter(reference),
        periodEnd: endOfQuarter(reference),
      };
    }
    case "year": {
      return {
        periodStart: startOfYear(reference),
        periodEnd: endOfYear(reference),
      };
    }
    case "month":
    default: {
      return {
        periodStart: startOfMonth(reference),
        periodEnd: endOfMonth(reference),
      };
    }
  }
}

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }
      const parsedBody = createGoalSchema.parse(await request.json());
      const productCategory = normalizeOptionalString(parsedBody.productCategory);
      const skuId = parsedBody.skuId ?? null;
      const targetRevenueValue = normalizeNumericInput(parsedBody.targetRevenue);
      const targetCasesValue = normalizeNumericInput(parsedBody.targetCases);
      const targetPodValue = normalizeNumericInput(parsedBody.targetPod);
      const metricType = parsedBody.metricType ?? "revenue";
      const periodType = parsedBody.periodType ?? "month";
      const periodScope = parsedBody.periodScope ?? "current";

      const { periodStart, periodEnd } = calculatePeriodDates(periodType, periodScope);

      const createData: Prisma.RepProductGoalUncheckedCreateInput = {
        tenantId: salesRep.tenantId,
        salesRepId: salesRep.id,
        productCategory,
        skuId,
        periodStart,
        periodEnd,
        metricType,
        periodType,
        targetRevenue: null,
        targetCases: null,
        targetPod: null,
      };

      if (metricType === "revenue") {
        if (targetRevenueValue === undefined || targetRevenueValue <= 0) {
          return NextResponse.json(
            { error: "Target revenue is required for revenue goals" },
            { status: 400 }
          );
        }
        createData.targetRevenue = targetRevenueValue;
      } else if (metricType === "cases") {
        if (targetCasesValue === undefined || targetCasesValue <= 0) {
          return NextResponse.json(
            { error: "Target cases are required for case-based goals" },
            { status: 400 }
          );
        }
        createData.targetCases = targetCasesValue;
      } else if (metricType === "pod") {
        if (targetPodValue === undefined || targetPodValue <= 0) {
          return NextResponse.json(
            { error: "Target Points of Distribution are required for POD goals" },
            { status: 400 }
          );
        }
        createData.targetPod = targetPodValue;
      }

      const goal = await db.repProductGoal.create({
        data: createData,
      });

      return NextResponse.json(goal);
    } catch (error) {
      console.error("Create product goal error:", error);
      return NextResponse.json(
        { error: "Failed to create product goal" },
        { status: 500 }
      );
    }
  });
}

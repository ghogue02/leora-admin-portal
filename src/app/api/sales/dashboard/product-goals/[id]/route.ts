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

const updateGoalSchema = z.object({
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

function calculatePeriodDates(
  periodType: PeriodType,
  scope: PeriodScope = "current"
) {
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
          { error: 'Sales rep profile not found' },
          { status: 404 }
        );
      }

      const parsedBody = updateGoalSchema.parse(await request.json());
      const productCategory = normalizeOptionalString(parsedBody.productCategory);
      const skuId = parsedBody.skuId ?? null;
      const targetRevenueValue = normalizeNumericInput(parsedBody.targetRevenue);
      const targetCasesValue = normalizeNumericInput(parsedBody.targetCases);
      const targetPodValue = normalizeNumericInput(parsedBody.targetPod);
      const metricType: MetricType = parsedBody.metricType ?? "revenue";

      const updateData: Prisma.RepProductGoalUncheckedUpdateInput = {
        productCategory,
        skuId,
        metricType,
      };

      const periodTypeValue = parsedBody.periodType;
      if (periodTypeValue) {
        const periodScopeValue = parsedBody.periodScope ?? "current";
        const { periodStart, periodEnd } = calculatePeriodDates(
          periodTypeValue,
          periodScopeValue
        );
        updateData.periodType = periodTypeValue;
        updateData.periodStart = periodStart;
        updateData.periodEnd = periodEnd;
      }

      updateData.targetRevenue = null;
      updateData.targetCases = null;
      updateData.targetPod = null;

      if (metricType === "revenue") {
        updateData.targetRevenue =
          targetRevenueValue && targetRevenueValue > 0 ? targetRevenueValue : null;
      } else if (metricType === "cases") {
        updateData.targetCases =
          targetCasesValue && targetCasesValue > 0 ? targetCasesValue : null;
      } else if (metricType === "pod") {
        updateData.targetPod =
          targetPodValue && targetPodValue > 0 ? targetPodValue : null;
      }

      const goal = await db.repProductGoal.update({
        where: {
          id: params.id,
          tenantId: salesRep.tenantId,
          salesRepId: salesRep.id,
        },
        data: updateData,
      });

      return NextResponse.json(goal);
    } catch (error) {
      console.error('Update product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to update product goal' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
          { error: 'Sales rep profile not found' },
          { status: 404 }
        );
      }

      await db.repProductGoal.delete({
        where: {
          id: params.id,
          tenantId: salesRep.tenantId,
          salesRepId: salesRep.id,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Delete product goal error:', error);
      return NextResponse.json(
        { error: 'Failed to delete product goal' },
        { status: 500 }
      );
    }
  });
}

import { NextRequest, NextResponse } from "next/server";
import { endOfDay, isValid, parseISO, startOfDay, subDays } from "date-fns";
import { withSalesSession } from "@/lib/auth/sales";

type RouteContext = {
  params: Promise<{
    supplierId: string;
  }>;
};

const DEFAULT_RANGE_DAYS = 90;

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    const { supplierId } = await context.params;
    const { searchParams } = request.nextUrl;
    const endParam = searchParams.get("endDate");
    const startParam = searchParams.get("startDate");

    const now = new Date();
    const defaultEnd = endOfDay(now);
    const rawEnd = parseDateParam(endParam, defaultEnd);
    const endDate = endOfDay(rawEnd);
    const defaultStart = startOfDay(subDays(endDate, DEFAULT_RANGE_DAYS));
    const rawStart = parseDateParam(startParam, defaultStart);
    const startDate = startOfDay(rawStart);

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Invalid date range: startDate must be before endDate" },
        { status: 400 },
      );
    }

    const supplier = await db.supplier.findFirst({
      where: {
        id: supplierId,
        tenantId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const samples = await db.sampleUsage.findMany({
      where: {
        tenantId,
        tastedAt: {
          gte: startDate,
          lte: endDate,
        },
        sku: {
          product: {
            supplierId,
          },
        },
      },
      select: {
        id: true,
        tastedAt: true,
        quantity: true,
        feedback: true,
        needsFollowUp: true,
        followedUpAt: true,
        resultedInOrder: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        salesRep: {
          select: {
            user: {
              select: {
                fullName: true,
              },
            },
          },
        },
        sku: {
          select: {
            code: true,
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
      },
      orderBy: {
        tastedAt: "desc",
      },
    });

    return NextResponse.json({
      supplier,
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      samples: samples.map((sample) => ({
        id: sample.id,
        tastedAt: sample.tastedAt.toISOString(),
        quantity: sample.quantity ?? 1,
        feedback: sample.feedback,
        needsFollowUp: sample.needsFollowUp,
        followedUpAt: sample.followedUpAt ? sample.followedUpAt.toISOString() : null,
        resultedInOrder: sample.resultedInOrder,
        customer: sample.customer
          ? { id: sample.customer.id, name: sample.customer.name }
          : null,
        salesRepName: sample.salesRep?.user?.fullName ?? "Unknown Rep",
        sku: {
          name: sample.sku.product?.name ?? "Sample",
          code: sample.sku.code ?? null,
          brand: sample.sku.product?.brand ?? null,
        },
      })),
    });
  });
}

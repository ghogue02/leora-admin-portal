import { NextRequest, NextResponse } from "next/server";
import { addDays, endOfDay, isValid, parseISO, startOfDay, subDays } from "date-fns";
import { withSalesSession } from "@/lib/auth/sales";

type SupplierSummary = {
  supplierId: string;
  supplierName: string;
  totalSamples: number;
  sampleEvents: number;
  conversions: number;
  conversionRate: number;
  revenueGenerated: number;
  averageDaysToOrder: number | null;
  topProducts: Array<{
    skuId: string;
    productName: string;
    skuCode: string | null;
    samples: number;
    conversions: number;
  }>;
};

type ProductAggregate = {
  skuId: string;
  productName: string;
  skuCode: string | null;
  samples: number;
  conversions: number;
};

type SupplierAggregate = {
  supplierId: string;
  supplierName: string;
  sampleEvents: number;
  totalSamples: number;
  conversions: number;
  revenueGenerated: number;
  daysToOrderSum: number;
  daysToOrderCount: number;
  products: Map<string, ProductAggregate>;
};

const DEFAULT_RANGE_DAYS = 90;

function parseDateParam(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
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

    const samples = await db.sampleUsage.findMany({
      where: {
        tenantId,
        tastedAt: {
          gte: startDate,
          lte: endDate,
        },
        sku: {
          product: {
            supplierId: {
              not: null,
            },
          },
        },
      },
      select: {
        id: true,
        customerId: true,
        salesRepId: true,
        tastedAt: true,
        skuId: true,
        quantity: true,
        resultedInOrder: true,
        sku: {
          select: {
            id: true,
            code: true,
            product: {
              select: {
                name: true,
                brand: true,
                supplierId: true,
                supplier: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (samples.length === 0) {
      return NextResponse.json({
        suppliers: [] as SupplierSummary[],
        range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      });
    }

    const customerIds = Array.from(new Set(samples.map((sample) => sample.customerId)));
    const skuIds = Array.from(new Set(samples.map((sample) => sample.skuId)));

    const orders = await db.order.findMany({
      where: {
        tenantId,
        customerId: {
          in: customerIds,
        },
        orderedAt: {
          gte: startDate,
          lte: addDays(endDate, 30),
        },
        lines: {
          some: {
            skuId: {
              in: skuIds,
            },
          },
        },
      },
      select: {
        id: true,
        customerId: true,
        orderedAt: true,
        lines: {
          select: {
            skuId: true,
            quantity: true,
            unitPrice: true,
          },
        },
      },
    });

    const ordersByCustomer = new Map<string, typeof orders[number][]>();
    for (const order of orders) {
      const bucket = ordersByCustomer.get(order.customerId) ?? [];
      bucket.push(order);
      ordersByCustomer.set(order.customerId, bucket);
    }

    const supplierAggregates = new Map<string, SupplierAggregate>();

    for (const sample of samples) {
      const supplierRecord = sample.sku.product?.supplier;
      if (!supplierRecord) {
        continue;
      }

      const supplierId = supplierRecord.id;
      const supplierName = supplierRecord.name ?? "Unknown Supplier";

      const aggregate =
        supplierAggregates.get(supplierId) ??
        {
          supplierId,
          supplierName,
          sampleEvents: 0,
          totalSamples: 0,
          conversions: 0,
          revenueGenerated: 0,
          daysToOrderSum: 0,
          daysToOrderCount: 0,
          products: new Map<string, ProductAggregate>(),
        };

      const sampleQuantity = sample.quantity ?? 1;
      aggregate.sampleEvents += 1;
      aggregate.totalSamples += sampleQuantity;

      const windowEnd = addDays(sample.tastedAt, 30);
      const relatedOrders = ordersByCustomer.get(sample.customerId) ?? [];

      let sampleRevenue = 0;
      let sampleConverted = sample.resultedInOrder;
      let bestDaysToOrder: number | null = null;

      for (const order of relatedOrders) {
        if (!order.orderedAt) continue;
        if (order.orderedAt < sample.tastedAt || order.orderedAt > windowEnd) {
          continue;
        }

        const orderRevenue = order.lines
          .filter((line) => line.skuId === sample.skuId)
          .reduce((sum, line) => sum + Number(line.unitPrice) * line.quantity, 0);

        if (orderRevenue > 0) {
          sampleRevenue += orderRevenue;
          sampleConverted = true;
          const diffMs = order.orderedAt.getTime() - sample.tastedAt.getTime();
          const days = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
          if (bestDaysToOrder === null || days < bestDaysToOrder) {
            bestDaysToOrder = days;
          }
        }
      }

      aggregate.revenueGenerated += sampleRevenue;
      if (sampleConverted) {
        aggregate.conversions += 1;
        if (bestDaysToOrder !== null) {
          aggregate.daysToOrderSum += bestDaysToOrder;
          aggregate.daysToOrderCount += 1;
        }
      }

      const productKey = sample.skuId;
      const existingProduct =
        aggregate.products.get(productKey) ??
        {
          skuId: sample.skuId,
          productName: sample.sku.product?.name ?? "Unknown Product",
          skuCode: sample.sku.code ?? null,
          samples: 0,
          conversions: 0,
        };

      existingProduct.samples += sampleQuantity;
      if (sampleConverted) {
        existingProduct.conversions += 1;
      }
      aggregate.products.set(productKey, existingProduct);

      supplierAggregates.set(supplierId, aggregate);
    }

    const suppliers: SupplierSummary[] = Array.from(supplierAggregates.values()).map(
      (aggregate) => ({
        supplierId: aggregate.supplierId,
        supplierName: aggregate.supplierName,
        totalSamples: aggregate.totalSamples,
        sampleEvents: aggregate.sampleEvents,
        conversions: aggregate.conversions,
        conversionRate:
          aggregate.sampleEvents > 0 ? aggregate.conversions / aggregate.sampleEvents : 0,
        revenueGenerated: aggregate.revenueGenerated,
        averageDaysToOrder:
          aggregate.daysToOrderCount > 0
            ? aggregate.daysToOrderSum / aggregate.daysToOrderCount
            : null,
        topProducts: Array.from(aggregate.products.values())
          .sort((a, b) => b.samples - a.samples)
          .slice(0, 3),
      }),
    );

    suppliers.sort((a, b) => b.totalSamples - a.totalSamples);

    return NextResponse.json({
      suppliers,
      range: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { endOfDay, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

const dateSchema = z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).optional();
const usageFilterSchema = z.enum(["all", "standard", "promotion", "sample"]).optional();
const deliveryMethodSchema = z.enum(["Delivery", "Pick up", "Will Call", "all"]).optional();

type SalesRepRow = {
  id: string;
  name: string;
  email: string | null;
  territory: string | null;
  totalRevenue: number;
  orderCount: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  revenueShare: number;
  topCustomers: Array<{ id: string; name: string; revenue: number; orders: number }>;
};

type SalesRepPerformanceResponse = {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    avgRevenuePerRep: number;
    activeReps: number;
    topRep: SalesRepRow | null;
    startDate: string;
    endDate: string;
  };
  reps: SalesRepRow[];
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startDateParam = dateSchema.parse(searchParams.get("startDate") ?? undefined);
  const endDateParam = dateSchema.parse(searchParams.get("endDate") ?? undefined);
  const usageFilter = usageFilterSchema.parse(searchParams.get("usageFilter") ?? undefined);
  const deliveryMethod = deliveryMethodSchema.parse(
    searchParams.get("deliveryMethod") ?? undefined,
  );

  return withSalesSession(request, async ({ db, tenantId }) => {
    const today = endOfDay(new Date());
    const fallbackStart = startOfDay(subDays(today, 29));

    const startDate = startDateParam ? startOfDay(new Date(startDateParam)) : fallbackStart;
    const endDate = endDateParam ? endOfDay(new Date(endDateParam)) : today;

    const where: Prisma.OrderWhereInput = {
      tenantId,
      status: {
        not: "CANCELLED",
      },
      deliveredAt: {
        gte: startDate,
        lte: endDate,
      },
      customer: {
        salesRepId: {
          not: null,
        },
      },
    };

    if (deliveryMethod && deliveryMethod !== "all") {
      where.deliveryTimeWindow = deliveryMethod;
    }

    const orders = await db.order.findMany({
      where,
      select: {
        id: true,
        total: true,
        deliveredAt: true,
        customerId: true,
        customer: {
          select: {
            id: true,
            name: true,
            salesRepId: true,
            salesRep: {
              select: {
                id: true,
                territoryName: true,
                user: {
                  select: {
                    fullName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        lines: {
          select: {
            usageType: true,
          },
        },
      },
    });

    const filteredOrders = orders.filter((order) => {
      if (!usageFilter || usageFilter === "all") return true;
      const usageValues =
        order.lines?.map((line) => line.usageType?.toString().toLowerCase()).filter(Boolean) ?? [];

      if (usageFilter === "standard") {
        return usageValues.length === 0;
      }

      return usageValues.includes(usageFilter.toLowerCase());
    });

    const repMap = new Map<
      string,
      {
        repId: string;
        name: string;
        email: string | null;
        territory: string | null;
        revenue: number;
        orderCount: number;
        customers: Set<string>;
        customerBreakdown: Map<string, { id: string; name: string; revenue: number; orders: number }>;
      }
    >();

    for (const order of filteredOrders) {
      const rep = order.customer?.salesRep;
      if (!rep) continue;
      const revenue = Number(order.total ?? 0);
      const repId = rep.id;
      if (!repMap.has(repId)) {
        repMap.set(repId, {
          repId,
          name: rep.user?.fullName ?? "Unnamed rep",
          email: rep.user?.email ?? null,
          territory: rep.territoryName ?? null,
          revenue: 0,
          orderCount: 0,
          customers: new Set<string>(),
          customerBreakdown: new Map(),
        });
      }

      const bucket = repMap.get(repId)!;
      bucket.revenue += revenue;
      bucket.orderCount += 1;
      const customerId = order.customerId ?? order.customer?.id ?? `order-${order.id}`;
      bucket.customers.add(customerId);

      if (order.customer) {
        const current = bucket.customerBreakdown.get(order.customer.id) ?? {
          id: order.customer.id,
          name: order.customer.name ?? "Unknown customer",
          revenue: 0,
          orders: 0,
        };
        current.revenue += revenue;
        current.orders += 1;
        bucket.customerBreakdown.set(order.customer.id, current);
      }
    }

    const totalRevenue = Array.from(repMap.values()).reduce((sum, rep) => sum + rep.revenue, 0);
    const totalOrders = Array.from(repMap.values()).reduce((sum, rep) => sum + rep.orderCount, 0);

    const reps: SalesRepRow[] = Array.from(repMap.values())
      .map((rep) => {
        const topCustomers = Array.from(rep.customerBreakdown.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 3);
        return {
          id: rep.repId,
          name: rep.name,
          email: rep.email,
          territory: rep.territory,
          totalRevenue: rep.revenue,
          orderCount: rep.orderCount,
          uniqueCustomers: rep.customers.size,
          avgOrderValue: rep.orderCount > 0 ? rep.revenue / rep.orderCount : 0,
          revenueShare: totalRevenue > 0 ? rep.revenue / totalRevenue : 0,
          topCustomers,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    const response: SalesRepPerformanceResponse = {
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        avgRevenuePerRep: reps.length > 0 ? totalRevenue / reps.length : 0,
        activeReps: reps.length,
        topRep: reps[0] ?? null,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      reps,
    };

    return NextResponse.json(response);
  });
}

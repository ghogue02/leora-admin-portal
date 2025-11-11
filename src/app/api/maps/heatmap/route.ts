import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    try {
      const { filters } = (await request.json()) as {
        filters?: {
          territories?: string[];
          accountTypes?: string[];
          salesReps?: string[];
          dateRange?: { start?: string; end?: string };
        };
      };

      const where: Prisma.CustomerWhereInput = {
        tenantId,
        latitude: { not: null },
        longitude: { not: null },
      };

      if (filters?.territories?.length) {
        where.territory = { in: filters.territories };
      }

      if (filters?.accountTypes?.length) {
        where.accountType = { in: filters.accountTypes };
      }

      if (filters?.salesReps?.length) {
        where.salesRepId = { in: filters.salesReps };
      }

      const orderWhere: Prisma.OrderWhereInput = { status: { not: "CANCELLED" } };
      if (filters?.dateRange?.start && filters?.dateRange?.end) {
        orderWhere.createdAt = {
          gte: new Date(filters.dateRange.start),
          lte: new Date(filters.dateRange.end),
        };
      }

      const customers = await db.customer.findMany({
        where,
        select: {
          id: true,
          latitude: true,
          longitude: true,
          orders: {
            where: orderWhere,
            select: {
              totalAmount: true,
              createdAt: true,
            },
          },
        },
      });

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const heatPoints = customers.map((customer) => {
        const orders = customer.orders;
        const revenue = orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
        const orderCount = orders.length;

        const recentRevenue = orders
          .filter((order) => order.createdAt >= thirtyDaysAgo)
          .reduce((sum, order) => sum + Number(order.totalAmount), 0);

        const previousRevenue = orders
          .filter(
            (order) => order.createdAt >= sixtyDaysAgo && order.createdAt < thirtyDaysAgo,
          )
          .reduce((sum, order) => sum + Number(order.totalAmount), 0);

        const growth =
          previousRevenue > 0 ? (recentRevenue - previousRevenue) / previousRevenue : 0;
        const conversionRate = orderCount > 0 ? Math.min(orderCount / 100, 1) : 0;

        return {
          type: "Feature" as const,
          properties: {
            revenue,
            orderCount,
            growth,
            conversionRate,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [customer.longitude!, customer.latitude!],
          },
        };
      });

      return NextResponse.json({
        type: "FeatureCollection" as const,
        features: heatPoints,
      });
    } catch (error) {
      console.error("[maps/heatmap] Failed to generate heat map:", error);
      return NextResponse.json(
        { error: "Failed to generate heat map" },
        { status: 500 },
      );
    }
  });
}

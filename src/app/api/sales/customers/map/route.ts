import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfYear } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId }) => {
    // Get all customers with location data
    const customers = await db.customer.findMany({
      where: {
        tenantId,
        isPermanentlyClosed: false,
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        riskStatus: true,
        city: true,
        state: true,
      },
    });

    // Get YTD revenue for each customer
    const now = new Date();
    const yearStart = startOfYear(now);

    const customerIds = customers.map((c) => c.id);
    const ytdRevenue = await db.order.groupBy({
      by: ["customerId"],
      where: {
        tenantId,
        customerId: { in: customerIds },
        deliveredAt: {
          gte: yearStart,
          lte: now,
        },
        status: {
          not: "CANCELLED",
        },
      },
      _sum: {
        total: true,
      },
    });

    const revenueMap = new Map(
      ytdRevenue.map((r) => [r.customerId, Number(r._sum.total ?? 0)])
    );

    // Combine customer data with revenue
    const customersWithRevenue = customers
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        id: c.id,
        name: c.name,
        latitude: Number(c.latitude),
        longitude: Number(c.longitude),
        riskStatus: c.riskStatus,
        ytdRevenue: revenueMap.get(c.id) ?? 0,
        city: c.city || "",
        state: c.state || "",
      }));

    return NextResponse.json({
      customers: customersWithRevenue,
      summary: {
        totalCustomers: customersWithRevenue.length,
        totalYtdRevenue: Array.from(revenueMap.values()).reduce((a, b) => a + b, 0),
      },
    });
  });
}

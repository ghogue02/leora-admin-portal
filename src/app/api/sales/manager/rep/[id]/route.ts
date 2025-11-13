import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  differenceInDays,
} from "date-fns";
import { hasSalesManagerPrivileges } from "@/lib/sales/role-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withSalesSession(
    request,
    async ({ db, tenantId, roles }) => {
      if (!hasSalesManagerPrivileges(roles)) {
        return NextResponse.json({ error: "Manager role required." }, { status: 403 });
      }
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const yearStart = startOfYear(now);

    // Get rep details
    const rep = await db.salesRep.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!rep) {
      return NextResponse.json({ error: "Rep not found" }, { status: 404 });
    }

    // Get all customers for this rep
    const customers = await db.customer.findMany({
      where: {
        salesRepId: id,
        isPermanentlyClosed: false,
      },
      include: {
        orders: {
          where: {
            status: {
              not: "CANCELLED",
            },
          },
          select: {
            deliveredAt: true,
            total: true,
          },
        },
      },
    });

    const customersData = customers.map((customer) => {
      const totalRevenue = customer.orders.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      const orderDates = customer.orders
        .map((o) => o.deliveredAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());

      return {
        id: customer.id,
        name: customer.name,
        riskStatus: customer.riskStatus,
        lastOrderDate: orderDates[0] || null,
        totalRevenue,
        orderCount: customer.orders.length,
      };
    });

    // Get recent orders (last 30 days)
    const recentOrders = await db.order.findMany({
      where: {
        tenantId,
        customer: {
          salesRepId: id,
        },
        deliveredAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        deliveredAt: "desc",
      },
      take: 50,
    });

    const ordersData = recentOrders.map((order) => ({
      id: order.id,
      customerName: order.customer.name,
      deliveredAt: order.deliveredAt?.toISOString() || "",
      total: Number(order.total),
      status: order.status,
    }));

    // Get recent activities
    const activities = await db.activity.findMany({
      where: {
        userId: rep.userId,
        occurredAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        customer: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: 50,
    });

    const activitiesData = activities.map((activity) => ({
      id: activity.id,
      type: activity.activityType,
      customerName: activity.customer?.name || "Unknown",
      occurredAt: activity.occurredAt.toISOString(),
      notes: activity.notes || "",
    }));

    // Calculate revenue stats
    const thisWeekOrders = await db.order.aggregate({
      where: {
        tenantId,
        customer: { salesRepId: id },
        deliveredAt: { gte: weekStart, lte: weekEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: true,
    });

    const thisMonthOrders = await db.order.aggregate({
      where: {
        tenantId,
        customer: { salesRepId: id },
        deliveredAt: { gte: monthStart, lte: monthEnd },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
    });

    const thisYearOrders = await db.order.aggregate({
      where: {
        tenantId,
        customer: { salesRepId: id },
        deliveredAt: { gte: yearStart, lte: now },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
    });

    const allTimeOrders = await db.order.aggregate({
      where: {
        tenantId,
        customer: { salesRepId: id },
        status: { not: "CANCELLED" },
      },
      _sum: { total: true },
      _count: true,
    });

    // Top customers
    const topCustomers = customersData
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        revenue: c.totalRevenue,
      }));

    // At-risk customers
    const atRiskCustomers = customersData
      .filter(
        (c) =>
          c.riskStatus === "AT_RISK_CADENCE" ||
          c.riskStatus === "AT_RISK_REVENUE" ||
          c.riskStatus === "DORMANT"
      )
      .map((c) => ({
        id: c.id,
        name: c.name,
        riskStatus: c.riskStatus,
        daysSinceOrder: c.lastOrderDate
          ? differenceInDays(now, new Date(c.lastOrderDate))
          : 999,
      }))
      .sort((a, b) => b.daysSinceOrder - a.daysSinceOrder);

    const avgOrderValue =
      allTimeOrders._count > 0
        ? Number(allTimeOrders._sum.total || 0) / allTimeOrders._count
        : 0;

    return NextResponse.json({
      rep: {
        id: rep.id,
        name: rep.user.fullName,
        email: rep.user.email,
        territoryName: rep.territoryName,
      },
      customers: customersData,
      orders: ordersData,
      activities: activitiesData,
      topCustomers,
      atRiskCustomers,
      stats: {
        thisWeek: Number(thisWeekOrders._sum.total || 0),
        thisMonth: Number(thisMonthOrders._sum.total || 0),
        thisYear: Number(thisYearOrders._sum.total || 0),
        allTime: Number(allTimeOrders._sum.total || 0),
        avgOrderValue,
      },
    });
  },
  { requireSalesRep: false });
}

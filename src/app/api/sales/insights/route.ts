import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, subMonths } from "date-fns";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const sixMonthsAgo = subMonths(now, 6);
      const thirtyDaysAgo = subMonths(now, 1);

      // Get sales rep profile for filtering
      const salesRep = await db.salesRep.findUnique({
        where: {
          tenantId_userId: {
            tenantId,
            userId: session.user.id,
          },
        },
      });

      const salesRepFilter = salesRep ? { salesRepId: salesRep.id } : {};

      // Run all queries in parallel for performance
      const [
        topCustomers,
        orderStatuses,
        customerRisk,
        topProducts,
        recentActivity,
        sampleStats,
        invoiceStats,
        cartStats,
        monthlyTrend,
      ] = await Promise.all([
        // 1. Top 10 Customers by Revenue
        db.order.groupBy({
          by: ['customerId'],
          where: {
            tenantId,
            customer: salesRepFilter,
            status: { not: 'CANCELLED' },
          },
          _sum: { total: true },
          _count: { id: true },
          orderBy: { _sum: { total: 'desc' } },
          take: 10,
        }),

        // 2. Order Status Distribution
        db.order.groupBy({
          by: ['status'],
          where: {
            tenantId,
            customer: salesRepFilter,
          },
          _count: { id: true },
        }),

        // 3. Customer Risk Breakdown
        db.customer.groupBy({
          by: ['riskStatus'],
          where: {
            tenantId,
            ...salesRepFilter,
            isPermanentlyClosed: false,
          },
          _count: { id: true },
        }),

        // 4. Top Products
        db.orderLine.groupBy({
          by: ['skuId'],
          where: {
            tenantId,
            order: {
              customer: salesRepFilter,
              status: { not: 'CANCELLED' },
            },
          },
          _sum: { quantity: true },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        }),

        // 5. Recent Activity (Last 30 Days)
        db.activity.groupBy({
          by: ['activityTypeId'],
          where: {
            tenantId,
            occurredAt: { gte: thirtyDaysAgo },
            ...(salesRep ? { userId: session.user.id } : {}),
          },
          _count: { id: true },
        }),

        // 6. Sample Usage Stats
        Promise.all([
          db.sampleUsage.aggregate({
            where: {
              tenantId,
              ...(salesRep ? { salesRepId: salesRep.id } : {}),
            },
            _count: { id: true },
            _sum: { quantity: true },
          }),
          db.sampleUsage.count({
            where: {
              tenantId,
              ...(salesRep ? { salesRepId: salesRep.id } : {}),
              resultedInOrder: true,
            },
          }),
        ]),

        // 7. Invoice Stats
        db.invoice.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { id: true },
          _sum: { total: true },
        }),

        // 8. Cart Stats
        db.cart.groupBy({
          by: ['status'],
          where: { tenantId },
          _count: { id: true },
        }),

        // 9. Monthly Order Trend (Last 6 Months)
        db.$queryRaw<
          Array<{ month: string; order_count: bigint; total_revenue: number }>
        >`
          SELECT
            TO_CHAR(DATE_TRUNC('month', "orderedAt"), 'YYYY-MM') as month,
            COUNT(*) as order_count,
            COALESCE(SUM(total), 0) as total_revenue
          FROM "Order"
          WHERE "orderedAt" >= ${sixMonthsAgo}
            AND "tenantId" = ${tenantId}::uuid
            ${salesRep ? db.$queryRawUnsafe(`AND "customerId" IN (SELECT id FROM "Customer" WHERE "salesRepId" = '${salesRep.id}')`) : db.$queryRawUnsafe('')}
          GROUP BY DATE_TRUNC('month', "orderedAt")
          ORDER BY month DESC
        `,
      ]);

      // Enrich top customers with names
      const customerIds = topCustomers.map((c) => c.customerId);
      const customers = await db.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, state: true },
      });
      const customerMap = new Map(customers.map((c) => [c.id, c]));

      // Enrich products with names
      const skuIds = topProducts.map((p) => p.skuId);
      const skus = await db.sku.findMany({
        where: { id: { in: skuIds } },
        include: { product: { select: { name: true, brand: true } } },
      });
      const skuMap = new Map(skus.map((s) => [s.id, s]));

      // Enrich activity types
      const activityTypeIds = recentActivity.map((a) => a.activityTypeId);
      const activityTypes = await db.activityType.findMany({
        where: { id: { in: activityTypeIds } },
        select: { id: true, name: true },
      });
      const activityTypeMap = new Map(activityTypes.map((a) => [a.id, a]));

      // Calculate sample conversion
      const [sampleAgg, samplesConverted] = sampleStats;
      const conversionRate =
        sampleAgg._count.id > 0
          ? ((samplesConverted / sampleAgg._count.id) * 100).toFixed(1)
          : '0.0';

      // Calculate total revenue
      const totalRevenue = topCustomers.reduce(
        (sum, c) => sum + Number(c._sum.total ?? 0),
        0
      );

      // Build insights object
      const insights = {
        summary: {
          totalRevenue: totalRevenue.toFixed(2),
          totalOrders: orderStatuses.reduce((sum, s) => sum + s._count.id, 0),
          topCustomerRevenue: Number(topCustomers[0]?._sum.total ?? 0).toFixed(2),
          topCustomerName: customerMap.get(topCustomers[0]?.customerId)?.name ?? 'Unknown',
        },
        topCustomers: topCustomers.map((c) => ({
          customerId: c.customerId,
          name: customerMap.get(c.customerId)?.name ?? 'Unknown',
          state: customerMap.get(c.customerId)?.state ?? null,
          revenue: Number(c._sum.total ?? 0).toFixed(2),
          orderCount: c._count.id,
        })),
        orderStatuses: orderStatuses.map((s) => ({
          status: s.status,
          count: s._count.id,
        })),
        customerRisk: customerRisk.map((r) => ({
          status: r.riskStatus,
          count: r._count.id,
        })),
        topProducts: topProducts.map((p) => {
          const sku = skuMap.get(p.skuId);
          return {
            skuId: p.skuId,
            name: sku?.product.name ?? 'Unknown',
            brand: sku?.product.brand ?? null,
            units: p._sum.quantity ?? 0,
            orderCount: p._count.id,
          };
        }),
        recentActivity: recentActivity.map((a) => ({
          type: activityTypeMap.get(a.activityTypeId)?.name ?? 'Unknown',
          count: a._count.id,
        })),
        samples: {
          totalGiven: sampleAgg._sum.quantity ?? 0,
          events: sampleAgg._count.id,
          converted: samplesConverted,
          conversionRate,
        },
        invoices: invoiceStats.map((i) => ({
          status: i.status,
          count: i._count.id,
          total: Number(i._sum.total ?? 0).toFixed(2),
        })),
        carts: cartStats.map((c) => ({
          status: c.status,
          count: c._count.id,
        })),
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m.month,
          orders: Number(m.order_count),
          revenue: Number(m.total_revenue).toFixed(2),
        })),
      };

      return NextResponse.json(insights);
    }
  );
}

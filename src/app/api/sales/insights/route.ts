import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, subMonths } from "date-fns";
import { Prisma } from "@prisma/client";

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

      // Get customer IDs for this sales rep (if applicable)
      const salesRepCustomerIds = salesRep
        ? (await db.customer.findMany({
            where: { tenantId, salesRepId: salesRep.id },
            select: { id: true },
          })).map(c => c.id)
        : undefined;

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
            ...(salesRepCustomerIds ? { customerId: { in: salesRepCustomerIds } } : {}),
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
            ...(salesRepCustomerIds ? { customerId: { in: salesRepCustomerIds } } : {}),
          },
          _count: { id: true },
        }),

        // 3. Customer Risk Breakdown
        db.customer.groupBy({
          by: ['riskStatus'],
          where: {
            tenantId,
            ...(salesRep ? { salesRepId: salesRep.id } : {}),
            isPermanentlyClosed: false,
          },
          _count: { id: true },
        }),

        // 4. Top Products
        db.orderLine.groupBy({
          by: ['skuId'],
          where: {
            tenantId,
            ...(salesRepCustomerIds ? { order: { customerId: { in: salesRepCustomerIds }, status: { not: 'CANCELLED' } } } : { order: { status: { not: 'CANCELLED' } } }),
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
            ${salesRep && salesRepCustomerIds ? Prisma.sql`AND "customerId" IN (${Prisma.join(salesRepCustomerIds.map(id => Prisma.sql`${id}::uuid`))})` : Prisma.empty}
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
          ? Math.round((samplesConverted / sampleAgg._count.id) * 100)
          : 0;

      // Calculate total revenue
      const totalRevenue = topCustomers.reduce(
        (sum, c) => sum + Number(c._sum.total ?? 0),
        0
      );

      // Build insights object
      const insights = {
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalOrders: orderStatuses.reduce((sum, s) => sum + s._count.id, 0),
          topCustomerRevenue: Math.round(Number(topCustomers[0]?._sum.total ?? 0)),
          topCustomerName: customerMap.get(topCustomers[0]?.customerId)?.name ?? 'Unknown',
        },
        topCustomers: topCustomers.map((c) => ({
          customerId: c.customerId,
          name: customerMap.get(c.customerId)?.name ?? 'Unknown',
          state: customerMap.get(c.customerId)?.state ?? null,
          revenue: Math.round(Number(c._sum.total ?? 0)),
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
            units: Math.round(p._sum.quantity ?? 0),
            orderCount: p._count.id,
          };
        }),
        recentActivity: recentActivity.map((a) => ({
          type: activityTypeMap.get(a.activityTypeId)?.name ?? 'Unknown',
          count: a._count.id,
        })),
        samples: {
          totalGiven: Math.round(sampleAgg._sum.quantity ?? 0),
          events: sampleAgg._count.id,
          converted: Math.round(samplesConverted),
          conversionRate,
        },
        invoices: invoiceStats.map((i) => ({
          status: i.status,
          count: i._count.id,
          total: Math.round(Number(i._sum.total ?? 0)),
        })),
        carts: cartStats.map((c) => ({
          status: c.status,
          count: c._count.id,
        })),
        monthlyTrend: monthlyTrend.map((m) => ({
          month: m.month,
          orders: Number(m.order_count),
          revenue: Math.round(Number(m.total_revenue)),
        })),
      };

      return NextResponse.json(insights);
    }
  );
}

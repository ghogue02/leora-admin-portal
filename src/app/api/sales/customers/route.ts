import { NextRequest, NextResponse } from "next/server";
import { Prisma, CustomerRiskStatus } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

type SortField = "name" | "lastOrderDate" | "nextExpectedOrderDate" | "revenue";
type SortDirection = "asc" | "desc";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile for the logged-in user
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

      // Extract query parameters
      const searchParams = request.nextUrl.searchParams;
      const search = searchParams.get("search") || "";
      const riskFilter = searchParams.get("risk") as CustomerRiskStatus | null;
      const sortField = (searchParams.get("sortField") as SortField) || "name";
      const sortDirection = (searchParams.get("sortDirection") as SortDirection) || "asc";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 100);

      // Build where clause
      const where: Prisma.CustomerWhereInput = {
        tenantId,
        salesRepId: salesRep.id,
        isPermanentlyClosed: false,
      };

      // Apply search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { accountNumber: { contains: search, mode: "insensitive" } },
          { billingEmail: { contains: search, mode: "insensitive" } },
        ];
      }

      // Apply risk status filter
      if (riskFilter) {
        where.riskStatus = riskFilter;
      }

      // Build order by clause
      let orderBy: Prisma.CustomerOrderByWithRelationInput = {};
      switch (sortField) {
        case "name":
          orderBy = { name: sortDirection };
          break;
        case "lastOrderDate":
          orderBy = { lastOrderDate: sortDirection };
          break;
        case "nextExpectedOrderDate":
          orderBy = { nextExpectedOrderDate: sortDirection };
          break;
        case "revenue":
          orderBy = { establishedRevenue: sortDirection };
          break;
        default:
          orderBy = { name: "asc" };
      }

      // Execute queries in parallel
      const [customers, totalCount, riskCounts, allCustomers] = await Promise.all([
        // Get customers with pagination
        db.customer.findMany({
          where,
          select: {
            id: true,
            name: true,
            accountNumber: true,
            billingEmail: true,
            riskStatus: true,
            lastOrderDate: true,
            nextExpectedOrderDate: true,
            averageOrderIntervalDays: true,
            establishedRevenue: true,
            dormancySince: true,
            city: true,
            state: true,
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),

        // Get total count for pagination
        db.customer.count({ where }),

        // Get risk status counts (for filter badges)
        db.customer.groupBy({
          by: ["riskStatus"],
          where: {
            tenantId,
            salesRepId: salesRep.id,
            isPermanentlyClosed: false,
          },
          _count: {
            _all: true,
          },
        }),

        // Get all customer IDs for revenue calculation
        db.customer.findMany({
          where: {
            tenantId,
            salesRepId: salesRep.id,
            isPermanentlyClosed: false,
          },
          select: {
            id: true,
          },
        }),
      ]);

      // Calculate revenue per customer for each customer
      const customerIds = customers.map((c) => c.id);
      const allCustomerIds = allCustomers.map((c) => c.id);

      // Get recent orders (last 90 days) to calculate actual revenue
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      const [recentOrders, totalRevenueData] = await Promise.all([
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: customerIds },
            deliveredAt: {
              gte: ninetyDaysAgo,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
          _count: {
            _all: true,
          },
        }),
        // Calculate total revenue across all customers (not just paginated ones)
        db.order.aggregate({
          where: {
            tenantId,
            customerId: { in: allCustomerIds },
            deliveredAt: {
              gte: ninetyDaysAgo,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),
      ]);

      // Create revenue map
      const revenueMap = new Map(
        recentOrders.map((order) => [
          order.customerId,
          {
            revenue: Number(order._sum.total ?? 0),
            orderCount: order._count._all,
          },
        ])
      );

      // Aggregate risk counts
      const riskStatusCounts = riskCounts.reduce(
        (acc, group) => {
          acc[group.riskStatus] = group._count._all;
          return acc;
        },
        {
          HEALTHY: 0,
          AT_RISK_CADENCE: 0,
          AT_RISK_REVENUE: 0,
          DORMANT: 0,
          CLOSED: 0,
        } as Record<string, number>
      );

      // Calculate customers due to order
      const customersDueCount = customers.filter((c) => {
        if (!c.nextExpectedOrderDate) return false;
        const daysUntilExpected = Math.floor(
          (c.nextExpectedOrderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntilExpected <= 7 && daysUntilExpected >= -3;
      }).length;

      // Serialize customers with calculated metrics
      const serializedCustomers = customers.map((customer) => {
        const recentData = revenueMap.get(customer.id);
        const daysOverdue = customer.nextExpectedOrderDate
          ? Math.max(
              0,
              Math.floor((now.getTime() - customer.nextExpectedOrderDate.getTime()) / (1000 * 60 * 60 * 24))
            )
          : 0;

        return {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          billingEmail: customer.billingEmail,
          riskStatus: customer.riskStatus,
          lastOrderDate: customer.lastOrderDate?.toISOString() ?? null,
          nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() ?? null,
          averageOrderIntervalDays: customer.averageOrderIntervalDays,
          establishedRevenue: customer.establishedRevenue ? Number(customer.establishedRevenue) : null,
          dormancySince: customer.dormancySince?.toISOString() ?? null,
          location: customer.city && customer.state ? `${customer.city}, ${customer.state}` : null,
          recentRevenue: recentData?.revenue ?? 0,
          recentOrderCount: recentData?.orderCount ?? 0,
          daysOverdue,
          isDueToOrder: customer.nextExpectedOrderDate
            ? Math.floor((customer.nextExpectedOrderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 7
            : false,
        };
      });

      return NextResponse.json({
        customers: serializedCustomers,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
          totalCustomers: allCustomers.length,
          totalRevenue: Number(totalRevenueData._sum.total ?? 0),
          customersDue: customersDueCount,
          riskCounts: riskStatusCounts,
        },
      });
    }
  );
}

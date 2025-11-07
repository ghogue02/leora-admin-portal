import { NextRequest, NextResponse } from "next/server";
import { Prisma, CustomerRiskStatus } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";
import {
  CUSTOMER_TAG_TYPES,
  CustomerTagType,
} from "@/constants/customerTags";
import {
  startOfYear,
  startOfMonth,
  startOfDay,
  addDays,
  subDays,
  differenceInCalendarDays,
} from "date-fns";

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
      const showAll = searchParams.get("showAll") === "true";
      const dueOnly = searchParams.get("due") === "true";
      const selectedTagsParam = searchParams.get("tags");
      const selectedTags: CustomerTagType[] = selectedTagsParam
        ? selectedTagsParam
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag): tag is CustomerTagType =>
              CUSTOMER_TAG_TYPES.includes(tag as CustomerTagType)
            )
        : [];

      // Shared visibility scope (ignores UI filters)
      const baseWhere: Prisma.CustomerWhereInput = {
        tenantId,
        // Only filter by salesRepId if not showing all customers
        ...(showAll ? {} : { salesRepId: salesRep.id }),
        isPermanentlyClosed: false,
      };

      // Build where clause
      const where: Prisma.CustomerWhereInput = {
        ...baseWhere,
      };

      // Apply search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { accountNumber: { contains: search, mode: "insensitive" } },
          { billingEmail: { contains: search, mode: "insensitive" } },
        ];
      }

      const now = new Date();
      const today = startOfDay(now);
      const ninetyDaysAgo = startOfDay(subDays(today, 90));
      const dueWindowEnd = addDays(today, 7);

      // Apply risk status filter
      if (riskFilter) {
        where.riskStatus = riskFilter;
      }

      if (dueOnly) {
        where.nextExpectedOrderDate = {
          not: null,
          lte: dueWindowEnd,
        };
        where.riskStatus = {
          notIn: [CustomerRiskStatus.DORMANT, CustomerRiskStatus.CLOSED],
        };
      }

      if (selectedTags.length > 0) {
        const tagFilters = selectedTags.map((tag) => ({
          tags: {
            some: {
              tagType: tag,
              removedAt: null,
            },
          },
        }));

        where.AND = [...(where.AND ?? []), ...tagFilters];
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
      const [
        customers,
        totalCount,
        riskCounts,
        allCustomers,
        customersDueCount,
        tagCountsRaw,
      ] = await Promise.all([
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
            territory: true,
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
            ...baseWhere,
          },
          _count: {
            _all: true,
          },
        }),

        // Get all customer IDs for revenue calculation
        db.customer.findMany({
          where: baseWhere,
          select: {
            id: true,
          },
        }),
        db.customer.count({
          where: {
            ...baseWhere,
            nextExpectedOrderDate: {
              lte: dueWindowEnd,
            },
            riskStatus: {
              notIn: [CustomerRiskStatus.DORMANT, CustomerRiskStatus.CLOSED],
            },
          },
        }),
        db.customerTag.groupBy({
          by: ["tagType"],
          where: {
            tenantId,
            removedAt: null,
            tagType: {
              in: CUSTOMER_TAG_TYPES,
            },
            customer: {
              is: {
                tenantId,
                ...(showAll ? {} : { salesRepId: salesRep.id }),
                isPermanentlyClosed: false,
              },
            },
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      const tagCountMap = new Map<string, number>(
        tagCountsRaw.map((entry) => [entry.tagType, entry._count._all])
      );
      const tagCounts = CUSTOMER_TAG_TYPES.map((tag) => ({
        type: tag,
        count: tagCountMap.get(tag) ?? 0,
      }));

      // Calculate revenue per customer for each customer
      const customerIds = customers.map((c) => c.id);
      const allCustomerIds = allCustomers.map((c) => c.id);

      // Get all-time orders to calculate actual revenue
      const monthStart = startOfMonth(now);
      const yearStart = startOfYear(now);

      const [
        allTimeOrders,
        ninetyDayOrders,
        mtdOrders,
        ytdOrders,
        totalRevenueData,
        mtdRevenueData,
        ytdRevenueData,
      ] = await Promise.all([
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: customerIds },
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
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: customerIds },
            deliveredAt: {
              gte: ninetyDaysAgo,
              lte: now,
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
        // MTD orders grouped by customer
        db.order.groupBy({
          by: ["customerId"],
          where: {
            tenantId,
            customerId: { in: customerIds },
            deliveredAt: {
              gte: monthStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),
        // YTD orders grouped by customer
        db.order.groupBy({
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
        }),
        // Calculate total revenue across all customers (not just paginated ones)
        db.order.aggregate({
          where: {
            tenantId,
            customerId: { in: allCustomerIds },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),
        // Calculate MTD revenue across all customers
        db.order.aggregate({
          where: {
            tenantId,
            customerId: { in: allCustomerIds },
            deliveredAt: {
              gte: monthStart,
              lte: now,
            },
            status: {
              not: "CANCELLED",
            },
          },
          _sum: {
            total: true,
          },
        }),
        // Calculate YTD revenue across all customers
        db.order.aggregate({
          where: {
            tenantId,
            customerId: { in: allCustomerIds },
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
        }),
      ]);

      // Create revenue maps
      const revenueMap = new Map(
        allTimeOrders.map((order) => [
          order.customerId,
          {
            revenue: Number(order._sum.total ?? 0),
            orderCount: order._count._all,
          },
        ])
      );

      const ninetyDayMap = new Map(
        ninetyDayOrders.map((order) => [
          order.customerId,
          {
            revenue: Number(order._sum.total ?? 0),
            orderCount: order._count._all,
          },
        ])
      );

      const mtdRevenueMap = new Map(
        mtdOrders.map((order) => [
          order.customerId,
          Number(order._sum.total ?? 0),
        ])
      );

      const ytdRevenueMap = new Map(
        ytdOrders.map((order) => [
          order.customerId,
          Number(order._sum.total ?? 0),
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

      // Serialize customers with calculated metrics
      const serializedCustomers = customers.map((customer) => {
        const allTimeData = revenueMap.get(customer.id);
        const ninetyDayData = ninetyDayMap.get(customer.id);
        const mtdRevenueAmount = mtdRevenueMap.get(customer.id) ?? 0;
        const ytdRevenueAmount = ytdRevenueMap.get(customer.id) ?? 0;
        const daysUntilExpected = customer.nextExpectedOrderDate
          ? differenceInCalendarDays(customer.nextExpectedOrderDate, today)
          : null;
        const daysOverdue =
          daysUntilExpected !== null && daysUntilExpected < 0 ? Math.abs(daysUntilExpected) : 0;

        let effectiveRiskStatus = customer.riskStatus;
        if (
          customer.nextExpectedOrderDate &&
          customer.riskStatus === CustomerRiskStatus.HEALTHY &&
          daysOverdue > 0
        ) {
          effectiveRiskStatus = CustomerRiskStatus.AT_RISK_CADENCE;
        }

        const isDueToOrder =
          customer.nextExpectedOrderDate &&
          daysUntilExpected !== null &&
          daysUntilExpected <= 7 &&
          ![CustomerRiskStatus.DORMANT, CustomerRiskStatus.CLOSED].includes(effectiveRiskStatus)
            ? true
            : false;

        return {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          billingEmail: customer.billingEmail,
          riskStatus: effectiveRiskStatus,
          lastOrderDate: customer.lastOrderDate?.toISOString() ?? null,
          nextExpectedOrderDate: customer.nextExpectedOrderDate?.toISOString() ?? null,
          averageOrderIntervalDays: customer.averageOrderIntervalDays,
          establishedRevenue: customer.establishedRevenue ? Number(customer.establishedRevenue) : null,
          dormancySince: customer.dormancySince?.toISOString() ?? null,
          location: customer.city && customer.state ? `${customer.city}, ${customer.state}` : null,
          state: customer.state,
          territory: customer.territory,
          lifetimeRevenue: allTimeData?.revenue ?? 0,
          recentRevenue: ninetyDayData?.revenue ?? 0,
          mtdRevenue: mtdRevenueAmount,
          ytdRevenue: ytdRevenueAmount,
          recentOrderCount: ninetyDayData?.orderCount ?? 0,
          daysOverdue,
          isDueToOrder,
          daysUntilExpected,
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
          mtdRevenue: Number(mtdRevenueData._sum.total ?? 0),
          ytdRevenue: Number(ytdRevenueData._sum.total ?? 0),
          customersDue: customersDueCount,
          riskCounts: riskStatusCounts,
          tagCounts,
        },
      });
    }
  );
}

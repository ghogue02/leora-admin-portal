import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

type SortField = "occurredAt" | "customer" | "type";
type SortDirection = "asc" | "desc";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      console.log("🔍 [Activities] Handler started");
      console.log("🔍 [Activities] tenantId:", tenantId);
      console.log("🔍 [Activities] user:", session.user.id);
      console.log("🔍 [Activities] salesRep:", session.user.salesRep?.id);

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
      const typeFilter = searchParams.get("type") || "";
      const customerFilter = searchParams.get("customer") || "";
      const sortField = (searchParams.get("sortField") as SortField) || "occurredAt";
      const sortDirection = (searchParams.get("sortDirection") as SortDirection) || "desc";
      const page = parseInt(searchParams.get("page") || "1", 10);
      const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "50", 10), 100);

      // Build where clause
      const where: Prisma.ActivityWhereInput = {
        tenantId,
        userId: session.user.id,
      };

      // Apply search filter (search in subject and notes)
      if (search) {
        where.OR = [
          { subject: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
        ];
      }

      // Apply activity type filter
      if (typeFilter) {
        where.activityType = {
          code: typeFilter,
        };
      }

      // Apply customer filter
      if (customerFilter) {
        where.customerId = customerFilter;
      }

      // Build order by clause
      let orderBy: Prisma.ActivityOrderByWithRelationInput = {};
      switch (sortField) {
        case "occurredAt":
          orderBy = { occurredAt: sortDirection };
          break;
        case "customer":
          orderBy = { customer: { name: sortDirection } };
          break;
        case "type":
          orderBy = { activityType: { name: sortDirection } };
          break;
        default:
          orderBy = { occurredAt: "desc" };
      }

      console.log("🔍 [Activities] Building query with:", {
        tenantId,
        userId: session.user.id,
        limit: pageSize,
      });

      // Execute queries in parallel
      try {
        const [activities, totalCount, typeCounts] = await Promise.all([
        // Get activities with pagination
        db.activity.findMany({
          where,
          select: {
            id: true,
            subject: true,
            notes: true,
            occurredAt: true,
            followUpAt: true,
            outcome: true,
            createdAt: true,
            activityType: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            customer: {
              select: {
                id: true,
                name: true,
                accountNumber: true,
              },
            },
            order: {
              select: {
                id: true,
                orderedAt: true,
                total: true,
                status: true,
              },
            },
          },
          orderBy,
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),

        // Get total count for pagination
        db.activity.count({ where }),

        // Get activity type counts (for filter badges)
        db.activity.groupBy({
          by: ["activityTypeId"],
          where: {
            tenantId,
            userId: session.user.id,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      console.log("✅ [Activities] Query successful, count:", activities.length);
      console.log("✅ [Activities] All queries successful");

      // Get activity types for the counts
      const activityTypeIds = typeCounts.map((tc) => tc.activityTypeId);
      const activityTypes = await db.activityType.findMany({
        where: {
          id: { in: activityTypeIds },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      // Create a map of type counts
      const typeCountsMap = typeCounts.reduce(
        (acc, tc) => {
          const activityType = activityTypes.find((at) => at.id === tc.activityTypeId);
          if (activityType) {
            acc[activityType.code] = tc._count._all;
          }
          return acc;
        },
        {} as Record<string, number>
      );

      // Calculate conversion stats
      const activitiesWithOrders = activities.filter((a) => a.order !== null).length;
      const conversionRate = activities.length > 0
        ? (activitiesWithOrders / activities.length) * 100
        : 0;

      // Serialize activities
      const serializedActivities = activities.map((activity) => ({
        id: activity.id,
        subject: activity.subject,
        notes: activity.notes,
        occurredAt: activity.occurredAt.toISOString(),
        followUpAt: activity.followUpAt?.toISOString() ?? null,
        outcome: activity.outcome,
        createdAt: activity.createdAt.toISOString(),
        activityType: activity.activityType,
        customer: activity.customer,
        order: activity.order
          ? {
              id: activity.order.id,
              orderedAt: activity.order.orderedAt?.toISOString() ?? null,
              total: Number(activity.order.total ?? 0),
              status: activity.order.status,
            }
          : null,
      }));

      return NextResponse.json({
        activities: serializedActivities,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
        summary: {
          totalActivities: totalCount,
          activitiesWithOrders,
          conversionRate: Math.round(conversionRate * 10) / 10,
          typeCounts: typeCountsMap,
        },
      });
    } catch (error) {
      console.error("❌ [Activities] Query failed:", error);
      console.error("❌ [Activities] Error type:", typeof error);
      console.error("❌ [Activities] Error details:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : String(error),
        code: (error as any).code,
        meta: (error as any).meta,
        stack: error instanceof Error ? error.stack : undefined,
      });
      console.error("❌ [Activities] Query context:", {
        tenantId,
        userId: session.user.id,
        search,
        typeFilter,
        customerFilter,
      });
      // Return a proper error response instead of re-throwing
      return NextResponse.json(
        {
          error: "Failed to fetch activities",
          details: error instanceof Error ? error.message : String(error),
          debugInfo: process.env.NODE_ENV === 'development' ? {
            name: error instanceof Error ? error.name : "Unknown",
            code: (error as any).code,
            meta: (error as any).meta,
          } : undefined
        },
        { status: 500 }
      );
    }
    }
  );
}

export async function POST(request: NextRequest) {
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

      // Parse request body
      const body = await request.json();
      const {
        activityTypeCode,
        customerId,
        subject,
        notes,
        occurredAt,
        followUpAt,
        outcome,
      } = body;

      // Validate required fields
      if (!activityTypeCode || !customerId || !subject || !occurredAt) {
        return NextResponse.json(
          { error: "Missing required fields: activityTypeCode, customerId, subject, occurredAt" },
          { status: 400 }
        );
      }

      // Get activity type
      const activityType = await db.activityType.findUnique({
        where: {
          tenantId_code: {
            tenantId,
            code: activityTypeCode,
          },
        },
      });

      if (!activityType) {
        return NextResponse.json(
          { error: "Invalid activity type" },
          { status: 400 }
        );
      }

      // Verify customer belongs to this sales rep
      const customer = await db.customer.findFirst({
        where: {
          id: customerId,
          tenantId,
          salesRepId: salesRep.id,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found or not assigned to you" },
          { status: 404 }
        );
      }

      // Create activity
      const activity = await db.activity.create({
        data: {
          tenantId,
          activityTypeId: activityType.id,
          userId: session.user.id,
          customerId,
          subject,
          notes: notes || null,
          occurredAt: new Date(occurredAt),
          followUpAt: followUpAt ? new Date(followUpAt) : null,
          outcome: outcome || "PENDING",
        },
        include: {
          activityType: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
        },
      });

      return NextResponse.json({
        activity: {
          id: activity.id,
          subject: activity.subject,
          notes: activity.notes,
          occurredAt: activity.occurredAt.toISOString(),
          followUpAt: activity.followUpAt?.toISOString() ?? null,
          outcome: activity.outcome,
          createdAt: activity.createdAt.toISOString(),
          activityType: activity.activityType,
          customer: activity.customer,
        },
      });
    }
  );
}

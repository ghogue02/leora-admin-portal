import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import {
  createCallPlanSchema,
  listCallPlansQuerySchema,
  type CallPlanListResponse,
} from "@/types/call-plan";
import { Prisma } from "@prisma/client";

/**
 * GET /api/call-plans
 * List call plans with optional filtering
 * Query params: week, year, status, page, pageSize
 */
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      // Parse and validate query parameters
      const searchParams = request.nextUrl.searchParams;
      const queryParams = listCallPlansQuerySchema.parse({
        week: searchParams.get("week"),
        year: searchParams.get("year"),
        status: searchParams.get("status"),
        page: searchParams.get("page"),
        pageSize: searchParams.get("pageSize"),
      });

      const page = parseInt(queryParams.page || "1", 10);
      const pageSize = Math.min(parseInt(queryParams.pageSize || "20", 10), 100);

      // Build where clause
      const where: Prisma.CallPlanWhereInput = {
        tenantId,
        userId: session.user.id,
      };

      // Extract week and year from name if filtering
      // Format: "Week X (YYYY)"
      if (queryParams.week && queryParams.year) {
        const weekNum = parseInt(queryParams.week, 10);
        const yearNum = parseInt(queryParams.year, 10);
        where.name = {
          contains: `Week ${weekNum} (${yearNum})`,
        };
      }

      // Get call plans with task counts
      const [callPlans, totalCount] = await Promise.all([
        db.callPlan.findMany({
          where,
          select: {
            id: true,
            name: true,
            description: true,
            effectiveAt: true,
            createdAt: true,
            updatedAt: true,
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        db.callPlan.count({ where }),
      ]);

      // Extract week/year from name and calculate stats
      const response: CallPlanListResponse = {
        callPlans: callPlans.map((plan) => {
          // Parse week and year from name (e.g., "Week 42 (2024)")
          const match = plan.name.match(/Week (\d+) \((\d{4})\)/);
          const week = match ? parseInt(match[1], 10) : 0;
          const year = match ? parseInt(match[2], 10) : new Date().getFullYear();

          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            week,
            year,
            effectiveAt: plan.effectiveAt?.toISOString() || null,
            accountCount: plan.tasks.length,
            completedCount: plan.tasks.filter((t) => t.status === "COMPLETED").length,
            createdAt: plan.createdAt.toISOString(),
            updatedAt: plan.updatedAt.toISOString(),
          };
        }),
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("[GET /api/call-plans] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to fetch call plans" },
        { status: 500 }
      );
    }
  });
}

/**
 * POST /api/call-plans
 * Create a new call plan
 */
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ db, tenantId, session }) => {
    try {
      const body = await request.json();
      const input = createCallPlanSchema.parse(body);

      // Generate default name if not provided
      const name = input.name || `Week ${input.week} (${input.year})`;

      // Check if call plan already exists for this week/year
      const existing = await db.callPlan.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
          name: {
            contains: `Week ${input.week} (${input.year})`,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Call plan already exists for this week/year" },
          { status: 409 }
        );
      }

      // Create call plan
      const callPlan = await db.callPlan.create({
        data: {
          tenantId,
          userId: session.user.id,
          name,
          description: input.description,
          effectiveAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          description: true,
          effectiveAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        id: callPlan.id,
        name: callPlan.name,
        description: callPlan.description,
        week: input.week,
        year: input.year,
        effectiveAt: callPlan.effectiveAt?.toISOString() || null,
        accountCount: 0,
        completedCount: 0,
        createdAt: callPlan.createdAt.toISOString(),
        updatedAt: callPlan.updatedAt.toISOString(),
      }, { status: 201 });
    } catch (error) {
      console.error("[POST /api/call-plans] Error:", error);

      if (error instanceof Error && error.name === "ZodError") {
        return NextResponse.json(
          { error: "Invalid request body", details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create call plan" },
        { status: 500 }
      );
    }
  });
}

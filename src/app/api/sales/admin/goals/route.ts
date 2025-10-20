import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Fetch all product goals
      const goals = await db.repProductGoal.findMany({
        where: {
          tenantId,
        },
        include: {
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          sku: {
            select: {
              id: true,
              product: {
                select: {
                  name: true,
                  brand: true,
                },
              },
            },
          },
        },
        orderBy: {
          periodStart: "desc",
        },
      });

      // Serialize the goals
      const serializedGoals = goals.map((goal) => ({
        id: goal.id,
        salesRepId: goal.salesRepId,
        skuId: goal.skuId,
        productCategory: goal.productCategory,
        targetRevenue: goal.targetRevenue ? Number(goal.targetRevenue) : null,
        targetCases: goal.targetCases,
        periodStart: goal.periodStart.toISOString(),
        periodEnd: goal.periodEnd.toISOString(),
        salesRep: goal.salesRepProfile,
        sku: goal.sku,
      }));

      return NextResponse.json({
        goals: serializedGoals,
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}

export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      const body = await request.json();
      const {
        salesRepId,
        skuId,
        productCategory,
        targetRevenue,
        targetCases,
        periodStart,
        periodEnd,
      } = body;

      // Validation
      if (!salesRepId) {
        return NextResponse.json(
          { error: "Sales Rep ID is required" },
          { status: 400 }
        );
      }

      if (!periodStart || !periodEnd) {
        return NextResponse.json(
          { error: "Period start and end dates are required" },
          { status: 400 }
        );
      }

      if (!skuId && !productCategory) {
        return NextResponse.json(
          { error: "Either SKU ID or product category is required" },
          { status: 400 }
        );
      }

      if (!targetRevenue && !targetCases) {
        return NextResponse.json(
          { error: "At least one target (revenue or cases) is required" },
          { status: 400 }
        );
      }

      // Verify the sales rep exists
      const salesRep = await db.salesRep.findUnique({
        where: {
          id: salesRepId,
          tenantId,
        },
      });

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales representative not found" },
          { status: 404 }
        );
      }

      // Verify SKU exists if provided
      if (skuId) {
        const sku = await db.sku.findUnique({
          where: {
            id: skuId,
            tenantId,
          },
        });

        if (!sku) {
          return NextResponse.json({ error: "SKU not found" }, { status: 404 });
        }
      }

      // Create the goal
      const goal = await db.repProductGoal.create({
        data: {
          tenantId,
          salesRepId,
          skuId: skuId || null,
          productCategory: productCategory || null,
          targetRevenue: targetRevenue ? parseFloat(targetRevenue) : null,
          targetCases: targetCases ? parseInt(targetCases, 10) : null,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
        },
        include: {
          salesRepProfile: {
            select: {
              id: true,
              territoryName: true,
              user: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          sku: {
            select: {
              id: true,
              product: {
                select: {
                  name: true,
                  brand: true,
                },
              },
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        goal: {
          id: goal.id,
          salesRepId: goal.salesRepId,
          skuId: goal.skuId,
          productCategory: goal.productCategory,
          targetRevenue: goal.targetRevenue ? Number(goal.targetRevenue) : null,
          targetCases: goal.targetCases,
          periodStart: goal.periodStart.toISOString(),
          periodEnd: goal.periodEnd.toISOString(),
          salesRep: goal.salesRepProfile,
          sku: goal.sku,
        },
      });
    },
    {
      requiredRoles: ["sales.admin", "admin"],
    }
  );
}

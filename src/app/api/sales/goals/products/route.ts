import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfYear, endOfYear } from "date-fns";
import { expectedProgressByWorkingDays } from "@/lib/sales/goals/seasonality";

export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      // Get sales rep profile for the logged-in user
      const salesRep = session.user.salesRep;

      if (!salesRep) {
        return NextResponse.json(
          { error: "Sales rep profile not found" },
          { status: 404 }
        );
      }

      const now = new Date();
      const currentYear = now.getFullYear();
      const yearStart = startOfYear(now);

      // Get product goals for the current year
      const productGoals = await db.repProductGoal.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          periodStart: {
            lte: now,
          },
          periodEnd: {
            gte: now,
          },
        },
        include: {
          sku: {
            include: {
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
          targetRevenue: "desc",
        },
      });

      // For each product goal, calculate YTD sales
      const goalsWithProgress = await Promise.all(
        productGoals.map(async (goal) => {
          // Calculate YTD sales for this product (SKU)
          const ytdSalesResult = await db.orderLine.aggregate({
            where: {
              tenantId,
              skuId: goal.skuId,
              order: {
                customer: {
                  salesRepId: salesRep.id,
                },
                deliveredAt: {
                  gte: yearStart,
                  lte: now,
                },
                status: {
                  not: "CANCELLED",
                },
              },
            },
            _sum: {
              unitPrice: true,
              quantity: true,
            },
          });

          // Calculate line total (unitPrice * quantity)
          const ytdQuantity = ytdSalesResult._sum.quantity ?? 0;
          const avgUnitPrice = Number(ytdSalesResult._sum.unitPrice ?? 0);

          // Get actual line totals
          const orderLines = await db.orderLine.findMany({
            where: {
              tenantId,
              skuId: goal.skuId,
              order: {
                customer: {
                  salesRepId: salesRep.id,
                },
                deliveredAt: {
                  gte: yearStart,
                  lte: now,
                },
                status: {
                  not: "CANCELLED",
                },
              },
            },
            select: {
              quantity: true,
              unitPrice: true,
            },
          });

          const ytdSales = orderLines.reduce((sum, line) => {
            return sum + (Number(line.unitPrice) * line.quantity);
          }, 0);

          const annualGoal = Number(goal.targetRevenue ?? 0);
          const progressPct = annualGoal > 0 ? (ytdSales / annualGoal) * 100 : 0;

          // Phase 3 Improvement: Seasonality-aware expected progress
          // Replaces linear time (days/365) with working delivery days
          const expectedProgress = expectedProgressByWorkingDays(yearStart, now, yearEnd);
          const expectedPct = expectedProgress * 100;

          // Legacy linear time for comparison (can be removed after validation)
          const daysInYear = 365;
          const daysElapsed = Math.floor(
            (now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)
          );
          const linearExpectedPct = (daysElapsed / daysInYear) * 100;

          // Determine status based on seasonality-adjusted goal
          let status: "on_track" | "at_risk" | "behind";
          if (progressPct >= expectedPct * 0.8) {
            status = "on_track";
          } else if (progressPct >= expectedPct * 0.5) {
            status = "at_risk";
          } else {
            status = "behind";
          }

          // Log seasonality impact for debugging
          if (Math.abs(expectedPct - linearExpectedPct) > 2) {
            console.log(`Seasonality adjustment for ${goal.id}:`, {
              linear: linearExpectedPct.toFixed(1),
              seasonal: expectedPct.toFixed(1),
              difference: (expectedPct - linearExpectedPct).toFixed(1),
            });
          }

          // Product name with brand
          const productName = goal.sku?.product?.brand
            ? `${goal.sku.product.brand} - ${goal.sku.product.name}`
            : goal.sku?.product?.name ?? goal.productCategory ?? "Unknown Product";

          return {
            id: goal.id,
            skuId: goal.skuId,
            productName,
            productCategory: goal.productCategory,
            annualGoal,
            ytdSales,
            progressPct,
            expectedPct,
            status,
            onTrack: status === "on_track",
          };
        })
      );

      // Sort by status priority: behind first, then at_risk, then on_track
      const statusPriority = { behind: 0, at_risk: 1, on_track: 2 };
      const sortedGoals = goalsWithProgress.sort((a, b) => {
        const priorityDiff = statusPriority[a.status] - statusPriority[b.status];
        if (priorityDiff !== 0) return priorityDiff;
        // Within same status, sort by progress percentage (descending for on_track, ascending for others)
        if (a.status === "on_track") {
          return b.progressPct - a.progressPct;
        }
        return a.progressPct - b.progressPct;
      });

      // Calculate summary
      const summary = {
        totalGoals: sortedGoals.length,
        onTrack: sortedGoals.filter((g) => g.status === "on_track").length,
        atRisk: sortedGoals.filter((g) => g.status === "at_risk").length,
        behind: sortedGoals.filter((g) => g.status === "behind").length,
      };

      return NextResponse.json({
        goals: sortedGoals,
        summary,
      });
    }
  );
}

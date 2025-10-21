import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";

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

      // Parse query parameters for pagination
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
      const offset = parseInt(searchParams.get("offset") || "0");

      const now = new Date();
      const thirtyDaysAgo = subDays(now, 30);
      const ninetyDaysAgo = subDays(now, 90);
      const sixMonthsAgo = subMonths(now, 6);

      // Get at-risk revenue customers with detailed information
      const atRiskCustomers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "AT_RISK_REVENUE",
          isPermanentlyClosed: false,
        },
        include: {
          orders: {
            where: {
              deliveredAt: {
                not: null,
              },
              status: {
                not: "CANCELLED",
              },
            },
            orderBy: {
              deliveredAt: "desc",
            },
            select: {
              id: true,
              total: true,
              deliveredAt: true,
              orderedAt: true,
              status: true,
              lines: {
                select: {
                  quantity: true,
                  unitPrice: true,
                  isSample: true,
                  sku: {
                    select: {
                      code: true,
                      product: {
                        select: {
                          name: true,
                          brand: true,
                          category: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          activities: {
            orderBy: {
              occurredAt: "desc",
            },
            take: 5,
            include: {
              activityType: {
                select: {
                  name: true,
                  code: true,
                },
              },
            },
          },
          tasks: {
            where: {
              status: {
                in: ["PENDING", "IN_PROGRESS"],
              },
            },
            orderBy: {
              dueAt: "asc",
            },
            take: 3,
          },
        },
        skip: offset,
        take: limit,
      });

      // Get total count for pagination
      const totalCount = await db.customer.count({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "AT_RISK_REVENUE",
          isPermanentlyClosed: false,
        },
      });

      // Calculate detailed metrics for each customer
      const data = atRiskCustomers.map((customer) => {
        // Revenue trend analysis
        const last30DaysOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= thirtyDaysAgo
        );
        const last90DaysOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= ninetyDaysAgo
        );
        const last6MonthsOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= sixMonthsAgo
        );

        const last30DaysRevenue = last30DaysOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const last90DaysRevenue = last90DaysOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );
        const last6MonthsRevenue = last6MonthsOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const establishedRevenue = Number(customer.establishedRevenue || 0);

        // Calculate decline percentages
        const monthlyEstablished = establishedRevenue / 12;
        const revenueDecline30Days = monthlyEstablished > 0
          ? ((monthlyEstablished - last30DaysRevenue) / monthlyEstablished) * 100
          : 0;
        const revenueDecline90Days = (establishedRevenue / 4) > 0
          ? (((establishedRevenue / 4) - last90DaysRevenue) / (establishedRevenue / 4)) * 100
          : 0;

        // Product mix analysis
        const currentProductMix = last90DaysOrders
          .flatMap((order) => order.lines)
          .reduce((acc, line) => {
            const category = line.sku.product.category || "Uncategorized";
            const productName = line.sku.product.name;

            if (!acc.byCategory[category]) {
              acc.byCategory[category] = { revenue: 0, quantity: 0 };
            }
            if (!acc.byProduct[productName]) {
              acc.byProduct[productName] = {
                name: productName,
                brand: line.sku.product.brand,
                category,
                revenue: 0,
                quantity: 0,
              };
            }

            const lineTotal = Number(line.unitPrice) * line.quantity;
            acc.byCategory[category].revenue += lineTotal;
            acc.byCategory[category].quantity += line.quantity;
            acc.byProduct[productName].revenue += lineTotal;
            acc.byProduct[productName].quantity += line.quantity;

            return acc;
          }, { byCategory: {} as Record<string, any>, byProduct: {} as Record<string, any> });

        const historicalProductMix = customer.orders
          .filter((o) => o.deliveredAt && o.deliveredAt < ninetyDaysAgo)
          .slice(0, 20)
          .flatMap((order) => order.lines)
          .reduce((acc, line) => {
            const category = line.sku.product.category || "Uncategorized";
            if (!acc[category]) {
              acc[category] = { revenue: 0, quantity: 0 };
            }
            const lineTotal = Number(line.unitPrice) * line.quantity;
            acc[category].revenue += lineTotal;
            acc[category].quantity += line.quantity;
            return acc;
          }, {} as Record<string, any>);

        // Identify product mix changes
        const mixChanges = Object.entries(currentProductMix.byCategory).map(
          ([category, current]: [string, any]) => {
            const historical = historicalProductMix[category] || { revenue: 0, quantity: 0 };
            const revenueChange = historical.revenue > 0
              ? ((current.revenue - historical.revenue) / historical.revenue) * 100
              : 0;

            return {
              category,
              currentRevenue: current.revenue,
              historicalRevenue: historical.revenue,
              change: revenueChange,
            };
          }
        ).sort((a, b) => a.change - b.change);

        // Order size trend
        const recentOrderSizes = last90DaysOrders
          .slice(0, 5)
          .map((o) => Number(o.total || 0));
        const avgRecentOrderSize = recentOrderSizes.length > 0
          ? recentOrderSizes.reduce((sum, val) => sum + val, 0) / recentOrderSizes.length
          : 0;

        const historicalOrderSizes = customer.orders
          .filter((o) => o.deliveredAt && o.deliveredAt < ninetyDaysAgo)
          .slice(0, 10)
          .map((o) => Number(o.total || 0));
        const avgHistoricalOrderSize = historicalOrderSizes.length > 0
          ? historicalOrderSizes.reduce((sum, val) => sum + val, 0) / historicalOrderSizes.length
          : 0;

        const orderSizeChange = avgHistoricalOrderSize > 0
          ? ((avgRecentOrderSize - avgHistoricalOrderSize) / avgHistoricalOrderSize) * 100
          : 0;

        // Upsell opportunities (products they haven't ordered recently)
        const recentProducts = new Set(
          last90DaysOrders
            .flatMap((order) => order.lines)
            .map((line) => line.sku.product.name)
        );

        const historicalProducts = customer.orders
          .filter((o) => o.deliveredAt && o.deliveredAt < ninetyDaysAgo)
          .flatMap((order) => order.lines)
          .reduce((acc, line) => {
            const productName = line.sku.product.name;
            if (!recentProducts.has(productName)) {
              if (!acc[productName]) {
                acc[productName] = {
                  name: productName,
                  brand: line.sku.product.brand,
                  category: line.sku.product.category,
                  historicalRevenue: 0,
                  lastPurchased: null as Date | null,
                };
              }
              acc[productName].historicalRevenue += Number(line.unitPrice) * line.quantity;
            }
            return acc;
          }, {} as Record<string, any>);

        const upsellOpportunities = Object.values(historicalProducts)
          .sort((a: any, b: any) => b.historicalRevenue - a.historicalRevenue)
          .slice(0, 5);

        // Recommended recovery actions
        const recommendedActions: string[] = [];

        if (revenueDecline30Days > 25) {
          recommendedActions.push("URGENT: Schedule immediate in-person meeting");
          recommendedActions.push("Conduct needs assessment to understand business changes");
        }

        if (orderSizeChange < -20) {
          recommendedActions.push("Discuss volume-based incentives or promotions");
          recommendedActions.push("Review pricing concerns and competitive positioning");
        }

        if (mixChanges.length > 0 && mixChanges[0].change < -30) {
          recommendedActions.push(`Address declining ${mixChanges[0].category} purchases`);
          recommendedActions.push("Offer product tasting to reintroduce category");
        }

        if (upsellOpportunities.length > 0) {
          recommendedActions.push("Reintroduce previously purchased products with samples");
          recommendedActions.push(`Highlight ${upsellOpportunities[0].name} as returning favorite`);
        }

        recommendedActions.push("Create customized promotion based on purchase history");
        recommendedActions.push("Monitor weekly and intervene if decline continues");

        return {
          id: customer.id,
          name: customer.name,
          accountNumber: customer.accountNumber,
          contact: {
            phone: customer.phone,
            email: customer.billingEmail,
          },
          location: {
            city: customer.city,
            state: customer.state,
          },
          revenueMetrics: {
            establishedRevenue,
            last30DaysRevenue,
            last90DaysRevenue,
            last6MonthsRevenue,
            revenueDecline30Days: revenueDecline30Days.toFixed(1),
            revenueDecline90Days: revenueDecline90Days.toFixed(1),
            monthlyRunRate: last30DaysRevenue,
            vsEstablishedMonthly: monthlyEstablished,
          },
          orderTrends: {
            avgRecentOrderSize,
            avgHistoricalOrderSize,
            orderSizeChange: orderSizeChange.toFixed(1),
            orderCount30Days: last30DaysOrders.length,
            orderCount90Days: last90DaysOrders.length,
          },
          productMixAnalysis: {
            currentCategories: Object.entries(currentProductMix.byCategory).map(
              ([category, data]: [string, any]) => ({
                category,
                revenue: data.revenue,
                quantity: data.quantity,
              })
            ),
            mixChanges: mixChanges.slice(0, 5),
            topCurrentProducts: Object.values(currentProductMix.byProduct)
              .sort((a: any, b: any) => b.revenue - a.revenue)
              .slice(0, 5),
          },
          upsellOpportunities,
          engagement: {
            lastActivityDate: customer.activities[0]?.occurredAt.toISOString() || null,
            recentActivities: customer.activities.length,
            pendingTasks: customer.tasks.length,
          },
          recovery: {
            recommendedActions,
            priority: revenueDecline30Days > 25 ? "CRITICAL" : revenueDecline30Days > 15 ? "HIGH" : "MEDIUM",
            estimatedRecoveryPotential: establishedRevenue - last90DaysRevenue / 3,
          },
          recentOrders: customer.orders.slice(0, 5).map((order) => ({
            id: order.id,
            total: Number(order.total || 0),
            deliveredAt: order.deliveredAt?.toISOString() || null,
            status: order.status,
            itemCount: order.lines.length,
          })),
          recentActivity: customer.activities.map((activity) => ({
            id: activity.id,
            type: activity.activityType.name,
            typeCode: activity.activityType.code,
            subject: activity.subject,
            occurredAt: activity.occurredAt.toISOString(),
            outcome: activity.outcome,
          })),
        };
      });

      // Sort by revenue decline severity
      const sortedData = data.sort(
        (a, b) => Number(b.revenueMetrics.revenueDecline30Days) - Number(a.revenueMetrics.revenueDecline30Days)
      );

      // Calculate summary statistics
      const summary = {
        totalAtRisk: totalCount,
        criticalPriority: data.filter((c) => c.recovery.priority === "CRITICAL").length,
        highPriority: data.filter((c) => c.recovery.priority === "HIGH").length,
        moderatePriority: data.filter((c) => c.recovery.priority === "MEDIUM").length,
        totalRevenueAtRisk: data.reduce(
          (sum, c) => sum + c.revenueMetrics.establishedRevenue,
          0
        ),
        totalRevenueLoss: data.reduce(
          (sum, c) => sum + (c.revenueMetrics.establishedRevenue - c.revenueMetrics.last90DaysRevenue / 3),
          0
        ),
        averageDecline: data.length > 0
          ? (data.reduce((sum, c) => sum + Number(c.revenueMetrics.revenueDecline30Days), 0) / data.length).toFixed(1)
          : "0",
        recoveryPotential: data.reduce(
          (sum, c) => sum + c.recovery.estimatedRecoveryPotential,
          0
        ),
      };

      return NextResponse.json({
        summary,
        data: sortedData,
        metadata: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
          timestamp: now.toISOString(),
        },
        insights: {
          topPriorities: sortedData.slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            revenueDecline: c.revenueMetrics.revenueDecline30Days,
            revenueLoss: c.revenueMetrics.establishedRevenue - c.revenueMetrics.last30DaysRevenue,
            priority: c.recovery.priority,
            topAction: c.recovery.recommendedActions[0],
          })),
          commonPatterns: {
            orderSizeDecline: data.filter(
              (c) => Number(c.orderTrends.orderSizeChange) < -15
            ).length,
            productMixShift: data.filter(
              (c) => c.productMixAnalysis.mixChanges.length > 0 &&
                     c.productMixAnalysis.mixChanges[0].change < -20
            ).length,
            upsellPotential: data.filter(
              (c) => c.upsellOpportunities.length > 0
            ).length,
          },
        },
      });
    }
  );
}

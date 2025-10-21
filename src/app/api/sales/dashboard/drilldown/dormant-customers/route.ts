import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { subDays, subMonths } from "date-fns";

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
      const ninetyDaysAgo = subDays(now, 90);

      // Get dormant customers with detailed information
      const dormantCustomers = await db.customer.findMany({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "DORMANT",
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
            take: 10,
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
        orderBy: {
          lastOrderDate: "asc", // Oldest first (most urgent)
        },
        skip: offset,
        take: limit,
      });

      // Get total count for pagination
      const totalCount = await db.customer.count({
        where: {
          tenantId,
          salesRepId: salesRep.id,
          riskStatus: "DORMANT",
          isPermanentlyClosed: false,
        },
      });

      // Calculate detailed metrics for each customer
      const data = dormantCustomers.map((customer) => {
        const daysSinceLastOrder = customer.lastOrderDate
          ? Math.floor(
              (now.getTime() - customer.lastOrderDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        // Historical revenue analysis
        const historicalRevenue = customer.orders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const last6MonthsOrders = customer.orders.filter(
          (o) => o.deliveredAt && o.deliveredAt >= subMonths(now, 6)
        );
        const recentRevenue = last6MonthsOrders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        const averageOrderValue = customer.orders.length > 0
          ? historicalRevenue / customer.orders.length
          : 0;

        // Product preferences
        const productPurchases = customer.orders
          .flatMap((order) => order.lines)
          .reduce((acc, line) => {
            const productName = line.sku.product.name;
            const brand = line.sku.product.brand || "Unknown";
            const category = line.sku.product.category || "Uncategorized";

            if (!acc[productName]) {
              acc[productName] = {
                name: productName,
                brand,
                category,
                quantity: 0,
                revenue: 0,
                orderCount: 0,
              };
            }
            acc[productName].quantity += line.quantity;
            acc[productName].revenue += Number(line.unitPrice) * line.quantity;
            acc[productName].orderCount += 1;
            return acc;
          }, {} as Record<string, any>);

        const topProducts = Object.values(productPurchases)
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 5);

        // Recent engagement
        const lastActivityDate = customer.activities[0]?.occurredAt || null;
        const daysSinceLastActivity = lastActivityDate
          ? Math.floor(
              (now.getTime() - lastActivityDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null;

        // Reactivation potential score (0-100)
        let reactivationScore = 0;

        // Factor 1: Historical value (max 40 points)
        const revenueScore = Math.min(
          (Number(customer.establishedRevenue || 0) / 10000) * 40,
          40
        );
        reactivationScore += revenueScore;

        // Factor 2: Recent engagement (max 30 points)
        if (lastActivityDate && daysSinceLastActivity !== null) {
          const engagementScore = Math.max(0, 30 - (daysSinceLastActivity / 90) * 30);
          reactivationScore += engagementScore;
        }

        // Factor 3: Order consistency before dormancy (max 30 points)
        const consistencyScore = customer.orders.length >= 5 ? 30 : (customer.orders.length / 5) * 30;
        reactivationScore += consistencyScore;

        // Determine reactivation strategy
        let reactivationStrategy = "Standard re-engagement campaign";
        let recommendedActions: string[] = [];

        if (daysSinceLastOrder && daysSinceLastOrder <= 60) {
          reactivationStrategy = "Immediate personal outreach";
          recommendedActions = [
            "Personal phone call to understand ordering pause",
            "Offer seasonal tasting or new product samples",
            "Schedule in-person visit within 1 week",
          ];
        } else if (daysSinceLastOrder && daysSinceLastOrder <= 90) {
          reactivationStrategy = "Targeted re-engagement";
          recommendedActions = [
            "Send personalized email highlighting their favorite products",
            "Offer limited-time promotion on previous purchases",
            "Follow up with phone call if no response in 3 days",
          ];
        } else {
          reactivationStrategy = "Win-back campaign";
          recommendedActions = [
            "Send \"We miss you\" campaign with special offer",
            "Share new arrivals in their preferred categories",
            "Invite to exclusive tasting event",
            "Assign to win-back task list for monthly follow-up",
          ];
        }

        // Dormancy risk level
        let riskLevel = "MODERATE";
        if (daysSinceLastOrder && daysSinceLastOrder > 120) {
          riskLevel = "CRITICAL";
        } else if (daysSinceLastOrder && daysSinceLastOrder > 90) {
          riskLevel = "HIGH";
        } else if (daysSinceLastOrder && daysSinceLastOrder <= 60) {
          riskLevel = "LOW";
        }

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
          dormancyMetrics: {
            daysSinceLastOrder,
            lastOrderDate: customer.lastOrderDate?.toISOString() || null,
            dormancySince: customer.dormancySince?.toISOString() || null,
            riskLevel,
          },
          historicalMetrics: {
            totalRevenue: historicalRevenue,
            recentRevenue,
            averageOrderValue,
            totalOrders: customer.orders.length,
            establishedRevenue: Number(customer.establishedRevenue || 0),
          },
          engagement: {
            lastActivityDate: lastActivityDate?.toISOString() || null,
            daysSinceLastActivity,
            recentActivities: customer.activities.length,
            pendingTasks: customer.tasks.length,
          },
          productPreferences: {
            topProducts,
            uniqueProducts: Object.keys(productPurchases).length,
            favoriteCategories: [...new Set(Object.values(productPurchases).map((p: any) => p.category))],
          },
          reactivation: {
            potentialScore: reactivationScore.toFixed(1),
            strategy: reactivationStrategy,
            recommendedActions,
            priority: riskLevel === "CRITICAL" ? "HIGH" : riskLevel === "HIGH" ? "MEDIUM" : "LOW",
          },
          recentOrders: customer.orders.slice(0, 3).map((order) => ({
            id: order.id,
            total: Number(order.total || 0),
            deliveredAt: order.deliveredAt?.toISOString() || null,
            status: order.status,
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

      // Calculate summary statistics
      const summary = {
        totalDormant: totalCount,
        criticalRisk: data.filter((c) => c.dormancyMetrics.riskLevel === "CRITICAL").length,
        highRisk: data.filter((c) => c.dormancyMetrics.riskLevel === "HIGH").length,
        moderateRisk: data.filter((c) => c.dormancyMetrics.riskLevel === "MODERATE").length,
        lowRisk: data.filter((c) => c.dormancyMetrics.riskLevel === "LOW").length,
        totalRevenueAtRisk: data.reduce((sum, c) => sum + c.historicalMetrics.establishedRevenue, 0),
        averageReactivationScore: data.length > 0
          ? (data.reduce((sum, c) => sum + Number(c.reactivation.potentialScore), 0) / data.length).toFixed(1)
          : "0",
        avgDaysDormant: data.length > 0
          ? Math.round(
              data.reduce((sum, c) => sum + (c.dormancyMetrics.daysSinceLastOrder || 0), 0) / data.length
            )
          : 0,
      };

      return NextResponse.json({
        summary,
        data,
        metadata: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + limit < totalCount,
          timestamp: now.toISOString(),
        },
        insights: {
          highPriority: data
            .filter((c) => c.reactivation.priority === "HIGH")
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              daysDormant: c.dormancyMetrics.daysSinceLastOrder,
              potentialRevenue: c.historicalMetrics.establishedRevenue,
              strategy: c.reactivation.strategy,
            })),
          bestOpportunities: data
            .sort((a, b) => Number(b.reactivation.potentialScore) - Number(a.reactivation.potentialScore))
            .slice(0, 5)
            .map((c) => ({
              customerId: c.id,
              customerName: c.name,
              reactivationScore: c.reactivation.potentialScore,
              revenue: c.historicalMetrics.establishedRevenue,
            })),
        },
      });
    }
  );
}

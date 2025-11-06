import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { startOfWeek, endOfWeek, subWeeks, format, startOfISOWeek, endOfISOWeek } from "date-fns";

/**
 * Comprehensive diagnostic endpoint for debugging LEORA sales data connectivity issues
 *
 * This endpoint provides detailed information about:
 * - Database connectivity and data counts
 * - Current user session details
 * - Week range calculations (ISO Monday-Sunday)
 * - Customer data distribution
 * - Activities data
 * - Sample recent data with full field inspection
 *
 * Use this endpoint to verify data is flowing correctly and identify any null/undefined values
 * that might be causing issues in the sales portal.
 */
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session, roles, permissions }) => {
      const now = new Date();

      // Calculate ISO week ranges (Monday = start, Sunday = end)
      const currentWeekStart = startOfISOWeek(now);
      const currentWeekEnd = endOfISOWeek(now);
      const lastWeekStart = startOfISOWeek(subWeeks(now, 1));
      const lastWeekEnd = endOfISOWeek(subWeeks(now, 1));

      // Alternative calculation using date-fns with weekStartsOn option
      const currentWeekStartAlt = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEndAlt = endOfWeek(now, { weekStartsOn: 1 });

      try {
        // Get sales rep profile
        const salesRep = await db.salesRep.findUnique({
          where: {
            tenantId_userId: {
              tenantId,
              userId: session.user.id,
            },
          },
          include: {
            user: {
              select: {
                fullName: true,
                email: true,
                isActive: true,
              },
            },
          },
        });

        // ==================================================================
        // SECTION 1: DATABASE CONNECTIVITY CHECKS
        // ==================================================================

        const [
          totalOrders,
          ordersByTerritory,
          ordersThisWeek,
          ordersByStatus,
          recentOrdersSample,
        ] = await Promise.all([
          // Total orders count
          db.order.count({
            where: { tenantId },
          }),

          // Orders grouped by territory (via customer's sales rep)
          db.order.groupBy({
            by: ["tenantId"],
            where: {
              tenantId,
              customer: {
                salesRep: {
                  isNot: null,
                },
              },
            },
            _count: {
              id: true,
            },
          }),

          // Orders in current week
          db.order.count({
            where: {
              tenantId,
              deliveredAt: {
                gte: currentWeekStart,
                lte: currentWeekEnd,
              },
            },
          }),

          // Orders by status
          db.order.groupBy({
            by: ["status"],
            where: { tenantId },
            _count: {
              id: true,
            },
          }),

          // Sample orders with amounts
          db.order.findMany({
            where: { tenantId },
            select: {
              id: true,
              status: true,
              orderedAt: true,
              deliveredAt: true,
              deliveryWeek: true,
              total: true,
              currency: true,
              isFirstOrder: true,
              customer: {
                select: {
                  id: true,
                  name: true,
                  salesRep: {
                    select: {
                      id: true,
                      territoryName: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          }),
        ]);

        // Get territory breakdown by actually querying sales reps and their customers' orders
        const salesRepsWithOrders = await db.salesRep.findMany({
          where: {
            tenantId,
            isActive: true,
          },
          select: {
            id: true,
            territoryName: true,
            customers: {
              select: {
                _count: {
                  select: {
                    orders: true,
                  },
                },
              },
            },
          },
        });

        const territoryOrderCounts = salesRepsWithOrders.reduce(
          (acc, rep) => {
            const orderCount = rep.customers.reduce(
              (sum, customer) => sum + customer._count.orders,
              0
            );
            acc[rep.territoryName] = (acc[rep.territoryName] || 0) + orderCount;
            return acc;
          },
          {} as Record<string, number>
        );

        // ==================================================================
        // SECTION 2: CURRENT USER SESSION
        // ==================================================================

        const userSessionInfo = {
          userId: session.user.id,
          email: session.user.email,
          fullName: session.user.fullName,
          isActive: session.user.isActive,
          roles: roles,
          permissions: Array.from(permissions),
          salesRep: salesRep
            ? {
                id: salesRep.id,
                territory: salesRep.territoryName,
                deliveryDay: salesRep.deliveryDay,
                isActive: salesRep.isActive,
                weeklyQuota: salesRep.weeklyRevenueQuota
                  ? Number(salesRep.weeklyRevenueQuota)
                  : null,
                monthlyQuota: salesRep.monthlyRevenueQuota
                  ? Number(salesRep.monthlyRevenueQuota)
                  : null,
              }
            : null,
        };

        // ==================================================================
        // SECTION 3: WEEK RANGE CALCULATIONS
        // ==================================================================

        const weekRangeInfo = {
          currentDate: now.toISOString(),
          currentWeek: {
            isoWeek: {
              start: currentWeekStart.toISOString(),
              end: currentWeekEnd.toISOString(),
              startFormatted: format(currentWeekStart, "yyyy-MM-dd (EEEE)"),
              endFormatted: format(currentWeekEnd, "yyyy-MM-dd (EEEE)"),
            },
            altCalculation: {
              start: currentWeekStartAlt.toISOString(),
              end: currentWeekEndAlt.toISOString(),
              startFormatted: format(currentWeekStartAlt, "yyyy-MM-dd (EEEE)"),
              endFormatted: format(currentWeekEndAlt, "yyyy-MM-dd (EEEE)"),
            },
            matches: currentWeekStart.getTime() === currentWeekStartAlt.getTime(),
          },
          lastWeek: {
            start: lastWeekStart.toISOString(),
            end: lastWeekEnd.toISOString(),
            startFormatted: format(lastWeekStart, "yyyy-MM-dd (EEEE)"),
            endFormatted: format(lastWeekEnd, "yyyy-MM-dd (EEEE)"),
          },
          calculationNotes: [
            "ISO Week starts on Monday (day 1) and ends on Sunday (day 7)",
            "Both startOfISOWeek and startOfWeek with weekStartsOn:1 should produce same results",
            "All times are at 00:00:00 local time for start, 23:59:59.999 for end",
          ],
        };

        // ==================================================================
        // SECTION 4: CUSTOMER DATA
        // ==================================================================

        const [
          totalCustomers,
          customersByTerritory,
          customersAssignedToUser,
          customersByRiskStatus,
        ] = await Promise.all([
          // Total customers
          db.customer.count({
            where: {
              tenantId,
              isPermanentlyClosed: false,
            },
          }),

          // Customers by territory
          db.customer.groupBy({
            by: ["salesRepId"],
            where: {
              tenantId,
              isPermanentlyClosed: false,
              salesRepId: { not: null },
            },
            _count: {
              id: true,
            },
          }),

          // Customers assigned to current sales rep
          salesRep
            ? db.customer.count({
                where: {
                  tenantId,
                  salesRepId: salesRep.id,
                  isPermanentlyClosed: false,
                },
              })
            : 0,

          // Customers by risk status
          db.customer.groupBy({
            by: ["riskStatus"],
            where: {
              tenantId,
              isPermanentlyClosed: false,
            },
            _count: {
              id: true,
            },
          }),
        ]);

        // Get territory names for customer breakdown
        const territoryCustomerCounts: Record<string, number> = {};
        if (customersByTerritory.length > 0) {
          const repIds = customersByTerritory
            .map((g) => g.salesRepId)
            .filter((id): id is string => id !== null);

          const reps = await db.salesRep.findMany({
            where: {
              id: { in: repIds },
            },
            select: {
              id: true,
              territoryName: true,
            },
          });

          const repMap = new Map(reps.map((r) => [r.id, r.territoryName]));

          customersByTerritory.forEach((group) => {
            if (group.salesRepId) {
              const territory = repMap.get(group.salesRepId) || "Unknown";
              territoryCustomerCounts[territory] =
                (territoryCustomerCounts[territory] || 0) + group._count.id;
            }
          });
        }

        // ==================================================================
        // SECTION 5: ACTIVITIES DATA
        // ==================================================================

        const [
          totalActivities,
          activitiesThisWeek,
          activitiesByRep,
          recentActivitiesSample,
        ] = await Promise.all([
          // Total activities
          db.activity.count({
            where: { tenantId },
          }),

          // Activities in current week
          db.activity.count({
            where: {
              tenantId,
              occurredAt: {
                gte: currentWeekStart,
                lte: currentWeekEnd,
              },
            },
          }),

          // Activities by sales rep (via userId)
          db.activity.groupBy({
            by: ["userId"],
            where: {
              tenantId,
              userId: { not: null },
            },
            _count: {
              id: true,
            },
          }),

          // Recent activities sample
          db.activity.findMany({
            where: { tenantId },
            include: {
              activityType: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              occurredAt: "desc",
            },
            take: 5,
          }),
        ]);

        // ==================================================================
        // SECTION 6: SAMPLE RECENT DATA
        // ==================================================================

        const [recentOrdersDetailed, recentActivitiesDetailed] = await Promise.all([
          // 5 most recent orders with ALL fields
          db.order.findMany({
            where: { tenantId },
            include: {
              customer: {
                select: {
                  id: true,
                  name: true,
                  accountNumber: true,
                  salesRep: {
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
                },
              },
              lines: {
                select: {
                  id: true,
                  quantity: true,
                  unitPrice: true,
                  isSample: true,
                  sku: {
                    select: {
                      id: true,
                      code: true,
                      product: {
                        select: {
                          name: true,
                          brand: true,
                        },
                      },
                    },
                  },
                },
              },
              portalUser: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 5,
          }),

          // 5 most recent activities with ALL fields
          db.activity.findMany({
            where: { tenantId },
            include: {
              activityType: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  salesRepProfile: {
                    select: {
                      territoryName: true,
                    },
                  },
                },
              },
              portalUser: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  name: true,
                  accountNumber: true,
                  riskStatus: true,
                },
              },
              order: {
                select: {
                  id: true,
                  status: true,
                  total: true,
                },
              },
            },
            orderBy: {
              occurredAt: "desc",
            },
            take: 5,
          }),
        ]);

        // Analyze for null/undefined values in recent data
        const dataQualityChecks = {
          orders: {
            total: recentOrdersDetailed.length,
            nullChecks: recentOrdersDetailed.map((order) => ({
              orderId: order.id,
              hasOrderedAt: order.orderedAt !== null,
              hasDeliveredAt: order.deliveredAt !== null,
              hasDeliveryWeek: order.deliveryWeek !== null,
              hasTotal: order.total !== null,
              hasCustomer: order.customer !== null,
              hasSalesRep: order.customer?.salesRep !== null,
              lineCount: order.lines.length,
              hasPortalUser: order.portalUser !== null,
            })),
          },
          activities: {
            total: recentActivitiesDetailed.length,
            nullChecks: recentActivitiesDetailed.map((activity) => ({
              activityId: activity.id,
              hasUser: activity.userId !== null,
              hasPortalUser: activity.portalUserId !== null,
              hasCustomer: activity.customerId !== null,
              hasOrder: activity.orderId !== null,
              hasNotes: activity.notes !== null,
              hasFollowUpAt: activity.followUpAt !== null,
              hasOutcome: (activity.outcomes ?? []).length > 0,
            })),
          },
        };

        // ==================================================================
        // RESPONSE STRUCTURE
        // ==================================================================

        return NextResponse.json(
          {
            timestamp: now.toISOString(),
            diagnosticVersion: "1.0.0",

            // Section 1: Database Connectivity
            database: {
              connected: true,
              tenantId,
              orders: {
                total: totalOrders,
                byTerritory: territoryOrderCounts,
                thisWeek: ordersThisWeek,
                byStatus: ordersByStatus.reduce(
                  (acc, group) => {
                    acc[group.status] = group._count.id;
                    return acc;
                  },
                  {} as Record<string, number>
                ),
                sample: recentOrdersSample.map((order) => ({
                  id: order.id,
                  status: order.status,
                  orderedAt: order.orderedAt?.toISOString() ?? null,
                  deliveredAt: order.deliveredAt?.toISOString() ?? null,
                  deliveryWeek: order.deliveryWeek,
                  total: order.total ? Number(order.total) : null,
                  currency: order.currency,
                  isFirstOrder: order.isFirstOrder,
                  customerName: order.customer.name,
                  territory: order.customer.salesRep?.territoryName ?? null,
                })),
              },
            },

            // Section 2: Current User Session
            session: userSessionInfo,

            // Section 3: Week Range Calculations
            weekRanges: weekRangeInfo,

            // Section 4: Customer Data
            customers: {
              total: totalCustomers,
              byTerritory: territoryCustomerCounts,
              assignedToCurrentUser: customersAssignedToUser,
              byRiskStatus: customersByRiskStatus.reduce(
                (acc, group) => {
                  acc[group.riskStatus] = group._count.id;
                  return acc;
                },
                {} as Record<string, number>
              ),
            },

            // Section 5: Activities Data
            activities: {
              total: totalActivities,
              thisWeek: activitiesThisWeek,
              byRep: activitiesByRep.length,
              sample: recentActivitiesSample.map((activity) => ({
                id: activity.id,
                type: activity.activityType.name,
                typeCode: activity.activityType.code,
                subject: activity.subject,
                occurredAt: activity.occurredAt.toISOString(),
                userName: activity.user?.fullName ?? null,
                customerName: activity.customer?.name ?? null,
                outcome: activity.outcomes?.[0] ?? null,
                outcomes: activity.outcomes ?? [],
              })),
            },

            // Section 6: Sample Recent Data (Full Detail)
            recentDataDetailed: {
              orders: recentOrdersDetailed.map((order) => ({
                ...order,
                total: order.total ? Number(order.total) : null,
                orderedAt: order.orderedAt?.toISOString() ?? null,
                fulfilledAt: order.fulfilledAt?.toISOString() ?? null,
                deliveredAt: order.deliveredAt?.toISOString() ?? null,
                createdAt: order.createdAt.toISOString(),
                updatedAt: order.updatedAt.toISOString(),
                lines: order.lines.map((line) => ({
                  ...line,
                  unitPrice: Number(line.unitPrice),
                })),
              })),
              activities: recentActivitiesDetailed.map((activity) => ({
                ...activity,
                occurredAt: activity.occurredAt.toISOString(),
                followUpAt: activity.followUpAt?.toISOString() ?? null,
                createdAt: activity.createdAt.toISOString(),
                updatedAt: activity.updatedAt.toISOString(),
              })),
            },

            // Data Quality Analysis
            dataQuality: dataQualityChecks,

            // Recommendations
            recommendations: [
              totalOrders === 0
                ? "WARNING: No orders found in database. Check data import."
                : null,
              ordersThisWeek === 0
                ? "INFO: No orders delivered this week (ISO week " +
                  format(currentWeekStart, "w") +
                  ")"
                : null,
              !salesRep
                ? "WARNING: Current user does not have a sales rep profile."
                : null,
              customersAssignedToUser === 0 && salesRep
                ? "WARNING: Sales rep has no customers assigned."
                : null,
              totalActivities === 0
                ? "WARNING: No activities found in database."
                : null,
            ].filter(Boolean),
          },
          { status: 200 }
        );
      } catch (error) {
        console.error("Diagnostics endpoint error:", error);
        return NextResponse.json(
          {
            error: "Failed to run diagnostics",
            message: error instanceof Error ? error.message : "Unknown error",
            timestamp: now.toISOString(),
          },
          { status: 500 }
        );
      }
    },
    {
      requireSalesRep: false, // Allow access even without sales rep for debugging
    }
  );
}

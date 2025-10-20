import { prisma, withTenant } from "@/lib/prisma";

type RunOptions = {
  tenantId?: string;
  tenantSlug?: string;
  disconnectAfterRun?: boolean;
};

/**
 * Weekly Metrics Aggregation Job
 *
 * Runs every Monday at 1 AM to calculate the previous week's metrics for all active sales reps.
 *
 * Schedule: 0 1 * * 1 (Mondays at 1 AM)
 *
 * For each active sales rep, this job calculates:
 * - Total revenue for the week (based on deliveredAt)
 * - Revenue from same week last year (for year-over-year comparison)
 * - Unique customer orders count
 * - New customers added (isFirstOrder = true and deliveredAt in range)
 * - Dormant customers count at end of week
 * - Reactivated customers count during week
 * - Delivery days in week (based on rep's deliveryDay)
 * - Activity counts by type (in-person, tastings, emails, etc.)
 *
 * The job stores results in the RepWeeklyMetric model with ISO week numbers
 * for consistent week-over-week comparisons.
 */
export async function run(options: RunOptions = {}) {
  const { tenantId: explicitTenantId, tenantSlug: explicitTenantSlug } = options;
  const disconnectAfterRun = options.disconnectAfterRun ?? true;

  try {
    const tenantSelector = explicitTenantId
      ? { id: explicitTenantId }
      : {
          slug: explicitTenantSlug ?? process.env.DEFAULT_TENANT_SLUG ?? "well-crafted",
        };

    const tenant = await prisma.tenant.findFirst({
      where: tenantSelector,
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      console.warn(
        `[weekly-metrics] Tenant lookup failed for selector ${JSON.stringify(tenantSelector)}. Skipping aggregation.`,
      );
      return;
    }

    console.log(`[weekly-metrics] Starting weekly metrics aggregation for ${tenant.name ?? tenant.slug}`);

    // Get previous week's date range
    const { weekStartDate, weekEndDate, weekNumber, year } = getPreviousWeekRange();

    console.log(
      `[weekly-metrics] Calculating metrics for week ${weekNumber} (${year}): ${weekStartDate.toISOString()} - ${weekEndDate.toISOString()}`,
    );

    await withTenant(tenant.id, async (tx) => {
      // Get all active sales reps
      const salesReps = await tx.salesRep.findMany({
        where: {
          tenantId: tenant.id,
          isActive: true,
        },
        select: {
          id: true,
          deliveryDay: true,
          user: {
            select: {
              fullName: true,
            },
          },
        },
      });

      console.log(`[weekly-metrics] Processing ${salesReps.length} active sales reps`);

      for (const rep of salesReps) {
        try {
          console.log(`[weekly-metrics] Calculating metrics for ${rep.user.fullName} (${rep.id})`);

          // Calculate revenue for this week (orders delivered in this week)
          const revenueResult = await tx.order.aggregate({
            where: {
              tenantId: tenant.id,
              deliveredAt: {
                gte: weekStartDate,
                lte: weekEndDate,
              },
              customer: {
                salesRepId: rep.id,
              },
            },
            _sum: {
              total: true,
            },
          });

          const revenue = revenueResult._sum.total ?? 0;

          // Calculate revenue from same week last year
          const lastYearWeekRange = getSameWeekLastYear(weekStartDate, weekEndDate);
          const lastYearRevenueResult = await tx.order.aggregate({
            where: {
              tenantId: tenant.id,
              deliveredAt: {
                gte: lastYearWeekRange.start,
                lte: lastYearWeekRange.end,
              },
              customer: {
                salesRepId: rep.id,
              },
            },
            _sum: {
              total: true,
            },
          });

          const revenueLastYear = lastYearRevenueResult._sum.total ?? null;

          // Count unique customer orders this week
          const uniqueCustomerOrders = await tx.order.groupBy({
            by: ["customerId"],
            where: {
              tenantId: tenant.id,
              deliveredAt: {
                gte: weekStartDate,
                lte: weekEndDate,
              },
              customer: {
                salesRepId: rep.id,
              },
            },
          });

          // Count new customers added (first order delivered this week)
          const newCustomersAdded = await tx.order.count({
            where: {
              tenantId: tenant.id,
              deliveredAt: {
                gte: weekStartDate,
                lte: weekEndDate,
              },
              isFirstOrder: true,
              customer: {
                salesRepId: rep.id,
              },
            },
          });

          // Count dormant customers at end of week (45+ days since last order)
          const dormancyThreshold = new Date(weekEndDate);
          dormancyThreshold.setDate(dormancyThreshold.getDate() - 45);

          const dormantCustomersCount = await tx.customer.count({
            where: {
              tenantId: tenant.id,
              salesRepId: rep.id,
              isPermanentlyClosed: false,
              OR: [
                {
                  lastOrderDate: {
                    lt: dormancyThreshold,
                  },
                },
                {
                  lastOrderDate: null,
                  createdAt: {
                    lt: dormancyThreshold,
                  },
                },
              ],
            },
          });

          // Count reactivated customers (had an order this week after being dormant)
          const reactivatedCustomersCount = await tx.customer.count({
            where: {
              tenantId: tenant.id,
              salesRepId: rep.id,
              reactivatedDate: {
                gte: weekStartDate,
                lte: weekEndDate,
              },
            },
          });

          // Calculate delivery days in week based on rep's delivery day
          const deliveryDaysInWeek = calculateDeliveryDaysInWeek(
            rep.deliveryDay,
            weekStartDate,
            weekEndDate,
          );

          // Get activity type codes for counting
          const activityTypes = await tx.activityType.findMany({
            where: {
              tenantId: tenant.id,
            },
            select: {
              id: true,
              code: true,
            },
          });

          const activityTypeMap = new Map(activityTypes.map((at) => [at.code.toLowerCase(), at.id]));

          // Count activities by type during the week
          const activityCounts = await countActivitiesByType(
            tx,
            tenant.id,
            rep.id,
            weekStartDate,
            weekEndDate,
            activityTypeMap,
          );

          // Upsert the weekly metric record
          await tx.repWeeklyMetric.upsert({
            where: {
              tenantId_salesRepId_weekStartDate: {
                tenantId: tenant.id,
                salesRepId: rep.id,
                weekStartDate,
              },
            },
            update: {
              weekEndDate,
              revenue,
              revenueLastYear,
              uniqueCustomerOrders: uniqueCustomerOrders.length,
              newCustomersAdded,
              dormantCustomersCount,
              reactivatedCustomersCount,
              deliveryDaysInWeek,
              inPersonVisits: activityCounts.inPerson,
              tastingAppointments: activityCounts.tastings,
              emailContacts: activityCounts.emails,
              phoneContacts: activityCounts.phone,
              textContacts: activityCounts.text,
            },
            create: {
              tenantId: tenant.id,
              salesRepId: rep.id,
              weekStartDate,
              weekEndDate,
              revenue,
              revenueLastYear,
              uniqueCustomerOrders: uniqueCustomerOrders.length,
              newCustomersAdded,
              dormantCustomersCount,
              reactivatedCustomersCount,
              deliveryDaysInWeek,
              inPersonVisits: activityCounts.inPerson,
              tastingAppointments: activityCounts.tastings,
              emailContacts: activityCounts.emails,
              phoneContacts: activityCounts.phone,
              textContacts: activityCounts.text,
            },
          });

          console.log(
            `[weekly-metrics] ✓ ${rep.user.fullName}: $${revenue} revenue, ${uniqueCustomerOrders.length} customers, ${newCustomersAdded} new`,
          );
        } catch (error) {
          console.error(
            `[weekly-metrics] ✗ Error calculating metrics for rep ${rep.id} (${rep.user.fullName}):`,
            error,
          );
          // Continue processing other reps even if one fails
        }
      }

      console.log(
        `[weekly-metrics] Successfully aggregated metrics for ${salesReps.length} sales reps`,
      );
    });
  } catch (error) {
    console.error("[weekly-metrics] Fatal error during metrics aggregation:", error);
    throw error;
  } finally {
    if (disconnectAfterRun) {
      await prisma.$disconnect().catch(() => {
        // Ignore disconnect failures in job runner context
      });
    }
  }
}

/**
 * Get the previous week's date range (Monday to Sunday)
 * Uses ISO week standard where Monday is the first day of the week
 */
function getPreviousWeekRange(): {
  weekStartDate: Date;
  weekEndDate: Date;
  weekNumber: number;
  year: number;
} {
  const now = new Date();
  const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Calculate days to subtract to get to previous Monday
  // If today is Monday (1), go back 7 days
  // If today is Tuesday (2), go back 8 days, etc.
  const daysToSubtract = currentDayOfWeek === 0 ? 6 : currentDayOfWeek + 6;

  const weekStartDate = new Date(now);
  weekStartDate.setDate(now.getDate() - daysToSubtract);
  weekStartDate.setHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);
  weekEndDate.setHours(23, 59, 59, 999);

  const { weekNumber, year } = getISOWeek(weekStartDate);

  return {
    weekStartDate,
    weekEndDate,
    weekNumber,
    year,
  };
}

/**
 * Get ISO week number and year for a given date
 * ISO week starts on Monday and the first week of the year contains January 4th
 */
function getISOWeek(date: Date): { weekNumber: number; year: number } {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  // Set to nearest Thursday (current date + 4 - current day number)
  // Make Sunday's day number 7
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);

  // January 4 is always in week 1
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstThursdayDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstThursdayDayNr + 3);

  // Calculate week number
  const weekNumber = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + firstThursdayDayNr) / 7);

  // Get the year (might be different from calendar year for weeks at year boundaries)
  const year = target.getFullYear();

  return { weekNumber, year };
}

/**
 * Get the date range for the same week last year
 */
function getSameWeekLastYear(
  weekStartDate: Date,
  weekEndDate: Date,
): { start: Date; end: Date } {
  const start = new Date(weekStartDate);
  start.setFullYear(start.getFullYear() - 1);

  const end = new Date(weekEndDate);
  end.setFullYear(end.getFullYear() - 1);

  return { start, end };
}

/**
 * Calculate how many delivery days occurred in the given week based on the rep's delivery day
 * For example, if the rep delivers on Wednesdays and there are 1-2 Wednesdays in the week range
 */
function calculateDeliveryDaysInWeek(
  deliveryDay: string | null,
  weekStartDate: Date,
  weekEndDate: Date,
): number {
  if (!deliveryDay) {
    return 1; // Default to 1 if no delivery day specified
  }

  const dayNameMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetDayOfWeek = dayNameMap[deliveryDay.toLowerCase()];
  if (targetDayOfWeek === undefined) {
    return 1; // Default if delivery day is not recognized
  }

  let count = 0;
  const current = new Date(weekStartDate);

  while (current <= weekEndDate) {
    if (current.getDay() === targetDayOfWeek) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count || 1; // Minimum 1 delivery day
}

/**
 * Count activities by type for a sales rep during the specified week
 */
async function countActivitiesByType(
  tx: any,
  tenantId: string,
  salesRepId: string,
  weekStartDate: Date,
  weekEndDate: Date,
  activityTypeMap: Map<string, string>,
): Promise<{
  inPerson: number;
  tastings: number;
  emails: number;
  phone: number;
  text: number;
}> {
  // Get all activities for the rep's customers during the week
  const activities = await tx.activity.findMany({
    where: {
      tenantId,
      occurredAt: {
        gte: weekStartDate,
        lte: weekEndDate,
      },
      customer: {
        salesRepId,
      },
    },
    select: {
      activityTypeId: true,
    },
  });

  // Map activity type IDs to codes
  const activityTypeCodes = new Map<string, string>();
  for (const [code, id] of activityTypeMap.entries()) {
    activityTypeCodes.set(id, code);
  }

  // Count by type
  const counts = {
    inPerson: 0,
    tastings: 0,
    emails: 0,
    phone: 0,
    text: 0,
  };

  for (const activity of activities) {
    const code = activityTypeCodes.get(activity.activityTypeId)?.toLowerCase();

    if (!code) continue;

    // Map activity type codes to metric fields
    if (code.includes("visit") || code.includes("in-person") || code.includes("in_person")) {
      counts.inPerson++;
    } else if (code.includes("tasting")) {
      counts.tastings++;
    } else if (code.includes("email")) {
      counts.emails++;
    } else if (code.includes("phone") || code.includes("call")) {
      counts.phone++;
    } else if (code.includes("text") || code.includes("sms")) {
      counts.text++;
    }
  }

  return counts;
}

export default run;

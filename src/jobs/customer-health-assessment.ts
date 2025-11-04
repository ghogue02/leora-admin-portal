import { CustomerRiskStatus } from "@prisma/client";
import { prisma, withTenant } from "@/lib/prisma";
import { subDays } from "date-fns";

type RunOptions = {
  tenantId?: string;
  tenantSlug?: string;
  disconnectAfterRun?: boolean;
};

type CustomerWithOrders = {
  id: string;
  tenantId: string;
  name: string;
  riskStatus: CustomerRiskStatus;
  lastOrderDate: Date | null;
  nextExpectedOrderDate: Date | null;
  averageOrderIntervalDays: number | null;
  orderingPaceDays: number | null;
  establishedRevenue: any | null;
  dormancySince: Date | null;
  reactivatedDate: Date | null;
  isPermanentlyClosed: boolean;
  createdAt: Date;
  orders: Array<{
    id: string;
    deliveredAt: Date | null;
    total: any | null;
  }>;
  callPlanAccounts: Array<{
    callPlan: {
      status: string | null;
    };
    contactOutcome: string | null;
  }>;
  activities: Array<{
    occurredAt: Date;
  }>;
};

type CustomerHealthUpdate = {
  lastOrderDate?: Date;
  nextExpectedOrderDate?: Date;
  averageOrderIntervalDays?: number;
  orderingPaceDays?: number | null;
  riskStatus: CustomerRiskStatus;
  dormancySince?: Date | null;
  reactivatedDate?: Date | null;
};

const FALLBACK_CADENCE_DAYS = 45;
const GRACE_PERIOD_PERCENT = 0.3; // 30% buffer for cadence variance
const MIN_GRACE_DAYS = 7;
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90; // Customers ordering more than quarterly
const ABSOLUTE_DORMANT_DAYS = 90; // Hard cap: 90 days without order = dormant for all customers

/**
 * Daily Customer Health Assessment Job
 *
 * Runs daily to assess all customers' risk status based on:
 * - Days since last order
 *
 * SIMPLIFIED Business Rules:
 * - HEALTHY: Last order within 45 days
 * - DORMANT: 45+ days since last order
 *
 * Tracks reactivations when dormant customers place new orders.
 */
export async function run(options: RunOptions = {}) {
  const { tenantId: explicitTenantId, tenantSlug: explicitTenantSlug } = options;
  const disconnectAfterRun = options.disconnectAfterRun ?? true;

  const startTime = Date.now();
  console.log("[customer-health-assessment] Starting daily customer health assessment...");

  try {
    // Determine which tenant to process
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
        `[customer-health-assessment] Tenant lookup failed for selector ${JSON.stringify(tenantSelector)}. Skipping assessment.`,
      );
      return;
    }

    console.log(`[customer-health-assessment] Processing tenant: ${tenant.name ?? tenant.slug}`);

    // Fetch all active customers with their recent orders
    const customers = await withTenant(tenant.id, async (tx) => {
      return tx.customer.findMany({
        where: {
          tenantId: tenant.id,
          isPermanentlyClosed: false,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          riskStatus: true,
          lastOrderDate: true,
          nextExpectedOrderDate: true,
          averageOrderIntervalDays: true,
          orderingPaceDays: true,
          establishedRevenue: true,
          dormancySince: true,
          reactivatedDate: true,
          isPermanentlyClosed: true,
          createdAt: true,
          orders: {
            where: {
              deliveredAt: { not: null },
            },
            select: {
              id: true,
              deliveredAt: true,
              total: true,
            },
            orderBy: {
              deliveredAt: "desc",
            },
            take: 10, // Get last 10 orders for analysis
          },
          callPlanAccounts: {
            select: {
              callPlan: {
                select: {
                  status: true,
                },
              },
              contactOutcome: true,
            },
          },
          activities: {
            where: {
              occurredAt: {
                gte: subDays(new Date(), 30), // Last 30 days
              },
            },
            select: {
              occurredAt: true,
            },
          },
        },
      });
    }) as CustomerWithOrders[];

    console.log(`[customer-health-assessment] Analyzing ${customers.length} active customers...`);

    let updatedCount = 0;
    let healthyCount = 0;
    let dormantCount = 0;
    let reactivatedCount = 0;

    // Process in batches to avoid transaction timeout (500 customers at a time)
    const BATCH_SIZE = 500;
    const totalBatches = Math.ceil(customers.length / BATCH_SIZE);
    let prospectCount = 0;
    let prospectColdCount = 0;
    let atRiskRevenueCount = 0;
    let atRiskCadenceCount = 0;
    let unqualifiedCount = 0;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, customers.length);
      const batch = customers.slice(start, end);

      console.log(`[customer-health-assessment] Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} customers)...`);

      await withTenant(tenant.id, async (tx) => {
        for (const customer of batch) {
          try {
            const healthUpdate = await assessCustomerHealth(customer);

          if (healthUpdate) {
            await tx.customer.update({
              where: { id: customer.id },
              data: healthUpdate,
            });

            updatedCount++;

            // Track statistics
            switch (healthUpdate.riskStatus) {
              case CustomerRiskStatus.HEALTHY:
                healthyCount++;
                break;
              case CustomerRiskStatus.DORMANT:
                dormantCount++;
                break;
              case CustomerRiskStatus.PROSPECT:
                prospectCount++;
                break;
              case CustomerRiskStatus.PROSPECT_COLD:
                prospectColdCount++;
                break;
              case CustomerRiskStatus.AT_RISK_REVENUE:
                atRiskRevenueCount++;
                break;
              case CustomerRiskStatus.AT_RISK_CADENCE:
                atRiskCadenceCount++;
                break;
              case CustomerRiskStatus.UNQUALIFIED:
                unqualifiedCount++;
                break;
            }

            // Track reactivations (was dormant, now healthy)
            if (
              customer.dormancySince &&
              healthUpdate.riskStatus === CustomerRiskStatus.HEALTHY &&
              healthUpdate.reactivatedDate
            ) {
              reactivatedCount++;
            }
          }
        } catch (error) {
          console.error(
            `[customer-health-assessment] Error processing customer ${customer.id} (${customer.name}):`,
            error,
          );
          // Continue processing other customers
        }
        }
      });
    }

    const duration = Date.now() - startTime;
    console.log(
      `[customer-health-assessment] Assessment complete for ${tenant.name ?? tenant.slug}:`,
    );
    console.log(`  - Total customers analyzed: ${customers.length}`);
    console.log(`  - Customers updated: ${updatedCount}`);
    console.log(`  - Healthy: ${healthyCount}`);
    console.log(`  - At Risk (Cadence): ${atRiskCadenceCount}`);
    console.log(`  - At Risk (Revenue): ${atRiskRevenueCount}`);
    console.log(`  - Dormant: ${dormantCount}`);
    console.log(`  - Prospects (< 90 days, active): ${prospectCount}`);
    console.log(`  - Cold Leads (90+ days, active): ${prospectColdCount}`);
    console.log(`  - Unqualified (abandoned): ${unqualifiedCount}`);
    console.log(`  - Reactivated: ${reactivatedCount}`);
    console.log(`  - Duration: ${duration}ms`);
  } catch (error) {
    console.error("[customer-health-assessment] Job failed:", error);
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
 * Assess a single customer's health status
 * Returns update object if status changed, null if no update needed
 */
async function assessCustomerHealth(
  customer: CustomerWithOrders,
): Promise<CustomerHealthUpdate | null> {
  const now = new Date();

  // Get delivered orders only (revenue recognition on delivery)
  const deliveredOrders = customer.orders
    .filter((order) => order.deliveredAt !== null)
    .sort((a, b) => b.deliveredAt!.getTime() - a.deliveredAt!.getTime());

  // If customer has NO orders, classify based on prospecting activity
  if (deliveredOrders.length === 0) {
    const daysSinceCreated = differenceInDays(now, customer.createdAt);

    // Check if customer is being actively prospected
    const isInActiveCallPlan = customer.callPlanAccounts.some(
      (cpa) => cpa.callPlan.status === 'ACTIVE' && cpa.contactOutcome !== 'NOT_INTERESTED'
    );

    const hasRecentActivity = customer.activities.length > 0; // Any activity in last 30 days

    // Determine prospect status based on engagement
    let newStatus: CustomerRiskStatus;

    // Check if being actively worked (call plan OR recent activity)
    const isActivelyWorked = isInActiveCallPlan || hasRecentActivity;

    if (isActivelyWorked) {
      // Real prospect - being actively prospected
      newStatus = daysSinceCreated < 90
        ? CustomerRiskStatus.PROSPECT
        : CustomerRiskStatus.PROSPECT_COLD;
    } else if (daysSinceCreated > 180) {
      // Abandoned - no engagement for 180+ days
      newStatus = CustomerRiskStatus.UNQUALIFIED;
    } else if (daysSinceCreated > 90) {
      // Cold lead - no engagement for 90+ days
      newStatus = CustomerRiskStatus.PROSPECT_COLD;
    } else {
      // Recent account but no engagement yet - still cold until worked
      // Default to PROSPECT_COLD (not PROSPECT) since not being actively prospected
      newStatus = CustomerRiskStatus.PROSPECT_COLD;
    }

    // Only update if status changed
    if (customer.riskStatus === newStatus) {
      return null;
    }

    return {
      riskStatus: newStatus,
      dormancySince: null, // Prospects aren't "dormant"
      lastOrderDate: undefined,
      nextExpectedOrderDate: undefined,
      averageOrderIntervalDays: undefined,
    };
  }

  // Calculate ordering pace from last 5 orders
  const orderingPace = calculateOrderingPace(deliveredOrders);
  const lastOrderDate = deliveredOrders[0].deliveredAt!;

  // Determine cadence baseline and grace period with caps for infrequent orderers
  const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
  const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;

  // Cap cadence for infrequent orderers (prevents 300+ day thresholds for annual orderers)
  const cadenceBaseline = isInfrequentOrderer
    ? 60  // Infrequent orderers: cap at 60 days
    : Math.max(rawCadence, FALLBACK_CADENCE_DAYS); // Frequent orderers: use their pace (min 45 days)

  const gracePeriod = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
  const calculatedThreshold = cadenceBaseline + gracePeriod;

  // Enforce absolute maximum: no customer waits more than 90 days before being marked dormant
  const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);

  // Determine next expected order date based on cadence baseline
  const nextExpectedOrderDate = addDays(lastOrderDate, cadenceBaseline);

  // Calculate days since last order
  const daysSinceLastOrder = differenceInDays(now, lastOrderDate);

  // Check for revenue decline (AT_RISK_REVENUE)
  const revenueMetrics = calculateRevenueMetrics(deliveredOrders, customer.establishedRevenue);

  // Determine risk status based on cadence-aware rules and revenue trends
  // PRIORITY ORDER: Cadence (time-based urgency) BEFORE Revenue (trend-based)
  let newRiskStatus: CustomerRiskStatus;
  let newDormancySince: Date | null = customer.dormancySince;
  let newReactivatedDate: Date | null = customer.reactivatedDate;

  if (daysSinceLastOrder >= dormantThreshold) {
    // Priority 1: Beyond cadence + grace = dormant (most urgent)
    newRiskStatus = CustomerRiskStatus.DORMANT;
    if (!customer.dormancySince) {
      newDormancySince = now;
      newReactivatedDate = null;
    }
  } else if (daysSinceLastOrder >= cadenceBaseline) {
    // Priority 2: Outside cadence but within grace = at-risk cadence (time-sensitive)
    newRiskStatus = CustomerRiskStatus.AT_RISK_CADENCE;
  } else if (revenueMetrics.isRevenueDeclined) {
    // Priority 3: Within cadence window but revenue declining (trend issue)
    newRiskStatus = CustomerRiskStatus.AT_RISK_REVENUE;
  } else {
    // Priority 4: Ordering on time with normal revenue = healthy
    newRiskStatus = CustomerRiskStatus.HEALTHY;

    // Check if was previously dormant for reactivation tracking
    if (customer.dormancySince) {
      newReactivatedDate = now;
      newDormancySince = null;
    }
  }

  // Check if anything actually changed
  const hasChanges =
    customer.riskStatus !== newRiskStatus ||
    customer.lastOrderDate?.getTime() !== lastOrderDate.getTime() ||
    customer.nextExpectedOrderDate?.getTime() !== nextExpectedOrderDate?.getTime() ||
    customer.averageOrderIntervalDays !== orderingPace.averageIntervalDays ||
    customer.orderingPaceDays !== cadenceBaseline ||
    customer.dormancySince?.getTime() !== newDormancySince?.getTime() ||
    customer.reactivatedDate?.getTime() !== newReactivatedDate?.getTime();

  if (!hasChanges) {
    return null;
  }

  return {
    lastOrderDate,
    nextExpectedOrderDate: nextExpectedOrderDate ?? undefined,
    averageOrderIntervalDays: orderingPace.averageIntervalDays ?? undefined,
    orderingPaceDays: cadenceBaseline,
    riskStatus: newRiskStatus,
    dormancySince: newDormancySince,
    reactivatedDate: newReactivatedDate,
  };
}

/**
 * Calculate ordering pace from recent orders
 * Uses last 5 orders to determine average interval
 */
function calculateOrderingPace(orders: Array<{ deliveredAt: Date | null }>) {
  if (orders.length < 2) {
    return { averageIntervalDays: null };
  }

  // Use last 5 orders for pace calculation (or all if less than 5)
  const recentOrders = orders.slice(0, Math.min(5, orders.length));
  const intervals: number[] = [];

  for (let i = 0; i < recentOrders.length - 1; i++) {
    const current = recentOrders[i].deliveredAt;
    const next = recentOrders[i + 1].deliveredAt;

    if (current && next) {
      const interval = differenceInDays(current, next);
      if (interval > 0) {
        intervals.push(interval);
      }
    }
  }

  if (intervals.length === 0) {
    return { averageIntervalDays: null };
  }

  // Calculate mean interval
  const sum = intervals.reduce((acc, val) => acc + val, 0);
  const averageIntervalDays = Math.round(sum / intervals.length);

  return { averageIntervalDays };
}

/**
 * Calculate revenue metrics to detect declining revenue
 * Compares recent revenue to established baseline
 */
function calculateRevenueMetrics(
  orders: Array<{ total: any | null }>,
  establishedRevenue: any | null,
) {
  if (!establishedRevenue || orders.length === 0) {
    return { isRevenueDeclined: false };
  }

  // Calculate recent average (last 3 orders)
  const recentOrders = orders.slice(0, Math.min(3, orders.length));
  const recentTotals = recentOrders
    .map((order) => (order.total ? parseFloat(order.total.toString()) : 0))
    .filter((total) => total > 0);

  if (recentTotals.length === 0) {
    return { isRevenueDeclined: false };
  }

  const recentAverage = recentTotals.reduce((acc, val) => acc + val, 0) / recentTotals.length;
  const establishedAmount = parseFloat(establishedRevenue.toString());

  // Check if recent average is 15% or more below established average
  const threshold = establishedAmount * 0.85; // 15% decline threshold
  const isRevenueDeclined = recentAverage < threshold;

  return { isRevenueDeclined };
}

/**
 * Calculate difference in days between two dates
 */
function differenceInDays(date1: Date, date2: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = date1.getTime() - date2.getTime();
  return Math.floor(diff / msPerDay);
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default run;

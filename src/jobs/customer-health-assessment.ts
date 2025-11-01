import { CustomerRiskStatus } from "@prisma/client";
import { prisma, withTenant } from "@/lib/prisma";

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
  orders: Array<{
    id: string;
    deliveredAt: Date | null;
    total: any | null;
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
        },
      });
    }) as CustomerWithOrders[];

    console.log(`[customer-health-assessment] Analyzing ${customers.length} active customers...`);

    let updatedCount = 0;
    let healthyCount = 0;
    let dormantCount = 0;
    let reactivatedCount = 0;

    // Process each customer
    await withTenant(tenant.id, async (tx) => {
      for (const customer of customers) {
        try {
          const healthUpdate = await assessCustomerHealth(customer);

          if (healthUpdate) {
            await tx.customer.update({
              where: { id: customer.id },
              data: healthUpdate,
            });

            updatedCount++;

            // Track statistics
            if (healthUpdate.riskStatus === CustomerRiskStatus.DORMANT) {
              dormantCount++;
            } else if (healthUpdate.riskStatus === CustomerRiskStatus.HEALTHY) {
              healthyCount++;
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

    const duration = Date.now() - startTime;
    console.log(
      `[customer-health-assessment] Assessment complete for ${tenant.name ?? tenant.slug}:`,
    );
    console.log(`  - Total customers analyzed: ${customers.length}`);
    console.log(`  - Customers updated: ${updatedCount}`);
    console.log(`  - Healthy (< 45 days): ${healthyCount}`);
    console.log(`  - Dormant (45+ days): ${dormantCount}`);
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

  // If customer has NO orders, mark as DORMANT
  if (deliveredOrders.length === 0) {
    const newStatus = CustomerRiskStatus.DORMANT;

    // Only update if status changed
    if (customer.riskStatus === newStatus) {
      return null;
    }

    return {
      riskStatus: newStatus,
      dormancySince: customer.dormancySince || now,
      lastOrderDate: undefined,
      nextExpectedOrderDate: undefined,
      averageOrderIntervalDays: undefined,
    };
  }

  // Calculate ordering pace from last 5 orders
  const orderingPace = calculateOrderingPace(deliveredOrders);
  const lastOrderDate = deliveredOrders[0].deliveredAt!;

  // Determine cadence baseline and grace period
  const cadenceBaseline = Math.max(orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS, FALLBACK_CADENCE_DAYS);
  const gracePeriod = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
  const dormantThreshold = cadenceBaseline + gracePeriod;

  // Determine next expected order date based on cadence baseline
  const nextExpectedOrderDate = addDays(lastOrderDate, cadenceBaseline);

  // Calculate days since last order
  const daysSinceLastOrder = differenceInDays(now, lastOrderDate);

  // Determine risk status based on cadence-aware rules
  let newRiskStatus: CustomerRiskStatus;
  let newDormancySince: Date | null = customer.dormancySince;
  let newReactivatedDate: Date | null = customer.reactivatedDate;

  if (daysSinceLastOrder >= dormantThreshold) {
    // Beyond cadence + grace: dormant
    newRiskStatus = CustomerRiskStatus.DORMANT;
    if (!customer.dormancySince) {
      newDormancySince = now;
      newReactivatedDate = null;
    }
  } else if (daysSinceLastOrder >= cadenceBaseline) {
    // Outside cadence but within grace: at-risk cadence
    newRiskStatus = CustomerRiskStatus.AT_RISK_CADENCE;
  } else {
    // Within cadence window: healthy
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

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
  riskStatus: CustomerRiskStatus;
  dormancySince?: Date | null;
  reactivatedDate?: Date | null;
};

/**
 * Daily Customer Health Assessment Job
 *
 * Runs daily to assess all customers' risk status based on:
 * - Ordering pace (average interval between last 5 orders)
 * - Next expected order date
 * - Revenue trends
 * - Dormancy detection (45+ days since expected order)
 *
 * Business Rules (from claude-plan.md):
 * - DORMANT: 45+ days since expected order
 * - AT_RISK_CADENCE: Past expected order date by 1+ days
 * - AT_RISK_REVENUE: Recent revenue 15% below established average
 * - HEALTHY: Otherwise
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
    let dormantCount = 0;
    let atRiskCadenceCount = 0;
    let atRiskRevenueCount = 0;
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
            } else if (healthUpdate.riskStatus === CustomerRiskStatus.AT_RISK_CADENCE) {
              atRiskCadenceCount++;
            } else if (healthUpdate.riskStatus === CustomerRiskStatus.AT_RISK_REVENUE) {
              atRiskRevenueCount++;
            }

            // Track reactivations (was dormant, now not)
            if (
              customer.dormancySince &&
              healthUpdate.riskStatus !== CustomerRiskStatus.DORMANT &&
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
    console.log(`  - Dormant: ${dormantCount}`);
    console.log(`  - At Risk (Cadence): ${atRiskCadenceCount}`);
    console.log(`  - At Risk (Revenue): ${atRiskRevenueCount}`);
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

  // Skip customers with no orders
  if (customer.orders.length === 0) {
    return null;
  }

  // Get delivered orders only (revenue recognition on delivery)
  const deliveredOrders = customer.orders
    .filter((order) => order.deliveredAt !== null)
    .sort((a, b) => b.deliveredAt!.getTime() - a.deliveredAt!.getTime());

  if (deliveredOrders.length === 0) {
    return null;
  }

  // Calculate ordering pace from last 5 orders
  const orderingPace = calculateOrderingPace(deliveredOrders);
  const lastOrderDate = deliveredOrders[0].deliveredAt!;

  // Determine next expected order date
  const nextExpectedOrderDate = orderingPace.averageIntervalDays
    ? addDays(lastOrderDate, orderingPace.averageIntervalDays)
    : null;

  // Calculate days since expected order
  const daysSinceExpected = nextExpectedOrderDate
    ? differenceInDays(now, nextExpectedOrderDate)
    : 0;

  // Calculate revenue metrics
  const revenueMetrics = calculateRevenueMetrics(deliveredOrders, customer.establishedRevenue);

  // Determine risk status based on business rules
  let newRiskStatus: CustomerRiskStatus;
  let newDormancySince: Date | null = customer.dormancySince;
  let newReactivatedDate: Date | null = customer.reactivatedDate;

  // Priority order: DORMANT > AT_RISK_CADENCE > AT_RISK_REVENUE > HEALTHY
  if (daysSinceExpected >= 45) {
    // Rule 1: 45+ days since expected order = DORMANT
    newRiskStatus = CustomerRiskStatus.DORMANT;
    if (!customer.dormancySince) {
      newDormancySince = now;
      newReactivatedDate = null;
    }
  } else {
    // Not dormant, so check if was previously dormant for reactivation
    if (customer.dormancySince) {
      newReactivatedDate = now;
      newDormancySince = null;
    }

    if (daysSinceExpected >= 1) {
      // Rule 2: Past expected order date by 1+ days = AT_RISK_CADENCE
      newRiskStatus = CustomerRiskStatus.AT_RISK_CADENCE;
    } else if (revenueMetrics.isRevenueDeclined) {
      // Rule 3: Recent revenue 15% below established average = AT_RISK_REVENUE
      newRiskStatus = CustomerRiskStatus.AT_RISK_REVENUE;
    } else {
      // Rule 4: Otherwise = HEALTHY
      newRiskStatus = CustomerRiskStatus.HEALTHY;
    }
  }

  // Check if anything actually changed
  const hasChanges =
    customer.riskStatus !== newRiskStatus ||
    customer.lastOrderDate?.getTime() !== lastOrderDate.getTime() ||
    customer.nextExpectedOrderDate?.getTime() !== nextExpectedOrderDate?.getTime() ||
    customer.averageOrderIntervalDays !== orderingPace.averageIntervalDays ||
    customer.dormancySince?.getTime() !== newDormancySince?.getTime() ||
    customer.reactivatedDate?.getTime() !== newReactivatedDate?.getTime();

  if (!hasChanges) {
    return null;
  }

  return {
    lastOrderDate,
    nextExpectedOrderDate: nextExpectedOrderDate ?? undefined,
    averageOrderIntervalDays: orderingPace.averageIntervalDays ?? undefined,
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

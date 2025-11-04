import { prisma } from "@/lib/prisma";
import { CustomerRiskStatus } from "@prisma/client";
import { getHealthThresholds } from "./thresholds";

/**
 * Real-time customer health updater
 * Triggers immediate health recalculation when order events occur
 */

type UpdateOptions = {
  includeRevenueCalc?: boolean;
  recalculateCadence?: boolean;
};

/**
 * Update customer health in real-time when an order is delivered
 * This provides immediate status updates without waiting for the daily batch job
 *
 * @param customerId - Customer ID to update
 * @param options - Update options
 */
export async function updateCustomerHealthRealtime(
  customerId: string,
  options: UpdateOptions = {}
): Promise<{
  success: boolean;
  previousStatus: CustomerRiskStatus;
  newStatus: CustomerRiskStatus;
  changed: boolean;
}> {
  const { includeRevenueCalc = true, recalculateCadence = true } = options;

  try {
    // Fetch customer with order history
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          where: {
            deliveredAt: { not: null },
          },
          orderBy: {
            deliveredAt: "desc",
          },
          take: 10, // Last 10 orders for calculations
          select: {
            id: true,
            total: true,
            deliveredAt: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    const previousStatus = customer.riskStatus;
    const now = new Date();

    // Get thresholds for this customer type/priority
    const thresholds = await getHealthThresholds(
      customer.tenantId,
      customer.accountType,
      customer.accountPriority
    );

    // If no orders, determine prospect status
    if (customer.orders.length === 0) {
      const daysSinceCreated = Math.floor(
        (now.getTime() - customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const newStatus = daysSinceCreated < 90
        ? CustomerRiskStatus.PROSPECT
        : CustomerRiskStatus.PROSPECT_COLD;

      if (previousStatus !== newStatus) {
        await prisma.customer.update({
          where: { id: customerId },
          data: { riskStatus: newStatus },
        });
      }

      return {
        success: true,
        previousStatus,
        newStatus,
        changed: previousStatus !== newStatus,
      };
    }

    // Calculate ordering cadence from last 5 orders
    const deliveredOrders = customer.orders;
    const orderDates = deliveredOrders.map((o) => o.deliveredAt!.getTime()).sort((a, b) => b - a);

    const intervals: number[] = [];
    for (let i = 0; i < Math.min(orderDates.length - 1, 5); i++) {
      const daysDiff = Math.floor((orderDates[i] - orderDates[i + 1]) / (1000 * 60 * 60 * 24));
      intervals.push(daysDiff);
    }

    const averageIntervalDays = intervals.length > 0
      ? Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length)
      : thresholds.dormantDays;

    const cadenceBaseline = Math.max(averageIntervalDays, thresholds.dormantDays);
    const gracePeriod = Math.max(
      Math.round(cadenceBaseline * thresholds.gracePeriodPercent),
      thresholds.minGraceDays
    );
    const dormantThreshold = cadenceBaseline + gracePeriod;

    const lastOrderDate = new Date(orderDates[0]);
    const daysSinceLastOrder = Math.floor(
      (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const nextExpectedOrderDate = new Date(lastOrderDate);
    nextExpectedOrderDate.setDate(nextExpectedOrderDate.getDate() + cadenceBaseline);

    // Determine new health status
    let newStatus: CustomerRiskStatus;
    let dormancySince: Date | null = customer.dormancySince;
    let reactivatedDate: Date | null = customer.reactivatedDate;

    // Check for revenue decline if enabled
    let isRevenueDeclined = false;
    if (includeRevenueCalc && customer.establishedRevenue) {
      const recentOrders = deliveredOrders.slice(0, 3);
      const recentAvg = recentOrders.reduce((sum, o) => sum + Number(o.total || 0), 0) / recentOrders.length;
      const establishedAmount = Number(customer.establishedRevenue);
      const revenueThreshold = establishedAmount * (1 - thresholds.revenueDeclinePercent);
      isRevenueDeclined = recentAvg < revenueThreshold;
    }

    // Priority order: Revenue decline → Dormant → At Risk (Cadence) → Healthy
    if (isRevenueDeclined && daysSinceLastOrder < dormantThreshold) {
      newStatus = CustomerRiskStatus.AT_RISK_REVENUE;
    } else if (daysSinceLastOrder >= dormantThreshold) {
      newStatus = CustomerRiskStatus.DORMANT;
      if (!dormancySince) {
        dormancySince = now;
        reactivatedDate = null;
      }
    } else if (daysSinceLastOrder >= cadenceBaseline) {
      newStatus = CustomerRiskStatus.AT_RISK_CADENCE;
    } else {
      newStatus = CustomerRiskStatus.HEALTHY;
      if (dormancySince) {
        reactivatedDate = now;
        dormancySince = null;
      }
    }

    // Update customer if status changed or recalculating cadence
    const hasChanges =
      previousStatus !== newStatus ||
      recalculateCadence ||
      customer.lastOrderDate?.getTime() !== lastOrderDate.getTime();

    if (hasChanges) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          riskStatus: newStatus,
          lastOrderDate,
          nextExpectedOrderDate,
          averageOrderIntervalDays,
          orderingPaceDays: cadenceBaseline,
          dormancySince,
          reactivatedDate,
        },
      });
    }

    return {
      success: true,
      previousStatus,
      newStatus,
      changed: previousStatus !== newStatus,
    };
  } catch (error) {
    console.error("[Real-time Health Update Error]", error);
    return {
      success: false,
      previousStatus: CustomerRiskStatus.HEALTHY,
      newStatus: CustomerRiskStatus.HEALTHY,
      changed: false,
    };
  }
}

/**
 * Batch update customer health for multiple customers
 * Useful when orders are bulk-delivered or status changes affect multiple customers
 *
 * @param customerIds - Array of customer IDs to update
 * @param options - Update options
 */
export async function batchUpdateCustomerHealth(
  customerIds: string[],
  options: UpdateOptions = {}
): Promise<{
  success: boolean;
  updated: number;
  statusChanges: Array<{ customerId: string; from: CustomerRiskStatus; to: CustomerRiskStatus }>;
}> {
  const statusChanges: Array<{ customerId: string; from: CustomerRiskStatus; to: CustomerRiskStatus }> = [];
  let updated = 0;

  for (const customerId of customerIds) {
    const result = await updateCustomerHealthRealtime(customerId, options);
    if (result.success && result.changed) {
      statusChanges.push({
        customerId,
        from: result.previousStatus,
        to: result.newStatus,
      });
      updated++;
    }
  }

  return {
    success: true,
    updated,
    statusChanges,
  };
}

/**
 * Webhook handler for order delivery events
 * Automatically updates customer health when order status changes to DELIVERED
 */
export async function handleOrderDeliveryEvent(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        customer: {
          select: {
            accountPriority: true,
          },
        },
      },
    });

    if (!order || !order.customerId) {
      console.warn(`[Order Delivery Event] Order ${orderId} has no customer`);
      return;
    }

    // For A-tier customers, recalculate revenue metrics
    // For B/C-tier, skip revenue calc to save processing time
    const includeRevenueCalc = order.customer.accountPriority === "A_TIER";

    await updateCustomerHealthRealtime(order.customerId, {
      includeRevenueCalc,
      recalculateCadence: true,
    });

    console.log(`✅ [Real-time Health] Updated customer ${order.customerId} after order delivery`);
  } catch (error) {
    console.error("[Order Delivery Event Handler Error]", error);
  }
}

import { prisma } from "@/lib/prisma";
import type { AccountType } from "@prisma/client";

export interface SuggestedAccount {
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  territory: string | null;
  city: string | null;
  state: string | null;
  accountType: AccountType | null;
  establishedRevenue: number | null;
  daysSinceLastOrder: number | null;
  lastOrderDate: Date | null;
  averageOrderFrequency: number | null;
  totalOrders: number;
  score: number;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  recommendedDay: string | null;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

function calculateScore(params: {
  daysSinceLastOrder: number | null;
  establishedRevenue: number | null;
  totalOrders: number;
  averageFrequency: number | null;
  accountType: AccountType | null;
}): number {
  let score = 0;

  if (params.daysSinceLastOrder !== null) {
    if (params.daysSinceLastOrder >= 90) score += 40;
    else if (params.daysSinceLastOrder >= 60) score += 30;
    else if (params.daysSinceLastOrder >= 45) score += 20;
    else if (params.daysSinceLastOrder >= 30) score += 10;
  }

  if (params.establishedRevenue !== null) {
    if (params.establishedRevenue >= 50000) score += 30;
    else if (params.establishedRevenue >= 25000) score += 25;
    else if (params.establishedRevenue >= 10000) score += 20;
    else if (params.establishedRevenue >= 5000) score += 15;
    else if (params.establishedRevenue >= 1000) score += 10;
  }

  if (params.totalOrders >= 10) score += 15;
  else if (params.totalOrders >= 5) score += 10;
  else if (params.totalOrders >= 2) score += 5;

  if (params.averageFrequency !== null && params.averageFrequency <= 30) {
    score += 15;
  } else if (params.averageFrequency !== null && params.averageFrequency <= 60) {
    score += 10;
  }

  if (
    params.accountType === "ACTIVE" &&
    params.daysSinceLastOrder !== null &&
    params.daysSinceLastOrder >= 120
  ) {
    score += 10;
  }

  return Math.min(100, score);
}

function determineUrgency(
  score: number,
  accountType: AccountType | null,
): SuggestedAccount["urgency"] {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function generateReason(params: {
  daysSinceLastOrder: number | null;
  establishedRevenue: number | null;
  totalOrders: number;
  accountType: AccountType | null;
}): string {
  const parts: string[] = [];

  if (params.daysSinceLastOrder !== null) {
    if (params.daysSinceLastOrder >= 90) {
      parts.push(`No order in ${params.daysSinceLastOrder} days (90+ days)`);
    } else if (params.daysSinceLastOrder >= 60) {
      parts.push(`No order in ${params.daysSinceLastOrder} days (60-89 days)`);
    } else if (params.daysSinceLastOrder >= 45) {
      parts.push(`No order in ${params.daysSinceLastOrder} days (45-59 days)`);
    } else {
      parts.push(`No order in ${params.daysSinceLastOrder} days`);
    }
  }

  if (params.establishedRevenue !== null && params.establishedRevenue >= 5000) {
    parts.push(`$${(params.establishedRevenue / 1000).toFixed(1)}k established revenue`);
  }

  if (params.totalOrders >= 5) {
    parts.push(`${params.totalOrders} previous orders`);
  }

  if (params.accountType === "TARGET") {
    parts.push("Reactivation opportunity");
  }

  return parts.slice(0, 3).join(" • ") || "Potential opportunity";
}

export async function getSuggestedAccounts(
  tenantId: string,
  userId: string,
  options: {
    limit?: number;
    territory?: string | null;
    minScore?: number;
    excludeCustomerIds?: string[];
  } = {},
): Promise<SuggestedAccount[]> {
  const {
    limit = 20,
    territory = null,
    minScore = 40,
    excludeCustomerIds = [],
  } = options;

  const salesRep = await prisma.salesRep.findFirst({
    where: {
      tenantId,
      userId,
      isActive: true,
    },
    select: {
      territoryName: true,
    },
  });

  const targetTerritory = territory ?? salesRep?.territoryName ?? null;

  const customerWhere: any = {
    tenantId,
    isPermanentlyClosed: false,
    id: excludeCustomerIds.length ? { notIn: excludeCustomerIds } : undefined,
  };

  if (targetTerritory) {
    customerWhere.territory = targetTerritory;
  }

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    select: {
      id: true,
      name: true,
      accountNumber: true,
      territory: true,
      city: true,
      state: true,
      accountType: true,
      lastOrderDate: true,
      establishedRevenue: true,
      orders: {
        select: {
          id: true,
          orderedAt: true,
        },
        orderBy: {
          orderedAt: "desc",
        },
        take: 50,
      },
    },
    take: 500,
  });

  const suggestions: SuggestedAccount[] = [];

  for (const customer of customers) {
    const establishedRevenue = customer.establishedRevenue
      ? Number(customer.establishedRevenue)
      : null;

    const orderDates = customer.orders
      .map((order) => order.orderedAt)
      .filter((date): date is Date => Boolean(date));

    const lastOrderDate = customer.lastOrderDate ?? orderDates.at(0) ?? null;
    const daysSinceLastOrder = lastOrderDate
      ? Math.floor((Date.now() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (daysSinceLastOrder !== null && daysSinceLastOrder < 30) {
      continue;
    }

    let averageFrequency: number | null = null;
    if (orderDates.length >= 2) {
      const sorted = orderDates.map((date) => date.getTime()).sort((a, b) => b - a);
      const intervals: number[] = [];
      for (let i = 0; i < sorted.length - 1; i += 1) {
        intervals.push((sorted[i] - sorted[i + 1]) / (1000 * 60 * 60 * 24));
      }
      averageFrequency =
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    const score = calculateScore({
      daysSinceLastOrder,
      establishedRevenue,
      totalOrders: orderDates.length,
      averageFrequency,
      accountType: customer.accountType,
    });

    if (score < minScore) {
      continue;
    }

    const urgency = determineUrgency(score, customer.accountType);
    const reason = generateReason({
      daysSinceLastOrder,
      establishedRevenue,
      totalOrders: orderDates.length,
      accountType: customer.accountType,
    });

    let priority: "HIGH" | "MEDIUM" | "LOW";
    if (score >= 70) priority = "HIGH";
    else if (score >= 50) priority = "MEDIUM";
    else priority = "LOW";

    suggestions.push({
      customerId: customer.id,
      customerName: customer.name,
      accountNumber: customer.accountNumber,
      territory: customer.territory,
      city: customer.city,
      state: customer.state,
      accountType: customer.accountType,
      establishedRevenue,
      daysSinceLastOrder,
      lastOrderDate,
      averageOrderFrequency: averageFrequency,
      totalOrders: orderDates.length,
      score,
      reason,
      priority,
      recommendedDay: null,
      urgency,
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions.slice(0, limit);
}

export async function getSuggestedAccountsWithDays(
  tenantId: string,
  userId: string,
  callPlanId: string | null,
  options: {
    limit?: number;
    territory?: string | null;
    minScore?: number;
    excludeCustomerIds?: string[];
  } = {},
): Promise<SuggestedAccount[]> {
  const suggestions = await getSuggestedAccounts(tenantId, userId, options);

  if (callPlanId) {
    const territoryBlocks = await prisma.territoryBlock.findMany({
      where: {
        tenantId,
        callPlanId,
      },
      select: {
        territory: true,
        dayOfWeek: true,
      },
    });

    const territoryToDay = new Map<string, number>();
    territoryBlocks.forEach((block) => {
      territoryToDay.set(block.territory, block.dayOfWeek);
    });

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    suggestions.forEach((suggestion) => {
      if (!suggestion.territory) return;
      const dayOfWeek = territoryToDay.get(suggestion.territory);
      if (typeof dayOfWeek === "number") {
        const index = dayOfWeek % 7;
        suggestion.recommendedDay = dayNames[index] ?? null;
      }
    });
  }

  return suggestions;
}

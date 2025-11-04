import { AccountType, AccountPriority } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Threshold configuration for customer health assessment
 */
export type HealthThresholdConfig = {
  dormantDays: number;
  gracePeriodPercent: number;
  revenueDeclinePercent: number;
  minGraceDays: number;
};

/**
 * Default thresholds used when no specific configuration exists
 */
const DEFAULT_THRESHOLDS: HealthThresholdConfig = {
  dormantDays: 45,
  gracePeriodPercent: 0.30, // 30%
  revenueDeclinePercent: 0.15, // 15%
  minGraceDays: 7,
};

/**
 * In-memory cache for threshold configurations
 * Key format: "tenantId:accountType:accountPriority"
 */
const thresholdCache = new Map<string, HealthThresholdConfig>();

/**
 * Get health thresholds for a specific customer
 *
 * Priority order:
 * 1. Exact match (tenantId + accountType + accountPriority)
 * 2. Type-specific (tenantId + accountType + null priority)
 * 3. Priority-specific (tenantId + null type + accountPriority)
 * 4. Tenant default (tenantId + null type + null priority)
 * 5. Global default (hardcoded constants)
 *
 * @param tenantId - Tenant ID
 * @param accountType - Customer account type (optional)
 * @param accountPriority - Customer account priority (optional)
 * @returns HealthThresholdConfig object
 */
export async function getHealthThresholds(
  tenantId: string,
  accountType?: AccountType | null,
  accountPriority?: AccountPriority | null
): Promise<HealthThresholdConfig> {
  // Check cache first
  const cacheKey = `${tenantId}:${accountType || "null"}:${accountPriority || "null"}`;
  if (thresholdCache.has(cacheKey)) {
    return thresholdCache.get(cacheKey)!;
  }

  // Query database for matching threshold configurations
  // Try to find the most specific match
  const thresholds = await prisma.healthThreshold.findMany({
    where: {
      tenantId,
      OR: [
        // Exact match
        { accountType, accountPriority },
        // Type-specific, any priority
        { accountType, accountPriority: null },
        // Priority-specific, any type
        { accountType: null, accountPriority },
        // Tenant default
        { accountType: null, accountPriority: null },
      ],
    },
    orderBy: [
      // Order by specificity (most specific first)
      { accountType: { sort: "asc", nulls: "last" } },
      { accountPriority: { sort: "asc", nulls: "last" } },
    ],
  });

  // Select the most specific configuration
  let config: HealthThresholdConfig = DEFAULT_THRESHOLDS;

  if (thresholds.length > 0) {
    const threshold = thresholds[0]; // Most specific match
    config = {
      dormantDays: threshold.dormantDays,
      gracePeriodPercent: parseFloat(threshold.gracePeriodPercent.toString()),
      revenueDeclinePercent: parseFloat(threshold.revenueDeclinePercent.toString()),
      minGraceDays: threshold.minGraceDays,
    };
  }

  // Cache the result
  thresholdCache.set(cacheKey, config);

  return config;
}

/**
 * Clear the threshold cache
 * Should be called when threshold configurations are updated
 */
export function clearThresholdCache(tenantId?: string) {
  if (tenantId) {
    // Clear only entries for specific tenant
    for (const key of thresholdCache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        thresholdCache.delete(key);
      }
    }
  } else {
    // Clear all cache
    thresholdCache.clear();
  }
}

/**
 * Seed default thresholds for a tenant
 * Creates recommended threshold configurations for different customer tiers
 */
export async function seedDefaultThresholds(tenantId: string) {
  const defaultConfigs = [
    // A-tier On-Premise: Tightest monitoring
    {
      accountType: AccountType.ON_PREMISE,
      accountPriority: AccountPriority.A_TIER,
      dormantDays: 30,
      gracePeriodPercent: 0.20, // 20%
      revenueDeclinePercent: 0.10, // 10%
      minGraceDays: 5,
    },
    // A-tier Off-Premise: Slightly more lenient
    {
      accountType: AccountType.OFF_PREMISE,
      accountPriority: AccountPriority.A_TIER,
      dormantDays: 35,
      gracePeriodPercent: 0.25, // 25%
      revenueDeclinePercent: 0.12, // 12%
      minGraceDays: 7,
    },
    // B-tier On-Premise: Moderate monitoring
    {
      accountType: AccountType.ON_PREMISE,
      accountPriority: AccountPriority.B_TIER,
      dormantDays: 45,
      gracePeriodPercent: 0.30, // 30%
      revenueDeclinePercent: 0.15, // 15%
      minGraceDays: 7,
    },
    // B-tier Off-Premise
    {
      accountType: AccountType.OFF_PREMISE,
      accountPriority: AccountPriority.B_TIER,
      dormantDays: 50,
      gracePeriodPercent: 0.35, // 35%
      revenueDeclinePercent: 0.15, // 15%
      minGraceDays: 7,
    },
    // C-tier On-Premise: Relaxed monitoring
    {
      accountType: AccountType.ON_PREMISE,
      accountPriority: AccountPriority.C_TIER,
      dormantDays: 60,
      gracePeriodPercent: 0.40, // 40%
      revenueDeclinePercent: 0.20, // 20%
      minGraceDays: 7,
    },
    // C-tier Off-Premise
    {
      accountType: AccountType.OFF_PREMISE,
      accountPriority: AccountPriority.C_TIER,
      dormantDays: 70,
      gracePeriodPercent: 0.45, // 45%
      revenueDeclinePercent: 0.20, // 20%
      minGraceDays: 7,
    },
    // Tenant default (for customers without type/priority)
    {
      accountType: null,
      accountPriority: null,
      dormantDays: 45,
      gracePeriodPercent: 0.30, // 30%
      revenueDeclinePercent: 0.15, // 15%
      minGraceDays: 7,
    },
  ];

  // Create all default configurations
  for (const config of defaultConfigs) {
    // Check if threshold already exists
    const existing = await prisma.healthThreshold.findFirst({
      where: {
        tenantId,
        accountType: config.accountType,
        accountPriority: config.accountPriority,
      },
    });

    if (existing) {
      console.log(`   ⏭️  Skipping ${config.accountType || 'ALL'} ${config.accountPriority || 'ALL'} - already exists`);
      continue;
    }

    // Create new threshold
    await prisma.healthThreshold.create({
      data: {
        tenantId,
        ...config,
      },
    });
  }

  console.log(`✅ Seeded ${defaultConfigs.length} health threshold configurations for tenant ${tenantId}`);
}

/**
 * Example usage in customer health assessment:
 *
 * ```typescript
 * const thresholds = await getHealthThresholds(
 *   customer.tenantId,
 *   customer.accountType,
 *   customer.accountPriority
 * );
 *
 * const dormantThreshold = cadenceBaseline + Math.max(
 *   Math.round(cadenceBaseline * thresholds.gracePeriodPercent),
 *   thresholds.minGraceDays
 * );
 *
 * const revenueThreshold = establishedRevenue * (1 - thresholds.revenueDeclinePercent);
 * ```
 */

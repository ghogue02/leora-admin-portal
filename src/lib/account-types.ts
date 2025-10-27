/**
 * Account Type Management
 *
 * Shared service for updating customer account types based on order history
 *
 * Account Type Definitions:
 * - ACTIVE: Ordered within last 6 months
 * - TARGET: Ordered 6-12 months ago (reactivation candidates)
 * - PROSPECT: Never ordered or >12 months since last order
 *
 * State Transitions:
 * PROSPECT → TARGET (when first order placed 6-12 months ago)
 * TARGET → ACTIVE (when order placed or reactivated)
 * ACTIVE → TARGET (when 6 months pass without order)
 * TARGET → PROSPECT (when 12 months pass without order)
 */

import { PrismaClient, AccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AccountTypeUpdateResult = {
  tenantId: string;
  tenantSlug: string;
  active: number;
  target: number;
  prospect: number;
  total: number;
};

/**
 * Calculate date thresholds for account type classification
 */
function getDateThresholds() {
  const now = Date.now();
  const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

  return {
    sixMonthsAgo,
    twelveMonthsAgo,
  };
}

/**
 * Update account types for all customers in a tenant
 *
 * @param tenantId - Optional tenant ID to update (if not provided, updates all tenants)
 * @returns Array of results per tenant
 */
export async function updateAccountTypes(
  tenantId?: string,
): Promise<AccountTypeUpdateResult[]> {
  const tenants = tenantId
    ? [await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, slug: true } })]
    : await prisma.tenant.findMany({ select: { id: true, slug: true } });

  const results: AccountTypeUpdateResult[] = [];

  for (const tenant of tenants) {
    if (!tenant) continue;

    const { sixMonthsAgo, twelveMonthsAgo } = getDateThresholds();

    // Update ACTIVE: Ordered within last 6 months
    const activeCount = await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        lastOrderDate: {
          gte: sixMonthsAgo,
        },
        accountType: { not: AccountType.ACTIVE },
      },
      data: { accountType: AccountType.ACTIVE },
    });

    // Update TARGET: Ordered 6-12 months ago (reactivation candidates)
    const targetCount = await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        lastOrderDate: {
          gte: twelveMonthsAgo,
          lt: sixMonthsAgo,
        },
        accountType: { not: AccountType.TARGET },
      },
      data: { accountType: AccountType.TARGET },
    });

    // Update PROSPECT: Never ordered or >12 months ago
    const prospectCount = await prisma.customer.updateMany({
      where: {
        tenantId: tenant.id,
        OR: [
          { lastOrderDate: null },
          {
            lastOrderDate: {
              lt: twelveMonthsAgo,
            },
          },
        ],
        accountType: { not: AccountType.PROSPECT },
      },
      data: { accountType: AccountType.PROSPECT },
    });

    // Get final counts
    const [active, target, prospect] = await Promise.all([
      prisma.customer.count({
        where: { tenantId: tenant.id, accountType: AccountType.ACTIVE },
      }),
      prisma.customer.count({
        where: { tenantId: tenant.id, accountType: AccountType.TARGET },
      }),
      prisma.customer.count({
        where: { tenantId: tenant.id, accountType: AccountType.PROSPECT },
      }),
    ]);

    const result = {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      active,
      target,
      prospect,
      total: active + target + prospect,
    };

    results.push(result);

    console.log(
      `✅ Account types updated for ${tenant.slug}:`,
      `ACTIVE=${active}, TARGET=${target}, PROSPECT=${prospect}`,
      `(${activeCount.count} → ACTIVE, ${targetCount.count} → TARGET, ${prospectCount.count} → PROSPECT)`,
    );
  }

  return results;
}

/**
 * Update account type for a single customer based on their order history
 * Called after order creation to immediately reflect new activity
 *
 * @param customerId - Customer to update
 */
export async function updateCustomerAccountType(customerId: string): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      tenantId: true,
      accountType: true,
      lastOrderDate: true,
    },
  });

  if (!customer) {
    console.warn(`[updateCustomerAccountType] Customer ${customerId} not found`);
    return;
  }

  const { sixMonthsAgo } = getDateThresholds();

  // If customer has recent order, they should be ACTIVE
  if (customer.lastOrderDate && customer.lastOrderDate >= sixMonthsAgo) {
    if (customer.accountType !== AccountType.ACTIVE) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { accountType: AccountType.ACTIVE },
      });

      console.log(
        `✅ Updated customer ${customer.id} account type: ${customer.accountType} → ACTIVE`,
      );
    }
  }
}

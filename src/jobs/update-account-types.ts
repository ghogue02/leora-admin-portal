/**
 * Daily Account Type Update Job
 *
 * Updates all customer account types based on their last order date:
 * - ACTIVE: Ordered within last 6 months
 * - TARGET: Ordered 6-12 months ago (reactivation candidates)
 * - PROSPECT: Never ordered or >12 months since last order
 *
 * Schedule: Daily at 2:00 AM
 * Cron: 0 2 * * *
 *
 * Usage:
 *   npm run jobs:update-account-types
 *   npm run jobs:run -- update-account-types
 */

import { updateAccountTypes } from "@/lib/account-types";
import { prisma } from "@/lib/prisma";

type RunOptions = {
  tenantId?: string;
  tenantSlug?: string;
  disconnectAfterRun?: boolean;
};

export async function run(options: RunOptions = {}) {
  const { tenantId: explicitTenantId, tenantSlug: explicitTenantSlug } = options;
  const disconnectAfterRun = options.disconnectAfterRun ?? true;

  const startTime = Date.now();
  console.log("[update-account-types] Starting daily account type update...");

  try {
    // Determine which tenant to process (if specified)
    let targetTenantId: string | undefined = explicitTenantId;

    if (!targetTenantId && explicitTenantSlug) {
      const tenant = await prisma.tenant.findFirst({
        where: { slug: explicitTenantSlug },
        select: { id: true },
      });
      targetTenantId = tenant?.id;

      if (!tenant) {
        console.warn(
          `[update-account-types] Tenant with slug "${explicitTenantSlug}" not found`,
        );
        return;
      }
    }

    // Update account types (all tenants if no targetTenantId)
    const results = await updateAccountTypes(targetTenantId);

    const duration = Date.now() - startTime;
    const totalCustomers = results.reduce((sum, r) => sum + r.total, 0);
    const totalActive = results.reduce((sum, r) => sum + r.active, 0);
    const totalTarget = results.reduce((sum, r) => sum + r.target, 0);
    const totalProspect = results.reduce((sum, r) => sum + r.prospect, 0);

    console.log("[update-account-types] Job complete:");
    console.log(`  - Tenants processed: ${results.length}`);
    console.log(`  - Total customers: ${totalCustomers}`);
    console.log(`  - ACTIVE: ${totalActive} (${((totalActive / totalCustomers) * 100).toFixed(1)}%)`);
    console.log(`  - TARGET: ${totalTarget} (${((totalTarget / totalCustomers) * 100).toFixed(1)}%)`);
    console.log(
      `  - PROSPECT: ${totalProspect} (${((totalProspect / totalCustomers) * 100).toFixed(1)}%)`,
    );
    console.log(`  - Duration: ${duration}ms`);

    // Log per-tenant details
    if (results.length > 1) {
      console.log("\n  Per-tenant breakdown:");
      for (const result of results) {
        console.log(
          `    ${result.tenantSlug}: ${result.active} active, ${result.target} target, ${result.prospect} prospect`,
        );
      }
    }
  } catch (error) {
    console.error("[update-account-types] Job failed:", error);
    throw error;
  } finally {
    if (disconnectAfterRun) {
      await prisma.$disconnect().catch(() => {
        // Ignore disconnect failures in job runner context
      });
    }
  }
}

export default run;

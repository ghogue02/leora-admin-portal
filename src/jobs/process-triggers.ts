/**
 * Background job to process automated triggers
 *
 * This job should be run periodically (e.g., every 6 hours or daily)
 * to check for trigger conditions and create tasks automatically.
 *
 * Can be invoked via:
 * - Cron job
 * - API endpoint (for manual execution)
 * - Scheduled task runner
 */

import prisma from "@/lib/db";
import { processTriggers, type ProcessResult } from "@/lib/automated-triggers";
import { createAuditLog } from "@/lib/audit-log";

export interface JobResult {
  success: boolean;
  tenantId: string;
  executionTime: number;
  results: ProcessResult[];
  errors: string[];
}

/**
 * Process triggers for a specific tenant
 */
export async function processTriggersForTenant(
  tenantId: string,
): Promise<JobResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    console.log(`[Triggers] Processing triggers for tenant ${tenantId}`);

    // Process all active triggers
    const results = await processTriggers(prisma, tenantId);

    // Log summary
    const totalTasksCreated = results.reduce(
      (sum, r) => sum + r.tasksCreated,
      0,
    );
    console.log(
      `[Triggers] Created ${totalTasksCreated} tasks across ${results.length} triggers`,
    );

    // Collect any errors from trigger processing
    results.forEach((result) => {
      if (result.errors.length > 0) {
        errors.push(...result.errors);
      }
    });

    // Create audit log for job execution
    await createAuditLog(prisma, {
      tenantId,
      entityType: "AutomatedTrigger",
      entityId: "job-execution",
      action: "CREATE",
      metadata: {
        jobType: "process_triggers",
        tasksCreated: totalTasksCreated,
        triggersProcessed: results.length,
        executionTime: Date.now() - startTime,
        hasErrors: errors.length > 0,
      },
    });

    return {
      success: errors.length === 0,
      tenantId,
      executionTime: Date.now() - startTime,
      results,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[Triggers] Error processing tenant ${tenantId}:`, error);
    errors.push(errorMessage);

    // Log error to audit log
    try {
      await createAuditLog(prisma, {
        tenantId,
        entityType: "AutomatedTrigger",
        entityId: "job-execution",
        action: "CREATE",
        metadata: {
          jobType: "process_triggers",
          error: errorMessage,
          executionTime: Date.now() - startTime,
        },
      });
    } catch (auditError) {
      console.error("[Triggers] Failed to log error to audit:", auditError);
    }

    return {
      success: false,
      tenantId,
      executionTime: Date.now() - startTime,
      results: [],
      errors,
    };
  }
}

/**
 * Process triggers for all tenants
 */
export async function processTriggersForAllTenants(): Promise<JobResult[]> {
  console.log("[Triggers] Starting global trigger processing job");

  // Get all active tenants
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`[Triggers] Processing triggers for ${tenants.length} tenants`);

  const results: JobResult[] = [];

  // Process each tenant
  for (const tenant of tenants) {
    try {
      const result = await processTriggersForTenant(tenant.id);
      results.push(result);
    } catch (error) {
      console.error(
        `[Triggers] Failed to process tenant ${tenant.id}:`,
        error,
      );
      results.push({
        success: false,
        tenantId: tenant.id,
        executionTime: 0,
        results: [],
        errors: [
          error instanceof Error ? error.message : "Unknown error",
        ],
      });
    }
  }

  // Log summary
  const totalSuccess = results.filter((r) => r.success).length;
  const totalTasks = results.reduce(
    (sum, r) => sum + r.results.reduce((s, res) => s + res.tasksCreated, 0),
    0,
  );

  console.log(
    `[Triggers] Job complete: ${totalSuccess}/${tenants.length} tenants successful, ${totalTasks} total tasks created`,
  );

  return results;
}

/**
 * CLI entry point for manual execution
 */
if (require.main === module) {
  const tenantId = process.argv[2];

  (async () => {
    try {
      if (tenantId) {
        console.log(`Processing triggers for tenant: ${tenantId}`);
        const result = await processTriggersForTenant(tenantId);
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      } else {
        console.log("Processing triggers for all tenants");
        const results = await processTriggersForAllTenants();
        console.log(JSON.stringify(results, null, 2));
        const allSuccess = results.every((r) => r.success);
        process.exit(allSuccess ? 0 : 1);
      }
    } catch (error) {
      console.error("Fatal error:", error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  })();
}

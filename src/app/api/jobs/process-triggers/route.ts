import { NextRequest, NextResponse } from "next/server";
import {
  processTriggersForTenant,
  processTriggersForAllTenants,
} from "@/jobs/process-triggers";

/**
 * POST /api/jobs/process-triggers
 * Manually trigger the trigger processing job
 *
 * Query params:
 * - tenantId: Process specific tenant (optional, processes all if not provided)
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add authentication check for admin users only
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId");

    let results;

    if (tenantId) {
      console.log(`[Triggers Job API] Processing triggers for tenant ${tenantId}`);
      const result = await processTriggersForTenant(tenantId);
      results = [result];
    } else {
      console.log("[Triggers Job API] Processing triggers for all tenants");
      results = await processTriggersForAllTenants();
    }

    const allSuccess = results.every((r) => r.success);
    const totalTasks = results.reduce(
      (sum, r) => sum + r.results.reduce((s, res) => s + res.tasksCreated, 0),
      0,
    );

    return NextResponse.json(
      {
        success: allSuccess,
        tenantsProcessed: results.length,
        totalTasksCreated: totalTasks,
        results,
      },
      { status: allSuccess ? 200 : 207 }, // 207 Multi-Status if some failed
    );
  } catch (error) {
    console.error("[Triggers Job API] Error processing triggers:", error);
    return NextResponse.json(
      {
        error: "Failed to process triggers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

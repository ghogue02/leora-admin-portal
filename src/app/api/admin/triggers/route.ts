import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAuditLog } from "@/lib/audit-log";
import { getTriggerStatistics } from "@/lib/automated-triggers";

/**
 * GET /api/admin/triggers
 * List all automated triggers with statistics
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    const triggers = await prisma.automatedTrigger.findMany({
      where: { tenantId },
      orderBy: [
        { isActive: "desc" },
        { triggerType: "asc" },
        { name: "asc" },
      ],
    });

    // Get statistics for each trigger
    const triggersWithStats = await Promise.all(
      triggers.map(async (trigger) => {
        const stats = await getTriggerStatistics(prisma, tenantId, trigger.id);
        return {
          ...trigger,
          statistics: stats,
        };
      }),
    );

    return NextResponse.json({
      triggers: triggersWithStats,
      total: triggersWithStats.length,
    });
  } catch (error) {
    console.error("[Triggers API] Error listing triggers:", error);
    return NextResponse.json(
      { error: "Failed to list triggers" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/triggers
 * Create a new automated trigger
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { triggerType, name, description, config, isActive } = body;

    // Validate required fields
    if (!triggerType || !name || !config) {
      return NextResponse.json(
        { error: "Missing required fields: triggerType, name, config" },
        { status: 400 },
      );
    }

    // Validate trigger type
    const validTriggerTypes = [
      "SAMPLE_NO_ORDER",
      "FIRST_ORDER_FOLLOWUP",
      "CUSTOMER_TIMING",
      "BURN_RATE_ALERT",
    ];
    if (!validTriggerTypes.includes(triggerType)) {
      return NextResponse.json(
        { error: `Invalid trigger type. Must be one of: ${validTriggerTypes.join(", ")}` },
        { status: 400 },
      );
    }

    // Create trigger
    const trigger = await prisma.automatedTrigger.create({
      data: {
        tenantId,
        triggerType,
        name,
        description,
        config,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    // Audit log
    await createAuditLog(prisma, {
      tenantId,
      userId,
      entityType: "AutomatedTrigger",
      entityId: trigger.id,
      action: "CREATE",
      metadata: {
        triggerType,
        name,
      },
    });

    return NextResponse.json(trigger, { status: 201 });
  } catch (error) {
    console.error("[Triggers API] Error creating trigger:", error);
    return NextResponse.json(
      { error: "Failed to create trigger" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { createAuditLog, calculateChanges } from "@/lib/audit-log";
import { getTriggerStatistics } from "@/lib/automated-triggers";

/**
 * GET /api/admin/triggers/[id]
 * Get trigger details with statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const triggerId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    const trigger = await prisma.automatedTrigger.findUnique({
      where: {
        id: triggerId,
        tenantId,
      },
    });

    if (!trigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 },
      );
    }

    // Get statistics
    const stats = await getTriggerStatistics(prisma, tenantId, triggerId);

    return NextResponse.json({
      ...trigger,
      statistics: stats,
    });
  } catch (error) {
    console.error("[Triggers API] Error fetching trigger:", error);
    return NextResponse.json(
      { error: "Failed to fetch trigger" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/triggers/[id]
 * Update trigger configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");
    const triggerId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, description, config, isActive } = body;

    // Get existing trigger
    const existingTrigger = await prisma.automatedTrigger.findUnique({
      where: {
        id: triggerId,
        tenantId,
      },
    });

    if (!existingTrigger) {
      return NextResponse.json(
        { error: "Trigger not found" },
        { status: 404 },
      );
    }

    // Update trigger
    const updatedTrigger = await prisma.automatedTrigger.update({
      where: {
        id: triggerId,
        tenantId,
      },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(config !== undefined && { config }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Calculate changes for audit log
    const changes = calculateChanges(
      {
        name: existingTrigger.name,
        description: existingTrigger.description,
        config: existingTrigger.config,
        isActive: existingTrigger.isActive,
      },
      {
        name: updatedTrigger.name,
        description: updatedTrigger.description,
        config: updatedTrigger.config,
        isActive: updatedTrigger.isActive,
      },
    );

    // Audit log
    await createAuditLog(prisma, {
      tenantId,
      userId,
      entityType: "AutomatedTrigger",
      entityId: triggerId,
      action: "UPDATE",
      changes,
    });

    return NextResponse.json(updatedTrigger);
  } catch (error) {
    console.error("[Triggers API] Error updating trigger:", error);
    return NextResponse.json(
      { error: "Failed to update trigger" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/triggers/[id]
 * Deactivate (soft delete) a trigger
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const tenantId = request.headers.get("x-tenant-id");
    const userId = request.headers.get("x-user-id");
    const triggerId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Missing tenant ID" },
        { status: 400 },
      );
    }

    // Deactivate trigger instead of deleting
    const trigger = await prisma.automatedTrigger.update({
      where: {
        id: triggerId,
        tenantId,
      },
      data: {
        isActive: false,
      },
    });

    // Audit log
    await createAuditLog(prisma, {
      tenantId,
      userId,
      entityType: "AutomatedTrigger",
      entityId: triggerId,
      action: "DELETE",
      metadata: {
        deactivated: true,
      },
    });

    return NextResponse.json({
      message: "Trigger deactivated successfully",
      trigger,
    });
  } catch (error) {
    console.error("[Triggers API] Error deactivating trigger:", error);
    return NextResponse.json(
      { error: "Failed to deactivate trigger" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";
import type { WidgetConfig } from "@/types/dashboard-widget";

/**
 * Validation schema for widget updates
 */
const updateWidgetSchema = z.object({
  position: z.number().int().min(0).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  isVisible: z.boolean().optional(),
  config: z.record(z.any()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided for update" }
);

/**
 * PATCH /api/dashboard/widgets/[widgetId]
 * Update widget position, size, visibility, or configuration
 *
 * Body:
 * {
 *   position?: number,
 *   size?: WidgetSize,
 *   isVisible?: boolean,
 *   config?: WidgetConfig
 * }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { widgetId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { widgetId } = params;

      let body;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body" },
          { status: 400 }
        );
      }

      // Validate request body
      const validation = updateWidgetSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid request data",
            details: validation.error.errors,
          },
          { status: 400 }
        );
      }

      const updateData = validation.data;

      // Verify widget exists and belongs to user
      const existingWidget = await db.dashboardWidget.findUnique({
        where: {
          id: widgetId,
        },
      });

      if (!existingWidget) {
        return NextResponse.json(
          { error: "Widget not found" },
          { status: 404 }
        );
      }

      // Ensure widget belongs to user's tenant and user
      if (existingWidget.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      if (existingWidget.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Cannot modify another user's widget" },
          { status: 403 }
        );
      }

      // If position is being updated, check for conflicts
      if (updateData.position !== undefined && updateData.position !== existingWidget.position) {
        // Find widget at target position
        const conflictingWidget = await db.dashboardWidget.findFirst({
          where: {
            tenantId,
            userId: session.user.id,
            position: updateData.position,
            id: { not: widgetId },
          },
        });

        // If there's a conflict, swap positions
        if (conflictingWidget) {
          await db.dashboardWidget.update({
            where: { id: conflictingWidget.id },
            data: { position: existingWidget.position },
          });
        }
      }

      // Update widget
      const updatedWidget = await db.dashboardWidget.update({
        where: { id: widgetId },
        data: {
          ...(updateData.position !== undefined && { position: updateData.position }),
          ...(updateData.size !== undefined && { size: updateData.size }),
          ...(updateData.isVisible !== undefined && { isVisible: updateData.isVisible }),
          ...(updateData.config !== undefined && { config: updateData.config }),
        },
      });

      return NextResponse.json({
        widget: {
          id: updatedWidget.id,
          widgetType: updatedWidget.widgetType,
          position: updatedWidget.position,
          size: updatedWidget.size,
          isVisible: updatedWidget.isVisible,
          config: updatedWidget.config as WidgetConfig | null,
          createdAt: updatedWidget.createdAt.toISOString(),
          updatedAt: updatedWidget.updatedAt.toISOString(),
        },
      });
    }
  );
}

/**
 * DELETE /api/dashboard/widgets/[widgetId]
 * Remove widget from user's dashboard
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { widgetId: string } }
) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { widgetId } = params;

      // Verify widget exists and belongs to user
      const existingWidget = await db.dashboardWidget.findUnique({
        where: {
          id: widgetId,
        },
      });

      if (!existingWidget) {
        return NextResponse.json(
          { error: "Widget not found" },
          { status: 404 }
        );
      }

      // Ensure widget belongs to user's tenant and user
      if (existingWidget.tenantId !== tenantId) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 403 }
        );
      }

      if (existingWidget.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Cannot delete another user's widget" },
          { status: 403 }
        );
      }

      // Delete widget
      await db.dashboardWidget.delete({
        where: { id: widgetId },
      });

      // Reorder remaining widgets to fill gap
      const remainingWidgets = await db.dashboardWidget.findMany({
        where: {
          tenantId,
          userId: session.user.id,
          position: {
            gt: existingWidget.position,
          },
        },
        orderBy: {
          position: "asc",
        },
      });

      // Decrement position of all widgets after deleted one
      if (remainingWidgets.length > 0) {
        await Promise.all(
          remainingWidgets.map((widget) =>
            db.dashboardWidget.update({
              where: { id: widget.id },
              data: { position: widget.position - 1 },
            })
          )
        );
      }

      return NextResponse.json(
        { success: true, message: "Widget removed successfully" },
        { status: 200 }
      );
    }
  );
}

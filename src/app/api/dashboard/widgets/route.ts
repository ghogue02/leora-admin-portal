import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import { z } from "zod";
import type { WidgetType, WidgetConfig } from "@/types/dashboard-widget";
import { WIDGET_METADATA } from "@/types/dashboard-widget";

/**
 * Validation schema for widget creation
 */
const createWidgetSchema = z.object({
  widgetType: z.enum([
    "at_risk_customers",
    "revenue_trend",
    "tasks_from_management",
    "top_products",
    "new_customers",
    "customer_balances",
    "upcoming_events",
    "activity_summary",
    "quota_progress",
    "customers_due",
  ] as const),
  position: z.number().int().min(0).optional(),
  size: z.enum(["small", "medium", "large"]).optional(),
  config: z.record(z.any()).optional(),
});

/**
 * GET /api/dashboard/widgets
 * Get user's dashboard layout with all widgets
 *
 * Query params:
 * - includeHidden: boolean (default: false) - Include hidden widgets
 */
export async function GET(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
      const { searchParams } = new URL(request.url);
      const includeHidden = searchParams.get("includeHidden") === "true";

      // Get user's widgets
      const widgets = await db.dashboardWidget.findMany({
        where: {
          tenantId,
          userId: session.user.id,
          ...(includeHidden ? {} : { isVisible: true }),
        },
        orderBy: {
          position: "asc",
        },
      });

      // Get all available widget types
      const availableWidgets = Object.keys(WIDGET_METADATA) as WidgetType[];

      // Get widget types already added by user
      const addedWidgetTypes = new Set(widgets.map((w) => w.widgetType));

      // Filter to show only widgets not already added
      const availableToAdd = availableWidgets.filter(
        (type) => !addedWidgetTypes.has(type)
      );

      return NextResponse.json({
        widgets: widgets.map((w) => ({
          id: w.id,
          widgetType: w.widgetType,
          position: w.position,
          size: w.size,
          isVisible: w.isVisible,
          config: w.config as WidgetConfig | null,
          createdAt: w.createdAt.toISOString(),
          updatedAt: w.updatedAt.toISOString(),
        })),
        availableWidgets: availableToAdd,
        metadata: WIDGET_METADATA,
      });
    }
  );
}

/**
 * POST /api/dashboard/widgets
 * Add a widget to user's dashboard
 *
 * Body:
 * {
 *   widgetType: WidgetType,
 *   position?: number,
 *   size?: WidgetSize,
 *   config?: WidgetConfig
 * }
 */
export async function POST(request: NextRequest) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session }) => {
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
      const validation = createWidgetSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid request data",
            details: validation.error.errors,
          },
          { status: 400 }
        );
      }

      const { widgetType, position, size, config } = validation.data;

      // Check if widget already exists for this user
      const existingWidget = await db.dashboardWidget.findUnique({
        where: {
          tenantId_userId_widgetType: {
            tenantId,
            userId: session.user.id,
            widgetType,
          },
        },
      });

      if (existingWidget) {
        return NextResponse.json(
          { error: "Widget already exists on dashboard" },
          { status: 409 }
        );
      }

      // Get current max position for user
      const maxPositionWidget = await db.dashboardWidget.findFirst({
        where: {
          tenantId,
          userId: session.user.id,
        },
        orderBy: {
          position: "desc",
        },
        select: {
          position: true,
        },
      });

      const newPosition = position ?? (maxPositionWidget?.position ?? 0) + 1;
      const defaultSize = WIDGET_METADATA[widgetType]?.defaultSize ?? "medium";

      // Create widget
      const widget = await db.dashboardWidget.create({
        data: {
          tenantId,
          userId: session.user.id,
          widgetType,
          position: newPosition,
          size: size ?? defaultSize,
          isVisible: true,
          config: config ?? null,
        },
      });

      return NextResponse.json(
        {
          widget: {
            id: widget.id,
            widgetType: widget.widgetType,
            position: widget.position,
            size: widget.size,
            isVisible: widget.isVisible,
            config: widget.config as WidgetConfig | null,
            createdAt: widget.createdAt.toISOString(),
            updatedAt: widget.updatedAt.toISOString(),
          },
        },
        { status: 201 }
      );
    }
  );
}

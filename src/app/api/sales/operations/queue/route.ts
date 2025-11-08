import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { withSalesSession } from "@/lib/auth/sales";

const statusFilterSchema = z.enum(["all", "READY_TO_DELIVER", "PICKED", "PENDING", "DELIVERED"]).optional();
const queueQuerySchema = z.object({
  deliveryDate: z.string().optional(),
  status: statusFilterSchema,
  warehouse: z.string().optional(),
});

/**
 * GET /api/sales/operations/queue
 *
 * Operations queue for picking and delivery
 *
 * Filters:
 * - deliveryDate: Filter by specific delivery date
 * - status: READY_TO_DELIVER, PICKED, DELIVERED, PENDING
 * - warehouse: Filter by warehouse location
 *
 * Returns orders ready for operations team to process
 */

export async function GET(request: NextRequest) {
  const params = queueQuerySchema.parse({
    deliveryDate: request.nextUrl.searchParams.get("deliveryDate") ?? undefined,
    status: request.nextUrl.searchParams.get("status") ?? undefined,
    warehouse: request.nextUrl.searchParams.get("warehouse") ?? undefined,
  });

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Build where clause
      const where: Prisma.OrderWhereInput = {
        tenantId,
      };

      // Filter by delivery date
      if (params.deliveryDate) {
        const date = new Date(params.deliveryDate);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        where.deliveryDate = {
          gte: date,
          lt: nextDay,
        };
      }

      // Filter by status
      if (params.status && params.status !== "all") {
        where.status = params.status;
      } else {
        // Default: Show operational statuses only
        where.status = {
          in: ["READY_TO_DELIVER", "PICKED", "PENDING"],
        };
      }

      // Filter by warehouse
      if (params.warehouse && params.warehouse !== "all") {
        where.warehouseLocation = params.warehouse;
      }

      const orders = await db.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              territory: true,
              street1: true,
              city: true,
              state: true,
            },
          },
          lines: {
            select: {
              id: true,
            },
          },
          invoices: {
            select: {
              specialInstructions: true,
            },
          },
        },
        orderBy: [
          { deliveryDate: "asc" },
          { createdAt: "asc" },
        ],
      });

      return NextResponse.json({
        orders: orders.map((order) => ({
          id: order.id,
          customer: order.customer,
          deliveryDate: order.deliveryDate,
          warehouseLocation: order.warehouseLocation,
          deliveryTimeWindow: order.deliveryTimeWindow,
          status: order.status,
          total: Number(order.total || 0),
          lineCount: order.lines.length,
          specialInstructions: order.invoices[0]?.specialInstructions || null,
        })),
        summary: {
          totalOrders: orders.length,
          totalValue: orders.reduce((sum, o) => sum + Number(o.total || 0), 0),
        },
      });
    }
  );
}

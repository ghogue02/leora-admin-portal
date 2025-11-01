import { NextRequest, NextResponse } from "next/server";
import { withSalesSession } from "@/lib/auth/sales";
import type { Prisma } from "@prisma/client";

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
  const searchParams = request.nextUrl.searchParams;
  const deliveryDate = searchParams.get('deliveryDate');
  const status = searchParams.get('status');
  const warehouse = searchParams.get('warehouse');

  return withSalesSession(
    request,
    async ({ db, tenantId }) => {
      // Build where clause
      const where: Prisma.OrderWhereInput = {
        tenantId,
      };

      // Filter by delivery date
      if (deliveryDate) {
        const date = new Date(deliveryDate);
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);

        where.deliveryDate = {
          gte: date,
          lt: nextDay,
        };
      }

      // Filter by status
      if (status && status !== 'all') {
        where.status = status as any;
      } else {
        // Default: Show operational statuses only
        where.status = {
          in: ['READY_TO_DELIVER', 'PICKED', 'PENDING'],
        };
      }

      // Filter by warehouse
      if (warehouse && warehouse !== 'all') {
        where.warehouseLocation = warehouse;
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
          { deliveryDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      return NextResponse.json({
        orders: orders.map(order => ({
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

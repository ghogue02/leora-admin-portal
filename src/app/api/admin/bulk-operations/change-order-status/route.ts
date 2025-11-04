import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession, AdminSessionContext } from '@/lib/auth/admin';
import { PrismaClient } from '@prisma/client';

import { logChange, AuditOperation } from '@/lib/audit';
import { OrderStatus } from '@prisma/client';
import { handleOrderDeliveryEvent } from '@/lib/customer-health/realtime-updater';

/**
 * POST /api/admin/bulk-operations/change-order-status
 * Bulk change status for multiple orders
 */
export async function POST(request: NextRequest) {
  return withAdminSession(request, async (context: AdminSessionContext) => {
    const { tenantId, db, user } = context;

    try {
      const body = await request.json();
      const { orderIds, newStatus, reason } = body;

      if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return NextResponse.json(
          { error: 'orderIds array is required' },
          { status: 400 }
        );
      }

      if (!newStatus) {
        return NextResponse.json(
          { error: 'newStatus is required' },
          { status: 400 }
        );
      }

      // Validate status
      const validStatuses: OrderStatus[] = ['DRAFT', 'SUBMITTED', 'FULFILLED', 'CANCELLED', 'PARTIALLY_FULFILLED'];
      if (!validStatuses.includes(newStatus as OrderStatus)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          },
          { status: 400 }
        );
      }

      // Limit to prevent abuse
      if (orderIds.length > 10000) {
        return NextResponse.json(
          { error: 'Maximum 10,000 orders can be updated at once' },
          { status: 400 }
        );
      }

      // Fetch orders to validate
      const orders = await db.order.findMany({
        where: {
          id: { in: orderIds },
          tenantId
        },
        select: {
          id: true,
          status: true,
          customer: {
            select: {
              name: true
            }
          }
        }
      });

      if (orders.length === 0) {
        return NextResponse.json(
          { error: 'No orders found' },
          { status: 404 }
        );
      }

      const results = {
        successCount: 0,
        errors: [] as Array<{ orderId: string; customerName: string; error: string }>
      };

      // Define valid status transitions
      const isValidTransition = (currentStatus: OrderStatus, newStatus: OrderStatus): boolean => {
        // Always allow cancellation from any non-cancelled state
        if (newStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
          return true;
        }

        // Status progression rules
        const transitions: Record<OrderStatus, OrderStatus[]> = {
          DRAFT: ['SUBMITTED', 'CANCELLED'],
          SUBMITTED: ['FULFILLED', 'PARTIALLY_FULFILLED', 'CANCELLED'],
          PARTIALLY_FULFILLED: ['FULFILLED', 'CANCELLED'],
          FULFILLED: [], // Cannot change from fulfilled
          CANCELLED: [] // Cannot change from cancelled
        };

        return transitions[currentStatus]?.includes(newStatus) || false;
      };

      // Process each order
      for (const order of orders) {
        try {
          // Skip if already in the target status
          if (order.status === newStatus) {
            results.successCount++;
            continue;
          }

          // Validate transition
          if (!isValidTransition(order.status, newStatus as OrderStatus)) {
            results.errors.push({
              orderId: order.id,
              customerName: order.customer.name,
              error: `Invalid status transition from ${order.status} to ${newStatus}`
            });
            continue;
          }

          await (db as PrismaClient).$transaction(async (tx) => {
            const updateData: any = {
              status: newStatus
            };

            // Set timestamp based on new status
            if (newStatus === 'FULFILLED') {
              updateData.fulfilledAt = new Date();
              updateData.deliveredAt = new Date(); // Also set deliveredAt for health calculations
            }

            // Update order
            const updatedOrder = await tx.order.update({
              where: { id: order.id },
              data: updateData,
              select: { id: true, customerId: true }
            });

            // Trigger real-time health update when order is delivered
            if (newStatus === 'FULFILLED' && updatedOrder.customerId) {
              // Don't await - fire and forget to avoid blocking bulk operation
              handleOrderDeliveryEvent(order.id).catch((error) => {
                console.error(`[Real-time Health] Failed to update customer health for order ${order.id}:`, error);
              });
            }

            // Log the change
            await logChange(
              {
                tenantId,
                userId: user.id,
                action: AuditOperation.STATUS_CHANGE,
                entityType: 'Order',
                entityId: order.id,
                changes: {
                  status: {
                    old: order.status,
                    new: newStatus
                  },
                  ...(newStatus === 'FULFILLED' && {
                    fulfilledAt: {
                      old: null,
                      new: new Date().toISOString()
                    }
                  })
                },
                metadata: {
                  customerName: order.customer.name,
                  bulkOperation: true
                },
                reason
              },
              tx,
              request
            );
          });

          results.successCount++;
        } catch (error: any) {
          results.errors.push({
            orderId: order.id,
            customerName: order.customer.name,
            error: error.message || 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        message: `Bulk status change completed. ${results.successCount} successful, ${results.errors.length} failed.`,
        successCount: results.successCount,
        errorCount: results.errors.length,
        errors: results.errors,
        newStatus
      });
    } catch (error: any) {
      console.error('Error in bulk order status change:', error);
      return NextResponse.json(
        { error: 'Failed to perform bulk status change', details: error.message },
        { status: 500 }
      );
    }
  });
}

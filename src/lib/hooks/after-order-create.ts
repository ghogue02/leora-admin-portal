/**
 * After Order Create Hook
 *
 * Real-time account type update when new orders are created.
 * Ensures customers are immediately classified as ACTIVE when they place orders.
 *
 * Integration Points:
 * - API Route: POST /api/orders (call after order creation)
 * - Prisma Middleware: Can be used for automatic triggering
 * - Job Queue: For async processing if needed
 *
 * State Transitions:
 * - PROSPECT → ACTIVE (first order ever or after >12 months)
 * - TARGET → ACTIVE (reactivation after 6-12 months)
 * - ACTIVE → ACTIVE (already active, updates lastOrderDate)
 */

import { updateCustomerAccountType } from "@/lib/account-types";
import { prisma } from "@/lib/prisma";

export type OrderCreatedEvent = {
  orderId: string;
  customerId: string;
  orderedAt: Date;
  total: number;
};

/**
 * Hook to run after order creation
 * Updates customer's lastOrderDate and account type
 *
 * @param event - Order creation event data
 */
export async function afterOrderCreate(event: OrderCreatedEvent): Promise<void> {
  try {
    console.log(
      `[afterOrderCreate] Processing order ${event.orderId} for customer ${event.customerId}`,
    );

    // Update customer's lastOrderDate
    await prisma.customer.update({
      where: { id: event.customerId },
      data: {
        lastOrderDate: event.orderedAt,
      },
    });

    // Update account type based on new order
    await updateCustomerAccountType(event.customerId);

    console.log(
      `[afterOrderCreate] Successfully updated customer ${event.customerId} after order creation`,
    );
  } catch (error) {
    console.error(
      `[afterOrderCreate] Error processing order ${event.orderId}:`,
      error,
    );
    // Don't throw - order creation should succeed even if hook fails
  }
}

/**
 * Batch process multiple order creations
 * Useful for bulk imports or backfills
 *
 * @param events - Array of order creation events
 */
export async function afterOrderCreateBatch(events: OrderCreatedEvent[]): Promise<void> {
  console.log(`[afterOrderCreateBatch] Processing ${events.length} orders`);

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  for (const event of events) {
    try {
      await afterOrderCreate(event);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(
        `[afterOrderCreateBatch] Error processing order ${event.orderId}:`,
        error,
      );
    }
  }

  const duration = Date.now() - startTime;
  console.log(`[afterOrderCreateBatch] Complete:`);
  console.log(`  - Total: ${events.length}`);
  console.log(`  - Success: ${successCount}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log(`  - Duration: ${duration}ms`);
}

/**
 * Example usage in API route:
 *
 * ```typescript
 * // /src/app/api/orders/route.ts
 *
 * export async function POST(req: Request) {
 *   const data = await req.json();
 *
 *   const order = await prisma.order.create({
 *     data: {
 *       ...data,
 *       status: 'SUBMITTED'
 *     }
 *   });
 *
 *   // Trigger real-time account type update
 *   await afterOrderCreate({
 *     orderId: order.id,
 *     customerId: order.customerId,
 *     orderedAt: order.orderedAt,
 *     total: order.total
 *   });
 *
 *   return NextResponse.json(order);
 * }
 * ```
 *
 * Example usage with Prisma middleware:
 *
 * ```typescript
 * // /src/lib/prisma.ts
 *
 * prisma.$use(async (params, next) => {
 *   const result = await next(params);
 *
 *   if (params.model === 'Order' && params.action === 'create') {
 *     await afterOrderCreate({
 *       orderId: result.id,
 *       customerId: result.customerId,
 *       orderedAt: result.orderedAt,
 *       total: result.total
 *     });
 *   }
 *
 *   return result;
 * });
 * ```
 */

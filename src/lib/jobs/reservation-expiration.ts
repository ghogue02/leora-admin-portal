/**
 * Reservation Expiration Background Job
 *
 * Travis's requirement: 48-hour inventory reservation
 *
 * This job runs periodically (via cron) to:
 * 1. Find expired reservations (expiresAt < now, status = ACTIVE)
 * 2. Release inventory (decrement allocated)
 * 3. Update reservation status to EXPIRED
 * 4. Cancel associated orders if still in DRAFT/PENDING
 * 5. Send email notification to sales rep
 *
 * Schedule: Run every hour
 * Cron: "0 * * * *" (every hour on the hour)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function releaseExpiredReservations() {
  console.log('[Reservation Expiration] Starting job...');

  const now = new Date();

  try {
    // Find expired reservations
    const expiredReservations = await prisma.inventoryReservation.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: now,
        },
      },
      include: {
        Order: {
          select: {
            id: true,
            status: true,
            customerId: true,
            customer: {
              select: {
                name: true,
                salesRepId: true,
              },
            },
          },
        },
        Sku: {
          select: {
            code: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    console.log(`[Reservation Expiration] Found ${expiredReservations.length} expired reservations`);

    if (expiredReservations.length === 0) {
      console.log('[Reservation Expiration] No expired reservations found');
      return {
        processed: 0,
        ordersAffected: 0,
        inventoryReleased: 0,
      };
    }

    let processedCount = 0;
    const affectedOrderIds = new Set<string>();
    let totalInventoryReleased = 0;

    // Process each expired reservation
    for (const reservation of expiredReservations) {
      try {
        await prisma.$transaction(async (tx) => {
          // 1. Release inventory
          const inventory = await tx.inventory.findFirst({
            where: {
              tenantId: reservation.tenantId,
              skuId: reservation.skuId,
            },
          });

          if (inventory && inventory.allocated >= reservation.quantity) {
            await tx.inventory.update({
              where: { id: inventory.id },
              data: {
                allocated: {
                  decrement: reservation.quantity,
                },
              },
            });

            totalInventoryReleased += reservation.quantity;
          }

          // 2. Update reservation status
          await tx.inventoryReservation.update({
            where: { id: reservation.id },
            data: {
              status: 'EXPIRED',
              releasedAt: now,
            },
          });

          // 3. Cancel order if still in DRAFT or PENDING
          const order = reservation.Order;
          if (order && (order.status === 'DRAFT' || order.status === 'PENDING')) {
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: 'CANCELLED',
              },
            });

            affectedOrderIds.add(order.id);

            // Log activity
            const activityType = await tx.activityType.findFirst({
              where: {
                tenantId: reservation.tenantId,
                code: 'ORDER_EXPIRED',
              },
              select: { id: true },
            });

            if (activityType) {
              await tx.activity.create({
                data: {
                  tenantId: reservation.tenantId,
                  activityTypeId: activityType.id,
                  customerId: order.customerId,
                  orderId: order.id,
                  subject: 'Order cancelled due to reservation expiration',
                  notes: `Order was not processed within 48 hours. Inventory reservation expired and order was automatically cancelled. SKU: ${reservation.Sku.code} (${reservation.Sku.product.name}), Quantity: ${reservation.quantity}`,
                  occurredAt: now,
                },
              });
            }

            // TODO: Send email notification to sales rep
            // const salesRepUserId = order.customer.salesRepId;
            // await sendExpirationEmail(salesRepUserId, order);
          }

          processedCount++;
        });
      } catch (error) {
        console.error(`[Reservation Expiration] Failed to process reservation ${reservation.id}:`, error);
      }
    }

    const result = {
      processed: processedCount,
      ordersAffected: affectedOrderIds.size,
      inventoryReleased: totalInventoryReleased,
      timestamp: now.toISOString(),
    };

    console.log('[Reservation Expiration] Job complete:', result);

    return result;
  } catch (error) {
    console.error('[Reservation Expiration] Job failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Manual trigger for testing
 * Run: npx tsx src/lib/jobs/reservation-expiration.ts
 */
if (require.main === module) {
  console.log('Running reservation expiration job manually...');
  releaseExpiredReservations()
    .then(result => {
      console.log('✅ Job completed successfully:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Job failed:', error);
      process.exit(1);
    });
}

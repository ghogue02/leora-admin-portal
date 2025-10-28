#!/usr/bin/env tsx
/**
 * Fix Orders with Negative Totals
 * Identifies and corrects orders with negative total amounts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres'
    }
  }
});

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function fixNegativeOrders() {
  console.log('🔍 Finding orders with negative totals...\n');

  try {
    // Find orders with negative totals
    const negativeOrders = await prisma.order.findMany({
      where: {
        tenantId: TENANT_ID,
        total: {
          lt: 0
        }
      },
      include: {
        orderLines: true,
        customer: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        total: 'asc'
      }
    });

    console.log(`Found ${negativeOrders.length} orders with negative totals\n`);

    if (negativeOrders.length === 0) {
      console.log('✅ No negative orders found!');
      return;
    }

    // Analyze the negative orders
    console.log('📊 Negative Orders Analysis:');
    console.log('Order ID | Customer | Total | Lines | Issue');
    console.log('---------|----------|-------|-------|------');

    let fixedCount = 0;
    let deletedCount = 0;

    for (const order of negativeOrders) {
      const lineTotal = order.orderLines.reduce((sum, line) => sum + line.total, 0);
      const issue = lineTotal >= 0 ? 'Order total wrong' : 'Credit/Return';

      console.log(
        `${order.orderNumber.padEnd(8)} | ` +
        `${order.customer.name.substring(0, 15).padEnd(15)} | ` +
        `$${order.total.toFixed(2).padStart(8)} | ` +
        `${order.orderLines.length.toString().padStart(5)} | ` +
        issue
      );

      // Fix strategy:
      // 1. If line items total is positive, recalculate order total
      // 2. If it's a credit/return (all negatives), mark it appropriately
      // 3. If invalid data, consider deleting

      if (lineTotal > 0 && order.total < 0) {
        // Recalculate total from line items
        await prisma.order.update({
          where: { id: order.id },
          data: {
            total: lineTotal,
            subtotal: lineTotal,
            updatedAt: new Date()
          }
        });
        fixedCount++;
      } else if (lineTotal < 0) {
        // This is a credit/return - mark it as such
        // We'll keep it but flag it
        await prisma.order.update({
          where: { id: order.id },
          data: {
            // Add a note or status if your schema supports it
            updatedAt: new Date()
          }
        });
      } else if (lineTotal === 0) {
        // Invalid order with no value - delete it
        await prisma.order.delete({
          where: { id: order.id }
        });
        deletedCount++;
      }
    }

    console.log('\n✅ Fix Summary:');
    console.log(`  Recalculated: ${fixedCount} orders`);
    console.log(`  Credits/Returns: ${negativeOrders.length - fixedCount - deletedCount} orders (kept)`);
    console.log(`  Deleted: ${deletedCount} invalid orders`);

    // Verify fix
    const remaining = await prisma.order.count({
      where: {
        tenantId: TENANT_ID,
        total: { lt: 0 }
      }
    });

    console.log(`\n📊 Remaining negative orders: ${remaining}`);
    if (remaining > 0) {
      console.log('   (These are likely legitimate credits/returns)');
    }

  } catch (error) {
    console.error('❌ Error fixing negative orders:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixNegativeOrders().catch(console.error);

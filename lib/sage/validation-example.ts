/**
 * Example usage of SAGE Export Validation System
 *
 * This demonstrates how to validate orders before exporting to SAGE.
 * Run with: npx tsx lib/sage/validation-example.ts
 */

import { PrismaClient } from '@prisma/client';
import {
  validateOrdersForExport,
  formatValidationErrors,
  groupErrorsByOrder,
  groupErrorsByType,
  type OrderToValidate,
} from './validation';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('=== SAGE Export Validation Example ===\n');

    // Example 1: Validate orders by date range
    console.log('Example 1: Validating orders from last 7 days...\n');
    await validateRecentOrders();

    console.log('\n' + '='.repeat(60) + '\n');

    // Example 2: Validate specific orders by IDs
    console.log('Example 2: Validating specific orders...\n');
    await validateSpecificOrders([
      // Add your order IDs here
      // 'order-id-1',
      // 'order-id-2',
    ]);

    console.log('\n' + '='.repeat(60) + '\n');

    // Example 3: Validate all unfulfilled orders
    console.log('Example 3: Validating unfulfilled orders...\n');
    await validateUnfulfilledOrders();

  } catch (error) {
    console.error('Error during validation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Validate orders from the last 7 days
 */
async function validateRecentOrders() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch orders from database
  const orders = await prisma.order.findMany({
    where: {
      orderedAt: {
        gte: sevenDaysAgo,
      },
      status: {
        in: ['PENDING', 'APPROVED', 'CONFIRMED'],
      },
    },
    include: {
      orderLines: {
        select: {
          id: true,
          skuId: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
    orderBy: {
      orderedAt: 'desc',
    },
  });

  console.log(`Found ${orders.length} orders from last 7 days`);

  if (orders.length === 0) {
    console.log('No orders to validate.');
    return;
  }

  // Convert to validation format
  const ordersToValidate: OrderToValidate[] = orders.map(order => ({
    id: order.id,
    customerId: order.customerId,
    orderedAt: order.orderedAt,
    total: order.total ? Number(order.total) : null,
    orderLines: order.orderLines.map(line => ({
      id: line.id,
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
    })),
  }));

  // Validate
  const result = await validateOrdersForExport(ordersToValidate, prisma);

  // Display results
  console.log(formatValidationErrors(result));

  // Show errors grouped by order
  if (result.errors.length > 0) {
    console.log('=== Errors by Order ===');
    const errorsByOrder = groupErrorsByOrder(result.errors);
    for (const [orderId, errors] of errorsByOrder) {
      console.log(`\nOrder ${orderId}:`);
      for (const error of errors) {
        console.log(`  - ${error.message}`);
      }
    }
  }

  // Show summary
  if (result.isValid) {
    console.log('\n✅ All orders are valid for SAGE export!');
  } else {
    console.log(`\n❌ ${result.summary.invalidOrders} orders have validation errors.`);
    console.log('Fix the errors above before exporting to SAGE.');
  }
}

/**
 * Validate specific orders by IDs
 */
async function validateSpecificOrders(orderIds: string[]) {
  if (orderIds.length === 0) {
    console.log('No order IDs provided. Skipping...');
    return;
  }

  const orders = await prisma.order.findMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    include: {
      orderLines: {
        select: {
          id: true,
          skuId: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });

  console.log(`Found ${orders.length} orders`);

  const ordersToValidate: OrderToValidate[] = orders.map(order => ({
    id: order.id,
    customerId: order.customerId,
    orderedAt: order.orderedAt,
    total: order.total ? Number(order.total) : null,
    orderLines: order.orderLines.map(line => ({
      id: line.id,
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
    })),
  }));

  const result = await validateOrdersForExport(ordersToValidate, prisma);
  console.log(formatValidationErrors(result));
}

/**
 * Validate all unfulfilled orders
 */
async function validateUnfulfilledOrders() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'APPROVED', 'CONFIRMED'],
      },
      fulfilledAt: null,
    },
    include: {
      orderLines: {
        select: {
          id: true,
          skuId: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
    take: 100, // Limit to 100 orders for performance
  });

  console.log(`Found ${orders.length} unfulfilled orders`);

  if (orders.length === 0) {
    console.log('No unfulfilled orders to validate.');
    return;
  }

  const ordersToValidate: OrderToValidate[] = orders.map(order => ({
    id: order.id,
    customerId: order.customerId,
    orderedAt: order.orderedAt,
    total: order.total ? Number(order.total) : null,
    orderLines: order.orderLines.map(line => ({
      id: line.id,
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
    })),
  }));

  const result = await validateOrdersForExport(ordersToValidate, prisma);
  console.log(formatValidationErrors(result));

  // Group errors by type for reporting
  if (result.errors.length > 0) {
    console.log('\n=== Errors by Type ===');
    const errorsByType = groupErrorsByType(result.errors);
    for (const [type, errors] of errorsByType) {
      console.log(`\n${type} (${errors.length} errors):`);
      for (const error of errors.slice(0, 5)) { // Show first 5
        console.log(`  - Order ${error.orderId}: ${error.message}`);
      }
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more`);
      }
    }
  }
}

/**
 * Example: Validate and export valid orders
 */
async function validateAndExportOrders() {
  // 1. Fetch orders to export
  const orders = await prisma.order.findMany({
    where: {
      status: 'APPROVED',
      fulfilledAt: null,
    },
    include: {
      orderLines: {
        select: {
          id: true,
          skuId: true,
          quantity: true,
          unitPrice: true,
        },
      },
    },
  });

  // 2. Convert to validation format
  const ordersToValidate: OrderToValidate[] = orders.map(order => ({
    id: order.id,
    customerId: order.customerId,
    orderedAt: order.orderedAt,
    total: order.total ? Number(order.total) : null,
    orderLines: order.orderLines.map(line => ({
      id: line.id,
      skuId: line.skuId,
      quantity: line.quantity,
      unitPrice: Number(line.unitPrice),
    })),
  }));

  // 3. Validate
  const result = await validateOrdersForExport(ordersToValidate, prisma);

  // 4. Check results
  if (!result.isValid) {
    console.error('❌ Validation failed. Cannot export to SAGE.');
    console.error(formatValidationErrors(result));
    return null;
  }

  // 5. Filter to only valid orders (no errors)
  const errorOrderIds = new Set(result.errors.map(e => e.orderId));
  const validOrders = orders.filter(order => !errorOrderIds.has(order.id));

  console.log(`✅ ${validOrders.length} orders are valid for SAGE export`);

  // 6. Export valid orders to SAGE
  // ... your SAGE export logic here ...

  return validOrders;
}

/**
 * Example: Check specific validation issues
 */
async function checkSpecificIssues() {
  console.log('Checking for specific validation issues...\n');

  // Check for customers missing payment terms
  const customersWithoutPaymentTerms = await prisma.customer.findMany({
    where: {
      OR: [
        { paymentTerms: null },
        { paymentTerms: '' },
      ],
    },
    select: {
      id: true,
      name: true,
      accountNumber: true,
    },
    take: 10,
  });

  if (customersWithoutPaymentTerms.length > 0) {
    console.log('⚠️  Customers missing payment terms:');
    for (const customer of customersWithoutPaymentTerms) {
      console.log(`  - ${customer.name} (${customer.accountNumber || 'No account #'})`);
    }
  } else {
    console.log('✅ All customers have payment terms');
  }

  console.log('');

  // Check for inactive SKUs in active orders
  const ordersWithInactiveSKUs = await prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'APPROVED', 'CONFIRMED'],
      },
      orderLines: {
        some: {
          sku: {
            isActive: false,
          },
        },
      },
    },
    include: {
      orderLines: {
        include: {
          sku: {
            select: {
              code: true,
              isActive: true,
            },
          },
        },
      },
    },
    take: 10,
  });

  if (ordersWithInactiveSKUs.length > 0) {
    console.log('⚠️  Orders with inactive SKUs:');
    for (const order of ordersWithInactiveSKUs) {
      const inactiveSKUs = order.orderLines.filter(l => !l.sku.isActive);
      console.log(`  - Order ${order.id}: ${inactiveSKUs.length} inactive SKUs`);
    }
  } else {
    console.log('✅ No active orders contain inactive SKUs');
  }
}

// Run the examples
main()
  .then(() => {
    console.log('\n✅ Validation examples completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

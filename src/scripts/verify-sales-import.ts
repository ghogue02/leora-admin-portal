#!/usr/bin/env ts-node
/**
 * Verify Sales Import Results
 *
 * Checks that the sales import completed successfully
 */

import { PrismaClient } from '@prisma/client';
import { formatUTCDate } from '@/lib/dates';

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('='.repeat(80));
    console.log('SALES IMPORT VERIFICATION');
    console.log('='.repeat(80));
    console.log('');

    // 1. Count orders
    const orderCount = await prisma.order.count({
      where: { tenantId: TENANT_ID }
    });

    // 2. Count order lines
    const orderLineCount = await prisma.orderLine.count({
      where: { tenantId: TENANT_ID }
    });

    // 3. Total revenue
    const revenueResult = await prisma.order.aggregate({
      where: { tenantId: TENANT_ID },
      _sum: {
        total: true
      }
    });

    // 4. Count customers
    const customerCount = await prisma.customer.count({
      where: { tenantId: TENANT_ID }
    });

    // 5. Count SKUs
    const skuCount = await prisma.sku.count({
      where: { tenantId: TENANT_ID }
    });

    // 6. Count products
    const productCount = await prisma.product.count({
      where: { tenantId: TENANT_ID }
    });

    // 7. Count invoices
    const invoiceCount = await prisma.invoice.count({
      where: { tenantId: TENANT_ID }
    });

    // 8. Date range
    const dateRange = await prisma.order.aggregate({
      where: { tenantId: TENANT_ID },
      _min: {
        orderedAt: true
      },
      _max: {
        orderedAt: true
      }
    });

    // 9. Sample analysis
    const sampleLineCount = await prisma.orderLine.count({
      where: {
        tenantId: TENANT_ID,
        isSample: true
      }
    });

    // 10. Customers with orders
    const customersWithOrders = await prisma.customer.count({
      where: {
        tenantId: TENANT_ID,
        lastOrderDate: {
          not: null
        }
      }
    });

    // Print results
    console.log('📊 IMPORT RESULTS');
    console.log('-'.repeat(80));
    console.log(`Orders:              ${orderCount.toLocaleString()}`);
    console.log(`Order Lines:         ${orderLineCount.toLocaleString()}`);
    console.log(`Total Revenue:       $${(revenueResult._sum.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`Customers:           ${customerCount.toLocaleString()}`);
    console.log(`SKUs:                ${skuCount.toLocaleString()}`);
    console.log(`Products:            ${productCount.toLocaleString()}`);
    console.log(`Invoices:            ${invoiceCount.toLocaleString()}`);
    console.log(`Sample Lines:        ${sampleLineCount.toLocaleString()}`);
    console.log(`Customers w/Orders:  ${customersWithOrders.toLocaleString()}`);

    if (dateRange._min.orderedAt && dateRange._max.orderedAt) {
      console.log(`Date Range:          ${formatUTCDate(dateRange._min.orderedAt)} to ${formatUTCDate(dateRange._max.orderedAt)}`);
    }
    console.log('');

    // Expected vs Actual
    console.log('✅ VERIFICATION');
    console.log('-'.repeat(80));

    const expected = {
      orders: 34396,
      orderLines: 137185,
      revenue: 21493357.28,
      customers: 1237,
      skus: 1382
    };

    const checkResult = (name: string, actual: number, expected: number, tolerance = 0.01) => {
      const diff = Math.abs(actual - expected);
      const pctDiff = diff / expected;
      const status = pctDiff <= tolerance ? '✅' : '⚠️';
      console.log(`${status} ${name}: ${actual.toLocaleString()} (expected ${expected.toLocaleString()})`);
    };

    checkResult('Orders', orderCount, expected.orders);
    checkResult('Order Lines', orderLineCount, expected.orderLines);
    checkResult('Revenue', Number(revenueResult._sum.total || 0), expected.revenue, 0.001);
    checkResult('Customers', customerCount, expected.customers);
    checkResult('SKUs', skuCount, expected.skus);

    console.log('');
    console.log('='.repeat(80));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);

/**
 * Test script for recent-items API endpoint
 *
 * Usage: npx tsx docs/testing/test-recent-items-api.ts
 *
 * This script tests the /api/sales/customers/[customerId]/recent-items endpoint
 * to verify it's working correctly and returns expected data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRecentItemsAPI() {
  console.log('🧪 Testing Recent Items API Endpoint\n');
  console.log('=' .repeat(80));

  try {
    // Step 1: Get a test customer with orders
    console.log('\n📊 Step 1: Finding test customer with recent orders...');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const customerWithOrders = await prisma.customer.findFirst({
      where: {
        orders: {
          some: {
            orderedAt: {
              gte: sixMonthsAgo,
            },
            status: {
              not: 'CANCELLED',
            },
            orderLines: {
              some: {},
            },
          },
        },
      },
      include: {
        salesRep: {
          include: {
            user: true,
          },
        },
        orders: {
          where: {
            orderedAt: {
              gte: sixMonthsAgo,
            },
            status: {
              not: 'CANCELLED',
            },
          },
          include: {
            orderLines: {
              include: {
                sku: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
          take: 5,
        },
      },
    });

    if (!customerWithOrders) {
      console.log('❌ No customers found with recent orders');
      return;
    }

    console.log(`✅ Found customer: ${customerWithOrders.name}`);
    console.log(`   Customer ID: ${customerWithOrders.id}`);
    console.log(`   Sales Rep: ${customerWithOrders.salesRep?.user.name || 'None'}`);
    console.log(`   Recent Orders: ${customerWithOrders.orders.length}`);

    // Step 2: Check what order lines exist
    console.log('\n📦 Step 2: Checking order line data...');

    const totalOrderLines = customerWithOrders.orders.reduce(
      (sum, order) => sum + order.orderLines.length,
      0
    );
    console.log(`   Total Order Lines: ${totalOrderLines}`);

    if (totalOrderLines === 0) {
      console.log('❌ Customer has orders but no order lines');
      return;
    }

    // Sample order line
    const sampleLine = customerWithOrders.orders[0]?.orderLines[0];
    if (sampleLine) {
      console.log('\n   Sample Order Line:');
      console.log(`   - SKU: ${sampleLine.sku.code}`);
      console.log(`   - Product: ${sampleLine.sku.product.name}`);
      console.log(`   - Quantity: ${sampleLine.quantity}`);
      console.log(`   - Unit Price: $${sampleLine.unitPrice}`);
      console.log(`   - Price Overridden: ${sampleLine.priceOverridden}`);
    }

    // Step 3: Simulate what the API would return
    console.log('\n🔍 Step 3: Simulating API query...');

    const orderLines = await prisma.orderLine.findMany({
      where: {
        tenantId: customerWithOrders.tenantId,
        order: {
          customerId: customerWithOrders.id,
          orderedAt: {
            gte: sixMonthsAgo,
          },
          status: {
            not: 'CANCELLED',
          },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderedAt: true,
          },
        },
        sku: {
          select: {
            id: true,
            code: true,
            size: true,
            product: {
              select: {
                name: true,
                brand: true,
              },
            },
            priceListItems: {
              where: {
                tenantId: customerWithOrders.tenantId,
              },
              include: {
                priceList: {
                  select: {
                    id: true,
                    name: true,
                    jurisdictionType: true,
                    jurisdictionValue: true,
                    allowManualOverride: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        order: {
          orderedAt: 'desc',
        },
      },
      take: 250,
    });

    console.log(`✅ Found ${orderLines.length} order lines`);

    // Step 4: Check data structure
    console.log('\n🔬 Step 4: Validating data structure...');

    const issues: string[] = [];

    for (const line of orderLines.slice(0, 10)) {
      if (!line.order) {
        issues.push(`Order line ${line.id} missing order`);
      }
      if (!line.sku) {
        issues.push(`Order line ${line.id} missing SKU`);
      }
      if (!line.order?.orderedAt) {
        issues.push(`Order line ${line.id} missing order date`);
      }
      if (line.sku && line.sku.priceListItems.length === 0) {
        issues.push(`SKU ${line.sku.code} has no price list items`);
      }
    }

    if (issues.length > 0) {
      console.log('⚠️  Found data issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ All data looks valid');
    }

    // Step 5: Show sample normalized data
    console.log('\n📋 Step 5: Sample normalized data (first 3 lines)...');

    for (const line of orderLines.slice(0, 3)) {
      if (!line.order || !line.sku) continue;

      console.log('\n   ---');
      console.log(`   SKU: ${line.sku.code}`);
      console.log(`   Product: ${line.sku.product.name} (${line.sku.product.brand})`);
      console.log(`   Size: ${line.sku.size || 'N/A'}`);
      console.log(`   Quantity: ${line.quantity}`);
      console.log(`   Unit Price: $${line.unitPrice}`);
      console.log(`   Override Price: ${line.overridePrice ? `$${line.overridePrice}` : 'None'}`);
      console.log(`   Order: ${line.order.orderNumber}`);
      console.log(`   Order Date: ${line.order.orderedAt?.toISOString().split('T')[0]}`);
      console.log(`   Price Lists: ${line.sku.priceListItems.length}`);

      if (line.sku.priceListItems.length > 0) {
        const priceList = line.sku.priceListItems[0];
        console.log(`      - ${priceList.priceList.name}: $${priceList.price} (${priceList.priceList.jurisdictionType})`);
      }
    }

    // Step 6: Test URL construction
    console.log('\n🌐 Step 6: API endpoint information...');
    console.log(`   Endpoint: /api/sales/customers/${customerWithOrders.id}/recent-items`);
    console.log(`   Method: GET`);
    console.log(`   Auth: Requires sales session`);
    console.log(`   Expected Response: { items: RecentItem[] }`);

    // Step 7: Check for potential issues
    console.log('\n🔍 Step 7: Checking for potential API issues...');

    const potentialIssues: string[] = [];

    // Check if customer is assigned to sales rep
    if (!customerWithOrders.salesRepId) {
      potentialIssues.push('Customer has no assigned sales rep (may fail authorization)');
    }

    // Check for missing required fields
    if (!customerWithOrders.state && !customerWithOrders.territory) {
      potentialIssues.push('Customer has no state or territory (pricing may fail)');
    }

    // Check for order lines without SKUs
    const linesWithoutSku = orderLines.filter(line => !line.sku);
    if (linesWithoutSku.length > 0) {
      potentialIssues.push(`${linesWithoutSku.length} order lines missing SKU data`);
    }

    // Check for SKUs without price lists
    const skusWithoutPrices = orderLines.filter(
      line => line.sku && line.sku.priceListItems.length === 0
    );
    if (skusWithoutPrices.length > 0) {
      potentialIssues.push(`${skusWithoutPrices.length} SKUs have no price list items`);
    }

    if (potentialIssues.length > 0) {
      console.log('⚠️  Potential API issues:');
      potentialIssues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ No obvious issues detected');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Customer: ${customerWithOrders.name}`);
    console.log(`Customer ID: ${customerWithOrders.id}`);
    console.log(`Sales Rep: ${customerWithOrders.salesRep?.user.name || 'None'}`);
    console.log(`Order Lines (6 months): ${orderLines.length}`);
    console.log(`Data Issues: ${issues.length}`);
    console.log(`Potential API Issues: ${potentialIssues.length}`);

    if (issues.length === 0 && potentialIssues.length === 0) {
      console.log('\n✅ API endpoint should work correctly for this customer');
    } else {
      console.log('\n⚠️  API endpoint may have issues - see details above');
    }

  } catch (error) {
    console.error('\n❌ ERROR during testing:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nError details:');
      console.error(`  Name: ${error.name}`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testRecentItemsAPI().catch(console.error);

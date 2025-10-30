import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 INVESTIGATING REMAINING ORDERLINES');
  console.log('=' .repeat(60));

  // Get all orders
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid');

  // Get all customers
  const { data: allCustomers } = await lovable
    .from('customer')
    .select('id');

  const validCustomerIds = new Set(allCustomers?.map(c => c.id) || []);
  const orphanedOrders = allOrders?.filter(o => !validCustomerIds.has(o.customerid)) || [];
  const orphanedOrderIds = orphanedOrders.map(o => o.id);

  console.log(`Orphaned orders: ${orphanedOrders.length}`);
  console.log(`Checking orderlines in batches...\n`);

  // Check orderlines in batches
  let totalOrderLines = 0;
  const sampleOrderLines: any[] = [];
  const checkBatchSize = 100;

  for (let i = 0; i < orphanedOrderIds.length; i += checkBatchSize) {
    const batch = orphanedOrderIds.slice(i, i + checkBatchSize);

    const { data: relatedOrderLines } = await lovable
      .from('orderline')
      .select('*')
      .in('orderid', batch);

    if (relatedOrderLines && relatedOrderLines.length > 0) {
      totalOrderLines += relatedOrderLines.length;
      if (sampleOrderLines.length < 5) {
        sampleOrderLines.push(...relatedOrderLines.slice(0, 5 - sampleOrderLines.length));
      }
    }
  }

  console.log(`📊 Total orderlines found: ${totalOrderLines}`);
  console.log(`\n📋 Sample orderlines (first 5):`);
  sampleOrderLines.forEach((ol, idx) => {
    console.log(`\n${idx + 1}. Orderline ID: ${ol.id}`);
    console.log(`   Order ID: ${ol.orderid}`);
    console.log(`   Product ID: ${ol.productid}`);
    console.log(`   Quantity: ${ol.quantity}`);
    console.log(`   Price: ${ol.unitprice}`);
  });

  // Check if these orderlines reference missing products
  console.log(`\n🔍 Checking if these orderlines have valid products...`);

  const { data: allProducts } = await lovable
    .from('product')
    .select('id');

  const validProductIds = new Set(allProducts?.map(p => p.id) || []);

  let orderLinesWithMissingProducts = 0;
  let orderLinesWithValidProducts = 0;

  for (const ol of sampleOrderLines) {
    if (!validProductIds.has(ol.productid)) {
      orderLinesWithMissingProducts++;
    } else {
      orderLinesWithValidProducts++;
    }
  }

  console.log(`   Orderlines with missing products (in sample): ${orderLinesWithMissingProducts}`);
  console.log(`   Orderlines with valid products (in sample): ${orderLinesWithValidProducts}`);

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total orphaned orders: ${orphanedOrders.length}`);
  console.log(`Total orderlines referencing orphaned orders: ${totalOrderLines}`);
  console.log(`\n⚠️  RECOMMENDATION:`);
  console.log(`   These ${totalOrderLines} orderlines must be deleted BEFORE deleting orders`);
  console.log(`   This is Step 3A: Delete orphaned orderlines first`);
  console.log(`   Then Step 3B: Delete orphaned orders`);
  console.log('=' .repeat(60));
}

main().catch(console.error);

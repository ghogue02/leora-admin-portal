#!/usr/bin/env ts-node
/**
 * Final Integrity Verification
 *
 * Comprehensive check that ALL orphaned records have been eliminated
 * and database has 100% referential integrity.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 FINAL DATABASE INTEGRITY VERIFICATION');
  console.log('='.repeat(70));
  console.log('');

  let allChecksPassed = true;

  // Check 1: Orderlines → SKUs
  console.log('📋 Check 1: Orderlines → SKUs');
  const { data: allOrderlines } = await lovable.from('orderline').select('id, skuid, orderid');
  const { data: allSkus } = await lovable.from('skus').select('id, productid');

  const skuIds = new Set(allSkus?.map(s => s.id) || []);
  const orphanedOLtoSKU = allOrderlines?.filter(ol => !skuIds.has(ol.skuid)) || [];

  console.log(`  • Total orderlines: ${allOrderlines?.length || 0}`);
  console.log(`  • Orphaned (SKU missing): ${orphanedOLtoSKU.length}`);

  if (orphanedOLtoSKU.length === 0) {
    console.log('  ✅ PASS: No orderlines reference missing SKUs');
  } else {
    console.log(`  ❌ FAIL: ${orphanedOLtoSKU.length} orderlines reference missing SKUs`);
    allChecksPassed = false;
  }
  console.log('');

  // Check 2: Orderlines → Orders
  console.log('📋 Check 2: Orderlines → Orders');
  const { data: allOrders } = await lovable.from('order').select('id, customerid');

  const orderIds = new Set(allOrders?.map(o => o.id) || []);
  const orphanedOLtoOrder = allOrderlines?.filter(ol => !orderIds.has(ol.orderid)) || [];

  console.log(`  • Total orders: ${allOrders?.length || 0}`);
  console.log(`  • Orphaned (Order missing): ${orphanedOLtoOrder.length}`);

  if (orphanedOLtoOrder.length === 0) {
    console.log('  ✅ PASS: No orderlines reference missing orders');
  } else {
    console.log(`  ❌ FAIL: ${orphanedOLtoOrder.length} orderlines reference missing orders`);
    allChecksPassed = false;
  }
  console.log('');

  // Check 3: Orders → Customers
  console.log('📋 Check 3: Orders → Customers');
  const { data: allCustomers } = await lovable.from('customer').select('id');

  const customerIds = new Set(allCustomers?.map(c => c.id) || []);
  const orphanedOrders = allOrders?.filter(o => !customerIds.has(o.customerid)) || [];

  console.log(`  • Total customers: ${allCustomers?.length || 0}`);
  console.log(`  • Orphaned (Customer missing): ${orphanedOrders.length}`);

  if (orphanedOrders.length === 0) {
    console.log('  ✅ PASS: No orders reference missing customers');
  } else {
    console.log(`  ❌ FAIL: ${orphanedOrders.length} orders reference missing customers`);
    allChecksPassed = false;
  }
  console.log('');

  // Check 4: SKUs → Products
  console.log('📋 Check 4: SKUs → Products');
  const { data: allProducts } = await lovable.from('product').select('id');

  const productIds = new Set(allProducts?.map(p => p.id) || []);
  const orphanedSkus = allSkus?.filter(s => !productIds.has(s.productid)) || [];

  console.log(`  • Total products: ${allProducts?.length || 0}`);
  console.log(`  • Orphaned (Product missing): ${orphanedSkus.length}`);

  if (orphanedSkus.length === 0) {
    console.log('  ✅ PASS: No SKUs reference missing products');
  } else {
    console.log(`  ❌ FAIL: ${orphanedSkus.length} SKUs reference missing products`);
    allChecksPassed = false;
  }
  console.log('');

  // Summary
  console.log('='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log('');

  if (allChecksPassed) {
    console.log('🎉 SUCCESS: 100% DATABASE INTEGRITY ACHIEVED!');
    console.log('');
    console.log('✅ All foreign key relationships validated');
    console.log('✅ Zero orphaned records detected');
    console.log('✅ Database ready for production use');
    console.log('');
    console.log('Database is clean and consistent.');
  } else {
    console.log('❌ FAILURE: Database integrity issues detected');
    console.log('');
    console.log('Some orphaned records remain. Review failed checks above.');
  }

  console.log('');
  console.log('📈 FINAL DATABASE STATE');
  console.log('-'.repeat(70));
  console.log(`  Customers:  ${allCustomers?.length || 0}`);
  console.log(`  Products:   ${allProducts?.length || 0}`);
  console.log(`  SKUs:       ${allSkus?.length || 0}`);
  console.log(`  Orders:     ${allOrders?.length || 0}`);
  console.log(`  Orderlines: ${allOrderlines?.length || 0}`);
  console.log('');
}

main().catch(console.error);

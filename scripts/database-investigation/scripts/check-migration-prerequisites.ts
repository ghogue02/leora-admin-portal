#!/usr/bin/env npx tsx

/**
 * Check OrderLine Migration Prerequisites
 * Verifies that SKU and Product migrations are complete before starting
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

async function checkPrerequisites() {
  console.log('🔍 Checking OrderLine Migration Prerequisites...\n');

  const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

  // Check current state
  const { count: productCount } = await lovable
    .from('product')
    .select('*', { count: 'exact', head: true });

  const { count: skuCount } = await lovable
    .from('sku')
    .select('*', { count: 'exact', head: true });

  const { count: orderCount } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  const { count: orderlineCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  const { count: customerCount } = await lovable
    .from('customer')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Current Lovable Database State:');
  console.log('─'.repeat(50));
  console.log(`Products:   ${productCount?.toLocaleString() || 0}`);
  console.log(`SKUs:       ${skuCount?.toLocaleString() || 0}`);
  console.log(`Customers:  ${customerCount?.toLocaleString() || 0}`);
  console.log(`Orders:     ${orderCount?.toLocaleString() || 0}`);
  console.log(`OrderLines: ${orderlineCount?.toLocaleString() || 0}`);
  console.log(`Coverage:   ${orderCount ? ((orderlineCount || 0) / orderCount * 100).toFixed(1) : 0}%\n`);

  // Check prerequisites
  const checks = {
    products: productCount && productCount > 0,
    skus: skuCount && skuCount > 0,
    orders: orderCount && orderCount > 0,
    customers: customerCount && customerCount > 0,
    mappings: true // Will check files next
  };

  console.log('✅ Prerequisites Check:');
  console.log('─'.repeat(50));
  console.log(`${checks.products ? '✅' : '❌'} Products migrated: ${productCount || 0}`);
  console.log(`${checks.skus ? '✅' : '❌'} SKUs migrated: ${skuCount || 0}`);
  console.log(`${checks.customers ? '✅' : '❌'} Customers present: ${customerCount || 0}`);
  console.log(`${checks.orders ? '✅' : '❌'} Orders present: ${orderCount || 0}\n`);

  const allReady = Object.values(checks).every(v => v);

  if (allReady) {
    console.log('🎉 All prerequisites met! Ready to migrate OrderLines.\n');
    console.log('📋 Expected Migration:');
    console.log(`   Current: ${orderlineCount} orderlines (${orderCount ? ((orderlineCount || 0) / orderCount * 100).toFixed(1) : 0}% coverage)`);
    console.log(`   Target:  70%+ coverage (${Math.ceil((orderCount || 0) * 0.7)} orders need orderlines)`);
    console.log(`   Expected: ~2,000-3,000 new orderlines to import\n`);
  } else {
    console.log('❌ Prerequisites not met. Please complete migrations first:\n');
    if (!checks.products) console.log('   - Run Product migration');
    if (!checks.skus) console.log('   - Run SKU migration');
    console.log('');
  }

  return allReady;
}

checkPrerequisites().catch(console.error);

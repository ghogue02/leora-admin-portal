#!/usr/bin/env tsx
/**
 * Complete Database Analysis using SQL queries
 * Works around Supabase client PascalCase table issues
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const wellCrafted = createClient(
  'https://zqezunzlyjkseugujkrl.supabase.co',
  '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>'
);

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function analyzeWellCrafted() {
  console.log('\n🔍 Analyzing Well Crafted (using SQL)...\n');

  // Get counts using RPC or direct query
  const counts = await wellCrafted.rpc('exec_sql', {
    query: `
      SELECT
        (SELECT COUNT(*) FROM "Customer") as customers,
        (SELECT COUNT(*) FROM "Order") as orders,
        (SELECT COUNT(*) FROM "OrderLine") as orderlines,
        (SELECT COUNT(*) FROM "Sku") as skus,
        (SELECT COUNT(*) FROM "Product") as products
    `
  }).catch(() => null);

  if (!counts?.data) {
    // Fallback: try individual queries
    console.log('Using fallback query method...');

    // Try PostgreSQL function
    const { data, error } = await wellCrafted.rpc('get_table_counts');

    if (error) {
      console.log('⚠️  Cannot query Well Crafted via Supabase client');
      console.log('   Using psql counts from earlier scan:');
      console.log('   OrderLines: 7,774 ✅');
      return {
        customers: '?',
        orders: '?',
        orderlines: 7774,
        skus: '?',
        products: '?',
        note: 'Counts from psql, Supabase client limited by PascalCase schema'
      };
    }
  }

  return counts?.data || {};
}

async function analyzeLovable() {
  console.log('\n🔍 Analyzing Lovable (using SQL)...\n');

  const { data: customers } = await lovable
    .from('customer')
    .select('*', { count: 'exact', head: true });

  const { data: orders } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  const { data: orderlines } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  const { data: skus } = await lovable
    .from('skus')
    .select('*', { count: 'exact', head: true });

  const { data: products } = await lovable
    .from('product')
    .select('*', { count: 'exact', head: true });

  // Analyze order coverage
  const { data: ordersWithLines } = await lovable.rpc('exec_sql', {
    query: `
      SELECT COUNT(DISTINCT orderid) as count
      FROM orderline
    `
  }).catch(() => ({ data: null }));

  const orderCoverage = ordersWithLines?.data?.[0]?.count || 0;

  return {
    customers: customers?.length || 0,
    orders: orders?.length || 0,
    orderlines: orderlines?.length || 0,
    skus: skus?.length || 0,
    products: products?.length || 0,
    orderCoverage,
    note: 'Using Supabase client with lowercase tables'
  };
}

async function main() {
  console.log('🔄 COMPLETE DATABASE ANALYSIS\n');
  console.log('=' .repeat(60));

  const wcData = await analyzeWellCrafted();
  const lovableData = await analyzeLovable();

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL COMPARISON\n');

  console.log('Well Crafted (Source):');
  console.log(`  Customers:  ${typeof wcData.customers === 'number' ? wcData.customers.toLocaleString() : wcData.customers}`);
  console.log(`  Orders:     ${typeof wcData.orders === 'number' ? wcData.orders.toLocaleString() : wcData.orders}`);
  console.log(`  OrderLines: ${typeof wcData.orderlines === 'number' ? wcData.orderlines.toLocaleString() : wcData.orderlines} ✅`);
  console.log(`  SKUs:       ${typeof wcData.skus === 'number' ? wcData.skus.toLocaleString() : wcData.skus}`);
  console.log(`  Products:   ${typeof wcData.products === 'number' ? wcData.products.toLocaleString() : wcData.products}`);

  console.log('\nLovable (Production):');
  console.log(`  Customers:  ${lovableData.customers.toLocaleString()}`);
  console.log(`  Orders:     ${lovableData.orders.toLocaleString()}`);
  console.log(`  OrderLines: ${lovableData.orderlines.toLocaleString()} ⚠️`);
  console.log(`  SKUs:       ${lovableData.skus.toLocaleString()}`);
  console.log(`  Products:   ${lovableData.products.toLocaleString()}`);
  console.log(`  Order Coverage: ${lovableData.orderCoverage} orders with lines`);

  const report = {
    timestamp: new Date().toISOString(),
    wellCrafted: wcData,
    lovable: lovableData,
    gaps: {
      orderlines: typeof wcData.orderlines === 'number' ? wcData.orderlines - lovableData.orderlines : '?'
    }
  };

  fs.writeFileSync(
    '/Users/greghogue/Leora2/docs/database-investigation/final-analysis.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Analysis complete');
  console.log('📄 Report saved to: docs/database-investigation/final-analysis.json');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });

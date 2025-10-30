#!/usr/bin/env ts-node

/**
 * INVESTIGATE ORPHANED ORDERS
 *
 * We have 567 orphaned orders after migration. Let's find out why.
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

async function main() {
  console.log('🔍 Investigating orphaned orders...\n');

  // Get all orders
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, customerid, total, orderdate')
    .limit(5000);

  // Get all customers
  const { data: allCustomers } = await lovable
    .from('customer')
    .select('id, name, billingemail')
    .limit(5000);

  console.log(`Total orders: ${allOrders?.length || 0}`);
  console.log(`Total customers: ${allCustomers?.length || 0}`);

  // Find orphaned orders
  const customerIdSet = new Set((allCustomers || []).map(c => c.id));
  const orphaned = (allOrders || []).filter(o => !o.customerid || !customerIdSet.has(o.customerid));

  console.log(`\nOrphaned orders: ${orphaned.length}`);

  if (orphaned.length > 0) {
    console.log('\n📋 Sample orphaned orders:');
    orphaned.slice(0, 10).forEach((o, i) => {
      console.log(`${i + 1}. Order ID: ${o.id}`);
      console.log(`   Customer ID: ${o.customerid || 'NULL'}`);
      console.log(`   Total: $${o.total}`);
      console.log(`   Date: ${o.orderdate}`);

      // Check if customer ID exists anywhere
      if (o.customerid) {
        const customerExists = customerIdSet.has(o.customerid);
        console.log(`   Customer exists: ${customerExists ? 'YES' : 'NO'}`);
      }
      console.log();
    });

    // Analyze orphaned orders by customer ID
    const orphanedByCustomer = new Map<string, number>();
    orphaned.forEach(o => {
      const customerId = o.customerid || 'NULL';
      orphanedByCustomer.set(customerId, (orphanedByCustomer.get(customerId) || 0) + 1);
    });

    console.log('\n📊 Orphaned orders by customer ID (top 10):');
    const sorted = Array.from(orphanedByCustomer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sorted.forEach(([customerId, count], i) => {
      console.log(`${i + 1}. Customer ${customerId}: ${count} orphaned orders`);
    });

    // Check if we can find these customer IDs in the customer table
    console.log('\n🔍 Checking if these customer IDs exist:');
    for (const [customerId] of sorted.slice(0, 5)) {
      if (customerId === 'NULL') continue;

      const { data } = await lovable
        .from('customer')
        .select('id, name, billingemail')
        .eq('id', customerId)
        .limit(1);

      if (data && data.length > 0) {
        console.log(`✅ Customer ${customerId} EXISTS: ${data[0].name}`);
      } else {
        console.log(`❌ Customer ${customerId} NOT FOUND`);
      }
    }
  }

  // Check for duplicate orders
  console.log('\n🔍 Checking for duplicate orders...');
  const orderKeys = new Map<string, number>();
  (allOrders || []).forEach(o => {
    if (o.customerid && o.orderdate && o.total) {
      const key = `${o.customerid}-${o.orderdate}-${o.total}`;
      orderKeys.set(key, (orderKeys.get(key) || 0) + 1);
    }
  });

  const duplicates = Array.from(orderKeys.entries()).filter(([_, count]) => count > 1);
  console.log(`Found ${duplicates.length} duplicate order keys`);

  if (duplicates.length > 0) {
    console.log('\nSample duplicates:');
    duplicates.slice(0, 5).forEach(([key, count]) => {
      console.log(`  ${key}: ${count} copies`);
    });
  }
}

main();

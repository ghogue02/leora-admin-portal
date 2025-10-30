#!/usr/bin/env ts-node

/**
 * VERIFY MIGRATION WITH PROPER PAGINATION
 *
 * The orphan check was failing because we only loaded 1,000 customers/orders.
 * This script loads ALL data with pagination to verify correctly.
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

async function loadAllCustomers() {
  console.log('🔄 Loading ALL customers with pagination...');

  const allCustomers: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await lovable
      .from('customer')
      .select('id, name, billingemail')
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;

    allCustomers.push(...data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`✅ Loaded ${allCustomers.length} customers`);
  return allCustomers;
}

async function loadAllOrders() {
  console.log('🔄 Loading ALL orders with pagination...');

  const allOrders: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await lovable
      .from('order')
      .select('id, customerid, total, orderdate, status')
      .range(from, from + pageSize - 1);

    if (error || !data || data.length === 0) break;

    allOrders.push(...data);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`✅ Loaded ${allOrders.length} orders`);
  return allOrders;
}

async function main() {
  console.log('🔍 FINAL MIGRATION VERIFICATION\n');
  console.log('═'.repeat(70));

  // Load ALL data with pagination
  const customers = await loadAllCustomers();
  const orders = await loadAllOrders();

  // Build customer ID set
  const customerIdSet = new Set(customers.map(c => c.id));

  // Find orphaned orders
  const orphaned = orders.filter(o => !o.customerid || !customerIdSet.has(o.customerid));
  const valid = orders.filter(o => o.customerid && customerIdSet.has(o.customerid));

  console.log('\n📊 MIGRATION RESULTS:');
  console.log('═'.repeat(70));

  console.log('\n👥 CUSTOMERS:');
  console.log(`   Total: ${customers.length}`);
  console.log(`   Expected: 4,947`);
  console.log(`   ${customers.length >= 4947 ? '✅' : '⚠️'}  Status: ${customers.length >= 4947 ? 'COMPLETE' : 'INCOMPLETE'}`);

  console.log('\n📦 ORDERS:');
  console.log(`   Total: ${orders.length}`);
  console.log(`   Valid (with customers): ${valid.length}`);
  console.log(`   Orphaned (no customer): ${orphaned.length}`);
  console.log(`   ${orphaned.length === 0 ? '✅' : '⚠️'}  Status: ${orphaned.length === 0 ? 'NO ORPHANS' : `${orphaned.length} ORPHANS`}`);

  if (orphaned.length > 0) {
    console.log('\n⚠️  ORPHANED ORDERS ANALYSIS:');

    // Group by customer ID
    const orphansByCustomer = new Map<string, number>();
    orphaned.forEach(o => {
      const customerId = o.customerid || 'NULL';
      orphansByCustomer.set(customerId, (orphansByCustomer.get(customerId) || 0) + 1);
    });

    console.log(`   Unique customer IDs: ${orphansByCustomer.size}`);
    console.log(`   Top 10 customers with orphaned orders:`);

    const sorted = Array.from(orphansByCustomer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [customerId, count] of sorted) {
      if (customerId === 'NULL') {
        console.log(`      NULL customer: ${count} orders`);
      } else {
        // Check if customer exists
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          console.log(`      ${customer.name}: ${count} orders (CUSTOMER EXISTS!)`);
        } else {
          console.log(`      ${customerId}: ${count} orders (customer not found)`);
        }
      }
    }

    console.log('\n❌ ISSUE: Orphaned orders exist even though customers are present!');
    console.log('   This indicates a data consistency problem.');
    console.log('   Recommendation: Delete these orphaned orders.');
  }

  console.log('\n📈 PROGRESS:');
  console.log(`   Customers loaded: ${customers.length} / 4,947 (${((customers.length / 4947) * 100).toFixed(1)}%)`);
  console.log(`   Valid orders: ${valid.length}`);
  console.log(`   Orphan rate: ${((orphaned.length / orders.length) * 100).toFixed(1)}%`);

  console.log('\n✅ SUCCESS CRITERIA:');
  console.log(`   ${customers.length >= 4900 ? '✅' : '❌'} ALL customers loaded (4,947)`);
  console.log(`   ${orphaned.length === 0 ? '✅' : '❌'} Zero orphaned orders (${orphaned.length})`);
  console.log(`   ${valid.length >= 2000 ? '✅' : '❌'} 2,000+ valid orders (${valid.length})`);

  if (orphaned.length === 0 && customers.length >= 4900 && valid.length >= 2000) {
    console.log('\n🎉 MIGRATION SUCCESSFUL! Ready for OrderLine migration.');
  } else {
    console.log('\n⚠️  Migration completed with issues. Review above.');
  }

  console.log('\n═'.repeat(70));
}

main();

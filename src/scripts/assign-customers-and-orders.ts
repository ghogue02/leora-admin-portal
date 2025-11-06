#!/usr/bin/env tsx
/**
 * Assign Customers and Orders to Sales Reps Based on Sales Report
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Sales rep ID mapping from Lovable
const REP_IDS: Record<string, string> = {
  'Angela Fultz': 'b3cd8b69-53c3-4592-bf09-de8041e0728b',
  'Rosa-Anna Winchell': '5d660cf0-e3de-4d83-ab2a-cb4d55629fc0',
  'Ebony Booth': 'be6a090c-bda1-4b1e-88f6-0a8ebfeff4ef',
  'Jose Bustillo': '6b2bfc04-d081-439b-b4a5-97f3c595f6a6',
  'Mike Allen': '219fcb2c-03fa-43a3-9523-9ea04ff04ce7',
  'Jared Lorenz': 'b24f7662-b996-4d07-bcac-70e51273a496',
  'Nicole Shenandoah': '788703f3-9f40-446b-88a1-83cee48d8cdb',
  'Travis Vernon': null, // Need to create this one
};

async function buildCustomerRepMapping() {
  console.log('📊 Building Customer → Sales Rep mapping from CSV...\n');

  const csvPath = resolve(__dirname, '../../Sales report 2025-09-26 to 2025-10-22.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(3);

  const customerRepMap = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) continue;

    // Simple split (most fields don't have commas)
    const match = line.match(/"([^"]+)","([^"]+)"/);
    if (!match) continue;

    const customer = match[1]; // Column 10 (Customer)
    const salesperson = match[2]; // Column 11 (Salesperson)

    if (customer && salesperson && REP_IDS[salesperson]) {
      customerRepMap.set(customer, salesperson);
    }
  }

  console.log(`✅ Found ${customerRepMap.size} customer→salesperson mappings\n`);
  return customerRepMap;
}

async function assignCustomersToReps(mapping: Map<string, string>) {
  console.log('👥 Assigning Customers to Sales Reps...\n');

  let assigned = 0;
  let notFound = 0;

  for (const [customerName, repName] of mapping.entries()) {
    const repId = REP_IDS[repName];
    if (!repId) continue;

    const { error, count } = await supabase
      .from('customer')
      .update({ salesrepid: repId })
      .eq('tenantid', TENANT_ID)
      .ilike('name', customerName)
      .select('*', { count: 'exact', head: true });

    if (!error && count && count > 0) {
      assigned += count;
      if (assigned % 50 === 0) {
        console.log(`  Progress: ${assigned} customers assigned`);
      }
    } else if (count === 0) {
      notFound++;
    }
  }

  console.log(`\n✅ Assigned ${assigned} customers`);
  console.log(`⚠️  ${notFound} customers not found in database\n`);

  // Summary by rep
  console.log('📊 Assignments by Sales Rep:\n');
  for (const [repName, repId] of Object.entries(REP_IDS)) {
    if (!repId) continue;

    const { count } = await supabase
      .from('customer')
      .select('*', { count: 'exact', head: true })
      .eq('salesrepid', repId);

    console.log(`  ${repName}: ${count} customers`);
  }
  console.log('');
}

async function assignOrdersToReps() {
  console.log('📦 Assigning Orders to Sales Reps (via customer assignments)...\n');

  // Update orders to match their customer's sales rep
  const { data: orders } = await supabase
    .from('order')
    .select('id, customerid')
    .is('salesrepid', null);

  if (!orders) {
    console.log('No orders to assign\n');
    return;
  }

  let assigned = 0;

  for (const order of orders) {
    const { data: customer } = await supabase
      .from('customer')
      .select('salesrepid')
      .eq('id', order.customerid)
      .single();

    if (customer?.salesrepid) {
      await supabase
        .from('order')
        .update({ salesrepid: customer.salesrepid })
        .eq('id', order.id);
      assigned++;

      if (assigned % 100 === 0) {
        console.log(`  Progress: ${assigned}/${orders.length} orders`);
      }
    }
  }

  console.log(`\n✅ Assigned ${assigned} orders to sales reps\n`);
}

async function generateOrderNumbers() {
  console.log('🔢 Generating Order Numbers...\n');

  const { data: orders } = await supabase
    .from('order')
    .select('id, orderdate')
    .is('ordernumber', null)
    .order('orderdate', { ascending: true });

  if (!orders) return;

  let generated = 0;

  for (let i = 0; i < orders.length; i++) {
    const orderNum = `ORD-2025-${String(i + 1).padStart(4, '0')}`;

    await supabase
      .from('order')
      .update({ ordernumber: orderNum })
      .eq('id', orders[i].id);

    generated++;

    if (generated % 500 === 0) {
      console.log(`  Progress: ${generated}/${orders.length} order numbers`);
    }
  }

  console.log(`\n✅ Generated ${generated} order numbers\n`);
}

async function main() {
  console.log('🚀 Assigning Customers & Orders to Sales Reps\n');
  console.log('='.repeat(70) + '\n');

  try {
    const mapping = await buildCustomerRepMapping();
    await assignCustomersToReps(mapping);
    await assignOrdersToReps();
    await generateOrderNumbers();

    console.log('='.repeat(70));
    console.log('🎉 ASSIGNMENTS COMPLETE!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

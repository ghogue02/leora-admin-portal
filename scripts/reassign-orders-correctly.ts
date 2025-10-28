#!/usr/bin/env tsx
/**
 * Reassign Orders to Correct Sales Reps Based on Sales Report CSV
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY'
);

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Actual rep IDs from Lovable
const REP_IDS: Record<string, string> = {
  'Angela Fultz': 'b3cd8b69-53c3-4592-bf09-de8041e0728b',
  'Rosa-Anna Winchell': '5d660cf0-e3de-4d83-ab2a-cb4d55629fc0',
  'Ebony Booth': 'be6a090c-bda1-4b1e-88f6-0a8ebfeff4ef',
  'Jose Bustillo': '6b2bfc04-d081-439b-b4a5-97f3c595f6a6',
  'Mike Allen': '219fcb2c-03fa-43a3-9523-9ea04ff04ce7',
  'Jared Lorenz': 'b24f7662-b996-4d07-bcac-70e51273a496',
  'Nicole Shenandoah': '788703f3-9f40-446b-88a1-83cee48d8cdb',
};

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '\"') {
      if (inQuotes && nextChar === '\"') {
        current += '\"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

async function main() {
  console.log('🚀 Reassigning Orders Based on Sales Report\n');
  console.log('='.repeat(70) + '\n');

  // Parse CSV to build customer → salesperson map
  const csvPath = resolve(__dirname, '../../Sales report 2025-09-26 to 2025-10-22.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(3);

  const customerRepMap = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 26) continue;

    const customer = cols[9]; // Column 10 (Customer)
    const salesperson = cols[10]; // Column 11 (Salesperson)

    if (customer && salesperson && REP_IDS[salesperson]) {
      customerRepMap.set(customer.toLowerCase(), salesperson);
    }
  }

  console.log('📋 Found ' + customerRepMap.size + ' customer→rep mappings from CSV\n');

  // Step 1: Reassign customers based on CSV
  console.log('👥 Reassigning Customers...\n');

  let customersReassigned = 0;

  for (const [customerName, repName] of customerRepMap.entries()) {
    const repId = REP_IDS[repName];
    if (!repId) continue;

    const { count } = await supabase
      .from('customer')
      .update({ salesrepid: repId })
      .eq('tenantid', TENANT_ID)
      .ilike('name', customerName)
      .select('*', { count: 'exact', head: true });

    if (count && count > 0) {
      customersReassigned += count;
    }
  }

  console.log('✅ Reassigned ' + customersReassigned + ' customers\n');

  // Step 2: Reassign orders based on their customer's sales rep
  console.log('📦 Reassigning Orders to Match Customers...\n');

  const { data: orders } = await supabase
    .from('order')
    .select('id, customerid');

  let ordersReassigned = 0;

  if (orders) {
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

        ordersReassigned++;

        if (ordersReassigned % 100 === 0) {
          console.log('  Progress: ' + ordersReassigned + '/' + orders.length + ' orders');
        }
      }
    }
  }

  console.log('\n✅ Reassigned ' + ordersReassigned + ' orders\n');

  // Step 3: Show final distribution
  console.log('='.repeat(70));
  console.log('📊 FINAL DISTRIBUTION:\n');

  for (const [repName, repId] of Object.entries(REP_IDS)) {
    const { count: customers } = await supabase
      .from('customer')
      .select('*', { count: 'exact', head: true })
      .eq('salesrepid', repId);

    const { count: orders } = await supabase
      .from('order')
      .select('*', { count: 'exact', head: true })
      .eq('salesrepid', repId);

    console.log(repName + ':');
    console.log('  Customers: ' + customers);
    console.log('  Orders: ' + orders + '\n');
  }

  // Check for unassigned
  const { count: unassignedCustomers } = await supabase
    .from('customer')
    .select('*', { count: 'exact', head: true })
    .is('salesrepid', null);

  const { count: unassignedOrders } = await supabase
    .from('order')
    .select('*', { count: 'exact', head: true })
    .is('salesrepid', null);

  console.log('Unassigned:');
  console.log('  Customers: ' + unassignedCustomers);
  console.log('  Orders: ' + unassignedOrders + '\n');

  console.log('='.repeat(70));
  console.log('🎉 REASSIGNMENT COMPLETE!\n');
}

main();

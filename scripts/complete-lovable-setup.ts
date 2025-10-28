#!/usr/bin/env tsx
/**
 * Complete Lovable Setup - Fix All Data Issues with Smart Defaults
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

interface SalesRepData {
  name: string;
  email: string;
  territory: string;
  weeklyQuota: number;
  monthlyQuota: number;
  deliveryDay: string;
}

async function analyzeSalesReport(): Promise<Map<string, SalesRepData>> {
  console.log('📊 Analyzing sales report for territories and quotas...\n');

  const csvPath = resolve(__dirname, '../../Sales report 2025-09-26 to 2025-10-22.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(3); // Skip headers

  const repStats = new Map<string, { states: Set<string>; totalSales: number; invoices: number }>();

  for (const line of lines) {
    if (!line.trim()) continue;

    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 26) continue;

    const salesperson = cols[10];
    const state = cols[14];
    const netPrice = parseFloat(cols[25]?.replace(/,/g, '') || '0');

    if (!salesperson) continue;

    if (!repStats.has(salesperson)) {
      repStats.set(salesperson, { states: new Set(), totalSales: 0, invoices: 0 });
    }

    const stats = repStats.get(salesperson)!;
    if (state) stats.states.add(state);
    stats.totalSales += netPrice;
    stats.invoices++;
  }

  // Convert to SalesRepData
  const reps = new Map<string, SalesRepData>();
  const deliveryDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  let dayIndex = 0;

  for (const [name, stats] of repStats.entries()) {
    const weeklyAvg = stats.totalSales / 4; // 4 weeks in report
    const territory = Array.from(stats.states).join(', ') || 'General';

    reps.set(name, {
      name,
      email: name.toLowerCase().replace(/\s+/g, '.') + '@wellcrafted.com',
      territory,
      weeklyQuota: Math.round(weeklyAvg * 1.2), // 20% growth target
      monthlyQuota: Math.round(weeklyAvg * 4.8), // ~4 weeks/month * 1.2
      deliveryDay: deliveryDays[dayIndex % 5],
    });

    console.log(`  ${name}:`);
    console.log(`    Territory: ${territory}`);
    console.log(`    Sales (4 weeks): $${stats.totalSales.toFixed(2)}`);
    console.log(`    Weekly Quota: $${Math.round(weeklyAvg * 1.2)}`);
    console.log(`    Delivery Day: ${deliveryDays[dayIndex % 5]}\n`);

    dayIndex++;
  }

  return reps;
}

async function createSalesReps(reps: Map<string, SalesRepData>) {
  console.log('\n👔 Creating Sales Rep Records...\n');

  let created = 0;

  for (const rep of reps.values()) {
    // Create user/profile first
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .insert({
        tenantid: TENANT_ID,
        email: rep.email,
        firstname: rep.name.split(' ')[0],
        lastname: rep.name.split(' ').slice(1).join(' ') || null,
        role: 'SALES_REP',
        isactive: true,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      console.log(`❌ Error creating profile for ${rep.name}`);
      continue;
    }

    // Create sales rep record
    const { error: repError } = await supabase
      .from('salesreps')
      .insert({
        userid: profile.id,
        tenantid: TENANT_ID,
        territoryname: rep.territory,
        weeklyrevenuequota: rep.weeklyQuota,
        monthlyrevenuequota: rep.monthlyQuota,
        deliveryday: rep.deliveryDay,
        isactive: true,
      });

    if (!repError) {
      created++;
      console.log(`✅ Created sales rep: ${rep.name} (${rep.territory})`);
    }
  }

  console.log(`\n✅ Created ${created} sales rep records\n`);
}

async function assignCustomersToReps() {
  console.log('👥 Assigning Customers to Sales Reps...\n');

  // Read CSV to map customers to salespeople
  const csvPath = resolve(__dirname, '../../Sales report 2025-09-26 to 2025-10-22.csv');
  const content = readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(3);

  const customerRepMap = new Map<string, string>();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    if (cols.length < 26) continue;

    const customer = cols[9];
    const salesperson = cols[10];
    if (customer && salesperson) {
      customerRepMap.set(customer, salesperson);
    }
  }

  console.log(`Found ${customerRepMap.size} customer→salesperson mappings\n`);

  let updated = 0;

  for (const [customerName, salespersonName] of customerRepMap.entries()) {
    // Find sales rep ID
    const { data: repProfile } = await supabase
      .from('profile')
      .select('id')
      .ilike('email', `%${salespersonName.toLowerCase().replace(/\s+/g, '.')}%`)
      .limit(1)
      .single();

    if (!repProfile) continue;

    // Update customer
    const { error } = await supabase
      .from('customer')
      .update({ salesrepid: repProfile.id })
      .eq('tenantid', TENANT_ID)
      .ilike('name', customerName);

    if (!error) updated++;
  }

  console.log(`✅ Assigned ${updated} customers to sales reps\n`);
}

async function generateOrderNumbers() {
  console.log('🔢 Generating Order Numbers...\n');

  const { data: orders } = await supabase
    .from('order')
    .select('id, orderdate')
    .is('ordernumber', null)
    .order('orderdate', { ascending: true });

  if (!orders) return;

  let updated = 0;

  for (let i = 0; i < orders.length; i++) {
    const orderNum = `ORD-2025-${String(i + 1).padStart(4, '0')}`;

    const { error } = await supabase
      .from('order')
      .update({ ordernumber: orderNum })
      .eq('id', orders[i].id);

    if (!error) updated++;
  }

  console.log(`✅ Generated ${updated} order numbers\n`);
}

async function assignOrdersToReps() {
  console.log('📦 Assigning Orders to Sales Reps...\n');

  const { error } = await supabase.rpc('assign_orders_to_reps', {
    sql: `
      UPDATE "order" o
      SET salesrepid = c.salesrepid
      FROM customer c
      WHERE o.customerid = c.id
      AND c.salesrepid IS NOT NULL
      AND o.salesrepid IS NULL
    `
  });

  // Alternative: Direct update
  const { data: orders } = await supabase
    .from('order')
    .select('id, customerid')
    .is('salesrepid', null);

  let updated = 0;

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
        updated++;
      }
    }
  }

  console.log(`✅ Assigned ${updated} orders to sales reps\n`);
}

async function fixTenantIds() {
  console.log('🔧 Fixing Tenant IDs...\n');

  await supabase
    .from('activities')
    .update({ tenantid: TENANT_ID })
    .neq('tenantid', TENANT_ID);

  await supabase
    .from('task')
    .update({ tenantid: TENANT_ID })
    .neq('tenantid', TENANT_ID);

  console.log('✅ Fixed tenant IDs\n');
}

async function main() {
  console.log('🚀 Complete Lovable Setup - Smart Defaults\n');
  console.log('='.repeat(70) + '\n');

  try {
    const reps = await analyzeSalesReport();
    await createSalesReps(reps);
    await generateOrderNumbers();
    await assignCustomersToReps();
    await assignOrdersToReps();
    await fixTenantIds();

    console.log('='.repeat(70));
    console.log('🎉 SETUP COMPLETE!\n');
    console.log('✅ Sales reps created with territories and quotas');
    console.log('✅ Customers assigned to reps');
    console.log('✅ Orders assigned to reps');
    console.log('✅ Order numbers generated');
    console.log('✅ Tenant IDs fixed\n');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();

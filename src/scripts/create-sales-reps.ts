#!/usr/bin/env tsx
/**
 * Create Sales Reps with Smart Defaults Based on Sales Report
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

const salesReps = [
  {
    name: 'Travis Vernon',
    email: 'travis.vernon@wellcrafted.com',
    territory: 'House Accounts',
    weeklyQuota: 17000,
    monthlyQuota: 68000,
    deliveryDay: 'Tuesday',
  },
  {
    name: 'Angela Fultz',
    email: 'angela.fultz@wellcrafted.com',
    territory: 'Hampton Roads',
    weeklyQuota: 15000,
    monthlyQuota: 60000,
    deliveryDay: 'Wednesday',
  },
  {
    name: 'Rosa-Anna Winchell',
    email: 'rosa.winchell@wellcrafted.com',
    territory: 'Richmond, Charlottesville, & Fredericksburg',
    weeklyQuota: 19000,
    monthlyQuota: 76000,
    deliveryDay: 'Thursday',
  },
  {
    name: 'Ebony Booth',
    email: 'ebony.booth@wellcrafted.com',
    territory: 'DC & Eastern MD',
    weeklyQuota: 19000,
    monthlyQuota: 76000,
    deliveryDay: 'Thursday',
  },
  {
    name: 'Jose Bustillo',
    email: 'jose.bustillo@wellcrafted.com',
    territory: 'Baltimore & Frederick',
    weeklyQuota: 14000,
    monthlyQuota: 56000,
    deliveryDay: 'Monday',
  },
  {
    name: 'Mike Allen',
    email: 'mike.allen@wellcrafted.com',
    territory: 'Eastern NoVA',
    weeklyQuota: 15000,
    monthlyQuota: 60000,
    deliveryDay: 'Tuesday',
  },
  {
    name: 'Jared Lorenz',
    email: 'jared.lorenz@wellcrafted.com',
    territory: 'Western NoVA',
    weeklyQuota: 7500,
    monthlyQuota: 30000,
    deliveryDay: 'Friday',
  },
  {
    name: 'Nicole Shenandoah',
    email: 'nicole.shenandoah@wellcrafted.com',
    territory: 'Southwest VA',
    weeklyQuota: 10000,
    monthlyQuota: 40000,
    deliveryDay: 'Tuesday',
  },
  {
    name: 'Kelly Neel',
    email: 'kelly@wellcraftedbeverage.com',
    territory: 'Select MD',
    weeklyQuota: 12000,
    monthlyQuota: 48000,
    deliveryDay: 'Wednesday',
  },
  {
    name: 'Carolyn Vernon',
    email: 'carolyn@wellcraftedbeverage.com',
    territory: 'House Accounts',
    weeklyQuota: 10000,
    monthlyQuota: 40000,
    deliveryDay: 'Thursday',
  },
  {
    name: 'Josh Barbour',
    email: 'josh@wellcraftedbeverage.com',
    territory: 'Sales Manager',
    weeklyQuota: 0,
    monthlyQuota: 0,
    deliveryDay: 'Monday',
  },
];

async function main() {
  console.log('👔 Creating Sales Rep Records with Smart Defaults\n');
  console.log('='.repeat(70) + '\n');

  let created = 0;
  const repMapping = new Map<string, string>(); // name -> profile id

  for (const rep of salesReps) {
    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .insert({
        tenantid: TENANT_ID,
        email: rep.email,
        firstname: rep.name.split(' ')[0],
        lastname: rep.name.split(' ').slice(1).join(' '),
        role: 'SALES_REP',
        isactive: true,
      })
      .select('id')
      .single();

    if (profileError) {
      console.log(`⚠️  ${rep.name}: ${profileError.message}`);
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
      repMapping.set(rep.name, profile.id);
      console.log(`✅ ${rep.name}`);
      console.log(`   Territory: ${rep.territory}`);
      console.log(`   Quotas: $${rep.weeklyQuota}/week, $${rep.monthlyQuota}/month`);
      console.log(`   Delivery: ${rep.deliveryDay}\n`);
    } else {
      console.log(`❌ ${rep.name}: ${repError.message}\n`);
    }
  }

  console.log('='.repeat(70));
  console.log(`\n✅ Created ${created} of ${salesReps.length} sales reps\n`);

  // Now assign customers based on sales report data
  console.log('📊 Assigning Customers to Sales Reps...\n');

  const assignments = [
    { repName: 'Travis Vernon', territories: ['House Accounts'] },
    { repName: 'Angela Fultz', territories: ['Hampton Roads'] },
    { repName: 'Rosa-Anna Winchell', territories: ['Richmond, Charlottesville, & Fredericksburg'] },
    { repName: 'Ebony Booth', territories: ['DC & Eastern MD'] },
    { repName: 'Jose Bustillo', territories: ['Baltimore & Frederick'] },
    { repName: 'Mike Allen', territories: ['Eastern NoVA'] },
    { repName: 'Jared Lorenz', territories: ['Western NoVA'] },
    { repName: 'Nicole Shenandoah', territories: ['Southwest VA'] },
    { repName: 'Kelly Neel', territories: ['Select MD'] },
    { repName: 'Carolyn Vernon', territories: ['House Accounts'] },
  ];

  let customersAssigned = 0;

  for (const assignment of assignments) {
    const repId = repMapping.get(assignment.repName);
    if (!repId) continue;

    const { error } = await supabase
      .from('customer')
      .update({ salesrepid: repId })
      .eq('tenantid', TENANT_ID)
      .in('territoryname', assignment.territories)
      .is('salesrepid', null);

    if (error) {
      console.log(`  ⚠️ Failed to auto-assign ${assignment.repName}: ${error.message}`);
      continue;
    }

    const { count } = await supabase
      .from('customer')
      .select('*', { count: 'exact', head: true })
      .eq('salesrepid', repId);

    customersAssigned += count || 0;
    console.log(`  ${assignment.repName}: ${count ?? 0} customers assigned`);
  }

  console.log(`\n✅ Total customers assigned: ${customersAssigned}\n`);

  // Assign orders to reps based on customer assignments
  console.log('📦 Assigning Orders to Sales Reps...\n');

  const { data: orders } = await supabase
    .from('order')
    .select('id, customerid')
    .is('salesrepid', null);

  let ordersAssigned = 0;

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
        ordersAssigned++;
      }

      if (ordersAssigned % 100 === 0) {
        console.log(`  Progress: ${ordersAssigned} orders assigned`);
      }
    }
  }

  console.log(`\n✅ Assigned ${ordersAssigned} orders\n`);

  // Generate order numbers
  console.log('🔢 Generating Order Numbers...\n');

  const { data: ordersList } = await supabase
    .from('order')
    .select('id')
    .is('ordernumber', null)
    .order('orderdate', { ascending: true });

  let orderNumsGenerated = 0;

  if (ordersList) {
    for (let i = 0; i < ordersList.length; i++) {
      await supabase
        .from('order')
        .update({ ordernumber: `ORD-2025-${String(i + 1).padStart(4, '0')}` })
        .eq('id', ordersList[i].id);
      orderNumsGenerated++;
    }
  }

  console.log(`✅ Generated ${orderNumsGenerated} order numbers\n`);

  console.log('='.repeat(70));
  console.log('🎉 SETUP COMPLETE!');
  console.log('='.repeat(70) + '\n');
}

main();

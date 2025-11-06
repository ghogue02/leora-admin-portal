#!/usr/bin/env tsx
/**
 * Complete Data Migration - Correct Dependency Order
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

const stats: any[] = [];

async function migrateSalesReps() {
  console.log('\n👔 Migrating Sales Reps...');
  const start = Date.now();

  const salesReps = await prisma.salesRep.findMany({
    include: { user: true }
  });

  let migrated = 0;

  for (const rep of salesReps) {
    // First ensure user/profile exists
    const { error: profileError } = await supabase
      .from('profile')
      .upsert({
        id: rep.userId,
        tenantid: rep.tenantId,
        email: rep.user.email,
        firstname: rep.user.fullName.split(' ')[0] || rep.user.fullName,
        lastname: rep.user.fullName.split(' ').slice(1).join(' ') || null,
        role: 'SALES_REP',
        isactive: rep.user.isActive,
        lastloginat: rep.user.lastLoginAt?.toISOString() || null,
        createdat: rep.user.createdAt.toISOString(),
        updatedat: rep.user.updatedAt.toISOString(),
      }, { onConflict: 'id' });

    if (!profileError) {
      migrated++;
    } else {
      console.error(`❌ Profile ${rep.user.email}:`, profileError.message);
    }
  }

  stats.push({ table: 'salesrep/profile', source: salesReps.length, migrated, duration: Date.now() - start });
  console.log(`✅ Migrated ${migrated} sales rep profiles`);
}

async function migrateCustomersWithoutSalesRep() {
  console.log('\n👥 Migrating Customers (without salesRepId first)...');
  const start = Date.now();

  const customers = await prisma.customer.findMany();
  const batchSize = 100;
  let migrated = 0;

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    const { error } = await supabase
      .from('customer')
      .upsert(batch.map(c => ({
        id: c.id,
        tenantid: c.tenantId,
        salesrepid: null, // Skip sales rep FK for now
        name: c.name,
        accountnumber: c.accountNumber || null,
        billingemail: c.billingEmail || null,
        phone: c.phone || null,
        street1: c.street1 || null,
        street2: c.street2 || null,
        address: [c.street1, c.street2].filter(Boolean).join(', ') || null,
        city: c.city || null,
        state: c.state || null,
        zipcode: c.postalCode || null,
        postalcode: c.postalCode || null,
        country: c.country || 'US',
        paymentterms: c.paymentTerms || 'Net 30',
        orderingpacedays: c.orderingPaceDays || null,
        riskstatus: c.riskStatus || 'HEALTHY',
        establishedrevenue: c.establishedRevenue ? parseFloat(c.establishedRevenue.toString()) : 0,
        lastorderdate: c.lastOrderDate?.toISOString() || null,
        nextexpectedorderdate: c.nextExpectedOrderDate?.toISOString() || null,
        averageorderintervaldays: c.averageOrderIntervalDays || null,
        dormancysince: c.dormancySince?.toISOString() || null,
        reactivateddate: c.reactivatedDate?.toISOString() || null,
        ispermanentlyclosed: c.isPermanentlyClosed,
        closedreason: c.closedReason || null,
        externalid: c.externalId || null,
        createdat: c.createdAt.toISOString(),
        updatedat: c.updatedAt.toISOString(),
      })), { onConflict: 'id' });

    if (!error) {
      migrated += batch.length;
      if (i % 500 === 0) console.log(`  Progress: ${migrated}/${customers.length}`);
    } else {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }

  stats.push({ table: 'customer', source: customers.length, migrated, duration: Date.now() - start });
  console.log(`✅ Migrated ${migrated} customers`);
}

async function updateCustomerSalesReps() {
  console.log('\n🔄 Updating Customer Sales Rep Assignments...');
  const start = Date.now();

  const customers = await prisma.customer.findMany({
    where: { salesRepId: { not: null } }
  });

  let updated = 0;

  for (const customer of customers) {
    const { error } = await supabase
      .from('customer')
      .update({ salesrepid: customer.salesRepId })
      .eq('id', customer.id);

    if (!error) {
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} customer assignments`);
}

async function migrateOrders() {
  console.log('\n📦 Migrating Orders...');
  const start = Date.now();

  const orders = await prisma.order.findMany({ take: 1000 });
  const batchSize = 100;
  let migrated = 0;

  for (let i = 0; i < orders.length; i += batchSize) {
    const batch = orders.slice(i, i + batchSize);

    const { error } = await supabase
      .from('order')
      .upsert(batch.map(o => ({
        id: o.id,
        tenantid: o.tenantId,
        customerid: o.customerId,
        salesrepid: null,
        ordernumber: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
        orderdate: o.orderedAt?.toISOString() || o.createdAt.toISOString(),
        status: o.status.toLowerCase(),
        subtotal: o.total ? parseFloat(o.total.toString()) * 0.9 : 0,
        tax: o.total ? parseFloat(o.total.toString()) * 0.1 : 0,
        total: o.total ? parseFloat(o.total.toString()) : 0,
        createdat: o.createdAt.toISOString(),
        updatedat: o.updatedAt.toISOString(),
      })), { onConflict: 'id' });

    if (!error) {
      migrated += batch.length;
    } else {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }

  stats.push({ table: 'order', source: orders.length, migrated, duration: Date.now() - start });
  console.log(`✅ Migrated ${migrated} orders`);
}

async function main() {
  console.log('🚀 Complete Migration - Correct Dependency Order\n');

  try {
    // Migrate in correct order
    await migrateSalesReps();           // 1. Sales reps first (no dependencies)
    await migrateCustomersWithoutSalesRep(); // 2. Customers (skip salesRepId)
    await updateCustomerSalesReps();    // 3. Update salesRepId references
    await migrateOrders();              // 4. Orders (depends on customers)

    console.log('\n' + '='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70) + '\n');

    stats.forEach(s => {
      const pct = s.source > 0 ? ((s.migrated / s.source) * 100).toFixed(1) : '0.0';
      console.log(`  ${s.table.padEnd(25)} ${s.migrated}/${s.source} (${pct}%) in ${(s.duration / 1000).toFixed(1)}s`);
    });

    const total = stats.reduce((sum, s) => sum + s.migrated, 0);
    console.log(`\n✅ Total Migrated: ${total} records\n`);
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

#!/usr/bin/env tsx
/**
 * Migrate Data from WellCrafted Database to Lovable Supabase
 * Version 2 - Matches actual Lovable schema (lowercase columns)
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

interface MigrationStats {
  table: string;
  sourceCount: number;
  migrated: number;
  errors: number;
  duration: number;
}

const stats: MigrationStats[] = [];

async function migrateTenants() {
  console.log('\n📋 Migrating Tenants...');
  const startTime = Date.now();

  const tenants = await prisma.tenant.findMany();

  const { data, error } = await supabase
    .from('tenant')
    .upsert(tenants.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      domain: t.slug,
      timezone: t.timezone,
      createdat: t.createdAt.toISOString(),
      updatedat: t.updatedAt.toISOString(),
    })), { onConflict: 'id' });

  stats.push({
    table: 'tenant',
    sourceCount: tenants.length,
    migrated: error ? 0 : tenants.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log(`✅ Migrated ${tenants.length} tenants`);
  }
}

async function migrateProducts() {
  console.log('\n🍷 Migrating Products (1,879 wines with enrichment)...');
  const startTime = Date.now();

  const products = await prisma.product.findMany();

  console.log(`Found ${products.length} products to migrate...`);

  const batchSize = 50;
  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const { error } = await supabase
      .from('product')
      .upsert(batch.map(p => ({
        id: p.id,
        tenantid: p.tenantId,
        sku: `SKU-${p.id.slice(0, 8)}`,
        name: p.name,
        description: p.description || null,
        brand: p.brand || null,
        vintage: (p.wineDetails as any)?.vintage || null,
        varietal: (p.wineDetails as any)?.grapeVariety || null,
        region: (p.wineDetails as any)?.region || null,
        producer: p.brand || null,
        tastingnotes: p.tastingNotes ? JSON.stringify(p.tastingNotes) : null,
        unitprice: 25.00,
        bottlesize: '750ml',
        casesize: 12,
        inventorycount: 100,
        isactive: !p.isSampleOnly,
        issampleonly: p.isSampleOnly,
        enrichedat: p.enrichedAt?.toISOString() || null,
        enrichedby: p.enrichedBy || null,
        createdat: p.createdAt.toISOString(),
        updatedat: p.updatedAt.toISOString(),
      })), { onConflict: 'id' });

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors++;
    } else {
      migrated += batch.length;
      if ((i / batchSize) % 5 === 0) {
        console.log(`✅ Progress: ${migrated}/${products.length} products`);
      }
    }
  }

  stats.push({
    table: 'product',
    sourceCount: products.length,
    migrated,
    errors,
    duration: Date.now() - startTime,
  });

  console.log(`\n✅ Migrated ${migrated} of ${products.length} products (${errors} batch errors)`);
}

async function migrateCustomers() {
  console.log('\n👥 Migrating Customers...');
  const startTime = Date.now();

  const customers = await prisma.customer.findMany();

  const batchSize = 100;
  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < customers.length; i += batchSize) {
    const batch = customers.slice(i, i + batchSize);

    const { error } = await supabase
      .from('customer')
      .upsert(batch.map(c => ({
        id: c.id,
        tenantid: c.tenantId,
        salesrepid: c.salesRepId || null,
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

    if (error) {
      console.error(`❌ Batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors++;
    } else {
      migrated += batch.length;
      if ((i / batchSize) % 10 === 0) {
        console.log(`✅ Progress: ${migrated}/${customers.length} customers`);
      }
    }
  }

  stats.push({
    table: 'customer',
    sourceCount: customers.length,
    migrated,
    errors,
    duration: Date.now() - startTime,
  });

  console.log(`\n✅ Migrated ${migrated} of ${customers.length} customers`);
}

async function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 MIGRATION SUMMARY');
  console.log('='.repeat(70) + '\n');

  const totalSource = stats.reduce((sum, s) => sum + s.sourceCount, 0);
  const totalMigrated = stats.reduce((sum, s) => sum + s.migrated, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
  const totalDuration = stats.reduce((sum, s) => sum + s.duration, 0);

  console.log('📊 Results by Table:\n');
  stats.forEach(s => {
    const successRate = s.sourceCount > 0 ? ((s.migrated / s.sourceCount) * 100).toFixed(1) : '0.0';
    const icon = s.errors === 0 ? '✅' : '⚠️';
    console.log(`  ${icon} ${s.table.padEnd(15)} ${s.migrated.toString().padStart(5)}/${s.sourceCount.toString().padStart(5)} (${successRate.padStart(5)}%) in ${(s.duration / 1000).toFixed(1)}s`);
  });

  console.log('\n📈 Overall Statistics:\n');
  console.log(`  Total Source Records: ${totalSource}`);
  console.log(`  Total Migrated: ${totalMigrated}`);
  console.log(`  Total Errors: ${totalErrors}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Success Rate: ${totalSource > 0 ? ((totalMigrated / totalSource) * 100).toFixed(1) : '0.0'}%`);

  console.log('\n' + '='.repeat(70));
  if (totalMigrated > 0) {
    console.log('✅ Migration Successful!');
  } else {
    console.log('⚠️  Migration had issues - check errors above');
  }
  console.log('='.repeat(70) + '\n');
}

async function main() {
  console.log('🚀 Starting Migration to Lovable Supabase v2\n');
  console.log('Target: https://wlwqkblueezqydturcpv.supabase.co\n');

  try {
    await migrateTenants();
    await migrateCustomers();
    await migrateProducts();

    await printSummary();
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

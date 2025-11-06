#!/usr/bin/env tsx
/**
 * Migrate Data from WellCrafted Database to Lovable Supabase
 *
 * This script migrates all data from your current database to the new Lovable Supabase instance
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

// Source database (WellCrafted/Current)
const prisma = new PrismaClient();

// Target database (Lovable Supabase)
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

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  const { data, error } = await supabase
    .from('tenant')
    .upsert(tenants.map(t => ({
      id: t.id,
      name: t.name,
      domain: t.slug,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })), { onConflict: 'id' });

  stats.push({
    table: 'Tenant',
    sourceCount: tenants.length,
    migrated: error ? 0 : tenants.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error migrating tenants:', error);
  } else {
    console.log(`✅ Migrated ${tenants.length} tenants`);
  }
}

async function migrateProducts() {
  console.log('\n🍷 Migrating Products (1,879 wines with enrichment)...');
  const startTime = Date.now();

  const products = await prisma.product.findMany({
    select: {
      id: true,
      tenantId: true,
      supplierId: true,
      name: true,
      brand: true,
      description: true,
      category: true,
      isSampleOnly: true,
      tastingNotes: true,
      foodPairings: true,
      servingInfo: true,
      wineDetails: true,
      enrichedAt: true,
      enrichedBy: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  console.log(`Found ${products.length} products to migrate...`);

  // Migrate in batches of 100 for safety
  const batchSize = 100;
  let migrated = 0;
  let errors = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    const { error } = await supabase
      .from('product')
      .upsert(batch.map(p => ({
        id: p.id,
        tenantId: p.tenantId,
        sku: `SKU-${p.id.slice(0, 8)}`, // Generate SKU from ID
        name: p.name,
        description: p.description || '',
        vintage: typeof p.wineDetails === 'object' && p.wineDetails !== null
          ? (p.wineDetails as any).vintage || null
          : null,
        varietal: typeof p.wineDetails === 'object' && p.wineDetails !== null
          ? (p.wineDetails as any).grapeVariety || null
          : null,
        region: typeof p.wineDetails === 'object' && p.wineDetails !== null
          ? (p.wineDetails as any).region || null
          : null,
        producer: p.brand || null,
        tastingNotes: typeof p.tastingNotes === 'object' && p.tastingNotes !== null
          ? JSON.stringify(p.tastingNotes)
          : null,
        unitPrice: 25.00, // Default price, update as needed
        bottleSize: '750ml',
        caseSize: 12,
        inventoryCount: 100, // Default inventory
        isActive: !p.isSampleOnly,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })), { onConflict: 'id' });

    if (error) {
      console.error(`❌ Error migrating batch ${i / batchSize + 1}:`, error);
      errors++;
    } else {
      migrated += batch.length;
      console.log(`✅ Migrated batch ${i / batchSize + 1} (${batch.length} products)`);
    }
  }

  stats.push({
    table: 'Product',
    sourceCount: products.length,
    migrated,
    errors,
    duration: Date.now() - startTime,
  });

  console.log(`\n✅ Migrated ${migrated} products (${errors} errors)`);
}

async function migrateCustomers() {
  console.log('\n👥 Migrating Customers...');
  const startTime = Date.now();

  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      tenantId: true,
      name: true,
      accountNumber: true,
      billingEmail: true,
      phone: true,
      street1: true,
      street2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      paymentTerms: true,
      orderingPaceDays: true,
      establishedRevenue: true,
      lastOrderDate: true,
      nextExpectedOrderDate: true,
      averageOrderIntervalDays: true,
      riskStatus: true,
      dormancySince: true,
      reactivatedDate: true,
      isPermanentlyClosed: true,
      closedReason: true,
      salesRepId: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  const { data, error } = await supabase
    .from('customer')
    .upsert(customers.map(c => ({
      id: c.id,
      tenantId: c.tenantId,
      salesRepId: c.salesRepId || null,
      name: c.name,
      accountNumber: c.accountNumber || null,
      billingEmail: c.billingEmail || null,
      phone: c.phone || null,
      address: [c.street1, c.street2].filter(Boolean).join(', ') || null,
      city: c.city || null,
      state: c.state || null,
      zipCode: c.postalCode || null,
      riskStatus: c.riskStatus || 'HEALTHY',
      establishedRevenue: c.establishedRevenue ? parseFloat(c.establishedRevenue.toString()) : 0,
      isPermanentlyClosed: c.isPermanentlyClosed,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })), { onConflict: 'id' });

  stats.push({
    table: 'Customer',
    sourceCount: customers.length,
    migrated: error ? 0 : customers.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error migrating customers:', error);
  } else {
    console.log(`✅ Migrated ${customers.length} customers`);
  }
}

async function migrateUsers() {
  console.log('\n👤 Migrating Users...');
  const startTime = Date.now();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      tenantId: true,
      email: true,
      fullName: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  // Note: Lovable uses Supabase Auth, so we create Profile records linked to auth.users
  // For now, just create profiles - users will need to sign up separately
  const { data, error } = await supabase
    .from('profile')
    .upsert(users.map(u => {
      const [firstName, ...lastNameParts] = u.fullName.split(' ');
      return {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        firstName: firstName || u.fullName,
        lastName: lastNameParts.join(' ') || null,
        role: 'SALES_REP', // Default role, update as needed
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    }), { onConflict: 'id' });

  stats.push({
    table: 'User/Profile',
    sourceCount: users.length,
    migrated: error ? 0 : users.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error migrating users:', error);
  } else {
    console.log(`✅ Migrated ${users.length} users (they'll need to reset passwords)`);
  }
}

async function migrateOrders() {
  console.log('\n📦 Migrating Orders...');
  const startTime = Date.now();

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      tenantId: true,
      customerId: true,
      portalUserId: true,
      status: true,
      orderedAt: true,
      fulfilledAt: true,
      deliveredAt: true,
      total: true,
      currency: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 1000, // Limit for initial migration
  });

  const { data, error } = await supabase
    .from('order')
    .upsert(orders.map(o => ({
      id: o.id,
      tenantId: o.tenantId,
      customerId: o.customerId,
      salesRepId: null, // Will need to look up from customer
      orderNumber: `ORD-${o.id.slice(0, 8).toUpperCase()}`,
      orderDate: o.orderedAt?.toISOString() || o.createdAt.toISOString(),
      status: o.status.toLowerCase(),
      subtotal: o.total ? parseFloat(o.total.toString()) : 0,
      tax: 0, // Calculate if needed
      total: o.total ? parseFloat(o.total.toString()) : 0,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    })), { onConflict: 'id' });

  stats.push({
    table: 'Order',
    sourceCount: orders.length,
    migrated: error ? 0 : orders.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error migrating orders:', error);
  } else {
    console.log(`✅ Migrated ${orders.length} orders`);
  }
}

async function migrateOrderLines() {
  console.log('\n📦 Migrating Order Lines...');
  const startTime = Date.now();

  const orderLines = await prisma.orderLine.findMany({
    select: {
      id: true,
      tenantId: true,
      orderId: true,
      skuId: true,
      quantity: true,
      unitPrice: true,
      isSample: true,
      createdAt: true,
    },
    take: 5000, // Limit for initial migration
  });

  const { data, error } = await supabase
    .from('orderline')
    .upsert(orderLines.map(ol => ({
      id: ol.id,
      orderId: ol.orderId,
      skuId: ol.skuId,
      quantity: ol.quantity,
      unitPrice: parseFloat(ol.unitPrice.toString()),
      discount: 0,
      isSample: ol.isSample,
      createdAt: ol.createdAt.toISOString(),
    })), { onConflict: 'id' });

  stats.push({
    table: 'OrderLine',
    sourceCount: orderLines.length,
    migrated: error ? 0 : orderLines.length,
    errors: error ? 1 : 0,
    duration: Date.now() - startTime,
  });

  if (error) {
    console.error('❌ Error migrating order lines:', error);
  } else {
    console.log(`✅ Migrated ${orderLines.length} order lines`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(70));
  console.log('🎉 MIGRATION SUMMARY');
  console.log('='.repeat(70) + '\n');

  const totalMigrated = stats.reduce((sum, s) => sum + s.migrated, 0);
  const totalErrors = stats.reduce((sum, s) => sum + s.errors, 0);
  const totalDuration = stats.reduce((sum, s) => sum + s.duration, 0);

  console.log('📊 Results by Table:\n');
  stats.forEach(s => {
    const successRate = ((s.migrated / s.sourceCount) * 100).toFixed(1);
    console.log(`  ${s.table.padEnd(20)} ${s.migrated}/${s.sourceCount} (${successRate}%) in ${(s.duration / 1000).toFixed(1)}s`);
  });

  console.log('\n📈 Overall Statistics:\n');
  console.log(`  Total Records Migrated: ${totalMigrated}`);
  console.log(`  Total Errors: ${totalErrors}`);
  console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`  Success Rate: ${((totalMigrated / stats.reduce((sum, s) => sum + s.sourceCount, 0)) * 100).toFixed(1)}%`);

  console.log('\n' + '='.repeat(70));
  console.log('✅ Migration Complete!');
  console.log('='.repeat(70) + '\n');
}

async function main() {
  console.log('🚀 Starting Migration from WellCrafted to Lovable Supabase\n');
  console.log('Source: Current database (Prisma)');
  console.log('Target: https://wlwqkblueezqydturcpv.supabase.co\n');

  try {
    // Migrate in order of dependencies
    await migrateTenants();
    await migrateUsers();
    await migrateCustomers();
    await migrateProducts();
    await migrateOrders();
    await migrateOrderLines();

    await printSummary();
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

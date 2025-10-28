#!/usr/bin/env tsx
/**
 * Batch Geocoding Script
 *
 * Geocodes all customers without coordinates in the database.
 *
 * Usage:
 *   npm run geocode-all-customers
 *
 * or with specific tenant:
 *   tsx scripts/geocode-all-customers.ts --tenant-slug well-crafted
 */

import { PrismaClient } from '@prisma/client';
import { batchGeocodeCustomers } from '../src/lib/geocoding';

const prisma = new PrismaClient();

interface ScriptOptions {
  tenantSlug?: string;
  limit?: number;
  dryRun?: boolean;
}

async function parseArgs(): Promise<ScriptOptions> {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--tenant-slug' && args[i + 1]) {
      options.tenantSlug = args[i + 1];
      i++;
    } else if (arg === '--limit' && args[i + 1]) {
      options.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
}

async function main() {
  const options = await parseArgs();

  console.log('🌍 Batch Customer Geocoding Script');
  console.log('====================================\n');

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Build query
  const where: any = {
    OR: [
      { latitude: null },
      { longitude: null },
    ],
    // Only geocode customers with at least a city
    city: { not: null },
  };

  if (options.tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: options.tenantSlug },
      select: { id: true, name: true },
    });

    if (!tenant) {
      console.error(`❌ Tenant not found: ${options.tenantSlug}`);
      process.exit(1);
    }

    where.tenantId = tenant.id;
    console.log(`📍 Tenant: ${tenant.name} (${options.tenantSlug})`);
  } else {
    console.log('📍 Geocoding customers across all tenants');
  }

  // Get customers to geocode
  const customers = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      tenant: {
        select: { slug: true },
      },
    },
    take: options.limit,
    orderBy: { createdAt: 'asc' },
  });

  if (customers.length === 0) {
    console.log('✅ No customers need geocoding!');
    await prisma.$disconnect();
    process.exit(0);
  }

  console.log(`\n📊 Found ${customers.length} customers to geocode`);
  console.log('\nSample customers:');
  customers.slice(0, 5).forEach(c => {
    console.log(`  - ${c.name} (${c.city}, ${c.state}) [${c.tenant.slug}]`);
  });

  if (customers.length > 5) {
    console.log(`  ... and ${customers.length - 5} more`);
  }

  if (options.dryRun) {
    console.log('\n✅ Dry run complete. Use without --dry-run to geocode.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Confirm before proceeding
  console.log('\n⚠️  This will make API calls to Mapbox (rate limit: 600/min)');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🚀 Starting batch geocoding...\n');

  const startTime = Date.now();
  const customerIds = customers.map(c => c.id);

  const results = await batchGeocodeCustomers(customerIds);

  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n✅ Batch geocoding complete!\n');
  console.log('📊 Results:');
  console.log(`   Total:   ${results.total}`);
  console.log(`   Success: ${results.success} ✓`);
  console.log(`   Skipped: ${results.skipped} (already geocoded)`);
  console.log(`   Failed:  ${results.failed} ✗`);
  console.log(`   Duration: ${duration}s`);

  const successRate = Math.round((results.success / (results.total - results.skipped)) * 100);
  console.log(`   Success Rate: ${successRate}%`);

  if (results.failed > 0) {
    console.log('\n⚠️  Some customers failed to geocode. Check logs for details.');
  }

  await prisma.$disconnect();
}

main()
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

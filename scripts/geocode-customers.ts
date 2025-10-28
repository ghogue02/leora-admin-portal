#!/usr/bin/env tsx
/**
 * Geocode customers script
 * Finds all customers without coordinates and geocodes them using Mapbox
 *
 * Usage:
 *   npx tsx scripts/geocode-customers.ts --tenant-id=<uuid> [--batch-size=50]
 *   npx tsx scripts/geocode-customers.ts --all [--batch-size=50]
 */

import { PrismaClient } from '@prisma/client';
import { geocodeCustomer, batchGeocodeCustomers } from '../src/lib/geocoding';

const prisma = new PrismaClient();

interface Options {
  tenantId?: string;
  all?: boolean;
  batchSize?: number;
  dryRun?: boolean;
}

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const options: Options = {
    batchSize: 50,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--tenant-id=')) {
      options.tenantId = arg.split('=')[1];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--batch-size=')) {
      options.batchSize = parseInt(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help') {
      console.log(`
Usage: npx tsx scripts/geocode-customers.ts [options]

Options:
  --tenant-id=<uuid>    Geocode customers for specific tenant
  --all                 Geocode customers for all tenants
  --batch-size=<n>      Number of customers to process at once (default: 50)
  --dry-run             Show what would be geocoded without actually doing it
  --help                Show this help message

Environment variables:
  MAPBOX_SECRET_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN   Required for geocoding

Examples:
  # Geocode all customers for a specific tenant
  npx tsx scripts/geocode-customers.ts --tenant-id=abc-123

  # Dry run to see what would be geocoded
  npx tsx scripts/geocode-customers.ts --tenant-id=abc-123 --dry-run

  # Geocode for all tenants with batch size of 100
  npx tsx scripts/geocode-customers.ts --all --batch-size=100
      `);
      process.exit(0);
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  // Check for Mapbox token
  if (!process.env.MAPBOX_SECRET_TOKEN && !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    console.error('❌ Error: MAPBOX_SECRET_TOKEN or NEXT_PUBLIC_MAPBOX_TOKEN environment variable not set');
    process.exit(1);
  }

  // Validate options
  if (!options.tenantId && !options.all) {
    console.error('❌ Error: Must specify --tenant-id or --all');
    console.log('Run with --help for usage information');
    process.exit(1);
  }

  console.log('🗺️  Customer Geocoding Script');
  console.log('============================\n');

  if (options.dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made\n');
  }

  // Build where clause
  const where: any = {
    OR: [
      { latitude: null },
      { longitude: null },
    ],
  };

  if (options.tenantId) {
    where.tenantId = options.tenantId;
    console.log(`📍 Tenant: ${options.tenantId}`);
  } else {
    console.log('📍 Processing all tenants');
  }

  // Find customers needing geocoding
  console.log('\n🔍 Finding customers without coordinates...');

  const customersNeedingGeocode = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      street1: true,
      street2: true,
      city: true,
      state: true,
      postalCode: true,
      country: true,
      latitude: true,
      longitude: true,
      tenantId: true,
    },
  });

  console.log(`Found ${customersNeedingGeocode.length} customers needing geocoding`);

  if (customersNeedingGeocode.length === 0) {
    console.log('\n✅ All customers already have coordinates!');
    await prisma.$disconnect();
    return;
  }

  // Show breakdown by completeness
  const withAddress = customersNeedingGeocode.filter(
    c => c.street1 || c.city || c.postalCode
  );
  const withoutAddress = customersNeedingGeocode.length - withAddress.length;

  console.log(`  ${withAddress.length} with partial/complete address`);
  console.log(`  ${withoutAddress} without address (will be skipped)`);

  if (options.dryRun) {
    console.log('\n📋 Sample customers that would be geocoded:');
    customersNeedingGeocode.slice(0, 5).forEach(c => {
      const address = [c.street1, c.city, c.state, c.postalCode]
        .filter(Boolean)
        .join(', ');
      console.log(`  • ${c.name}: ${address || '(no address)'}`);
    });
    console.log('\n⚠️  Dry run complete. Use without --dry-run to actually geocode.');
    await prisma.$disconnect();
    return;
  }

  // Process in batches
  const batchSize = options.batchSize || 50;
  const totalBatches = Math.ceil(customersNeedingGeocode.length / batchSize);

  console.log(`\n🚀 Starting geocoding in ${totalBatches} batch(es) of ${batchSize}...`);
  console.log('⏱️  This may take several minutes depending on the number of customers.\n');

  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (let i = 0; i < totalBatches; i++) {
    const startIdx = i * batchSize;
    const endIdx = Math.min(startIdx + batchSize, customersNeedingGeocode.length);
    const batch = customersNeedingGeocode.slice(startIdx, endIdx);

    console.log(`📦 Processing batch ${i + 1}/${totalBatches} (${batch.length} customers)...`);

    const customerIds = batch.map(c => c.id);
    const results = await batchGeocodeCustomers(customerIds);

    totalSuccess += results.success;
    totalFailed += results.failed;
    totalSkipped += results.skipped;

    console.log(`  ✅ Success: ${results.success}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  ⏭️  Skipped: ${results.skipped}\n`);

    // Rate limiting pause between batches
    if (i < totalBatches - 1) {
      console.log('⏸️  Pausing 2 seconds before next batch...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Summary
  console.log('\n🎉 Geocoding Complete!');
  console.log('======================');
  console.log(`Total processed: ${customersNeedingGeocode.length}`);
  console.log(`✅ Successfully geocoded: ${totalSuccess}`);
  console.log(`❌ Failed: ${totalFailed}`);
  console.log(`⏭️  Skipped: ${totalSkipped}`);

  if (totalSuccess > 0) {
    const successRate = ((totalSuccess / customersNeedingGeocode.length) * 100).toFixed(1);
    console.log(`\n📊 Success rate: ${successRate}%`);
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

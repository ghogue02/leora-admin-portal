#!/usr/bin/env tsx
/**
 * Geocoding Report Generator
 * Creates detailed report of geocoding status and results
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface GeocodeStats {
  totalCustomers: number;
  geocoded: number;
  notGeocoded: number;
  percentComplete: number;
  byState: Array<{ state: string; total: number; geocoded: number }>;
  recentlyGeocoded: Array<{ id: string; name: string; geocodedAt: Date }>;
  failedSample: Array<{ id: string; name: string; address: string }>;
}

async function generateReport(tenantId: string): Promise<GeocodeStats> {
  console.log('📊 Generating Geocoding Report...\n');

  // Total customers
  const totalCustomers = await prisma.customer.count({
    where: { tenantId }
  });

  // Geocoded customers
  const geocoded = await prisma.customer.count({
    where: {
      tenantId,
      latitude: { not: null },
      longitude: { not: null }
    }
  });

  const notGeocoded = totalCustomers - geocoded;
  const percentComplete = (geocoded / totalCustomers) * 100;

  // Breakdown by state
  const byStateRaw = await prisma.customer.groupBy({
    by: ['state'],
    where: { tenantId },
    _count: true
  });

  const byState = await Promise.all(
    byStateRaw.map(async (item) => {
      const geocodedCount = await prisma.customer.count({
        where: {
          tenantId,
          state: item.state,
          latitude: { not: null },
          longitude: { not: null }
        }
      });

      return {
        state: item.state || 'Unknown',
        total: item._count,
        geocoded: geocodedCount
      };
    })
  );

  // Recently geocoded (last 10)
  const recentlyGeocodedRaw = await prisma.customer.findMany({
    where: {
      tenantId,
      geocodedAt: { not: null }
    },
    select: {
      id: true,
      name: true,
      geocodedAt: true
    },
    orderBy: { geocodedAt: 'desc' },
    take: 10
  });

  const recentlyGeocoded = recentlyGeocodedRaw.map(c => ({
    id: c.id,
    name: c.name,
    geocodedAt: c.geocodedAt!
  }));

  // Failed addresses (sample of 10)
  const failedSampleRaw = await prisma.customer.findMany({
    where: {
      tenantId,
      latitude: null
    },
    select: {
      id: true,
      name: true,
      street1: true,
      city: true,
      state: true,
      postalCode: true
    },
    take: 10
  });

  const failedSample = failedSampleRaw.map(c => ({
    id: c.id,
    name: c.name,
    address: [c.street1, c.city, c.state, c.postalCode]
      .filter(Boolean)
      .join(', ') || '(no address)'
  }));

  return {
    totalCustomers,
    geocoded,
    notGeocoded,
    percentComplete,
    byState: byState.sort((a, b) => b.total - a.total),
    recentlyGeocoded,
    failedSample
  };
}

function printReport(stats: GeocodeStats): void {
  console.log('='.repeat(80));
  console.log('GEOCODING STATUS REPORT');
  console.log('Generated:', new Date().toISOString());
  console.log('='.repeat(80) + '\n');

  // Overall stats
  console.log('📊 Overall Statistics');
  console.log('-'.repeat(80));
  console.log(`Total Customers:     ${stats.totalCustomers.toLocaleString()}`);
  console.log(`Geocoded:            ${stats.geocoded.toLocaleString()} (${stats.percentComplete.toFixed(1)}%)`);
  console.log(`Not Geocoded:        ${stats.notGeocoded.toLocaleString()} (${(100 - stats.percentComplete).toFixed(1)}%)`);
  console.log();

  // Status indicator
  const statusIcon = stats.percentComplete >= 95 ? '✅' :
                     stats.percentComplete >= 80 ? '⚠️' : '❌';
  const statusText = stats.percentComplete >= 95 ? 'EXCELLENT' :
                     stats.percentComplete >= 80 ? 'GOOD' : 'NEEDS WORK';

  console.log(`${statusIcon} Status: ${statusText}`);
  console.log();

  // By state
  console.log('📍 Geocoding by State (Top 10)');
  console.log('-'.repeat(80));
  console.log('State          Total    Geocoded    %');
  console.log('-'.repeat(80));

  stats.byState.slice(0, 10).forEach(state => {
    const percent = (state.geocoded / state.total) * 100;
    const stateCode = state.state.padEnd(12);
    const total = state.total.toString().padStart(6);
    const geocoded = state.geocoded.toString().padStart(6);
    const percentStr = percent.toFixed(1).padStart(5) + '%';
    console.log(`${stateCode}  ${total}    ${geocoded}     ${percentStr}`);
  });
  console.log();

  // Recently geocoded
  if (stats.recentlyGeocoded.length > 0) {
    console.log('🕒 Recently Geocoded (Last 10)');
    console.log('-'.repeat(80));
    stats.recentlyGeocoded.forEach(c => {
      const time = new Date(c.geocodedAt).toLocaleString();
      console.log(`  ${time} - ${c.name}`);
    });
    console.log();
  }

  // Failed sample
  if (stats.failedSample.length > 0) {
    console.log('❌ Sample of Failed Addresses');
    console.log('-'.repeat(80));
    stats.failedSample.forEach(c => {
      console.log(`  ${c.name}`);
      console.log(`    ${c.address}`);
    });
    console.log();
  }

  console.log('='.repeat(80));
}

function saveReportToFile(stats: GeocodeStats, tenantId: string): void {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `geocoding-report-${timestamp}.json`;
  const filepath = join(process.cwd(), 'docs', 'deployment', filename);

  const report = {
    generatedAt: new Date().toISOString(),
    tenantId,
    ...stats
  };

  writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved to: ${filepath}\n`);

  // Also save as CSV for easy analysis
  const csvFilename = `geocoding-report-${timestamp}.csv`;
  const csvFilepath = join(process.cwd(), 'docs', 'deployment', csvFilename);

  const csvLines = [
    'State,Total Customers,Geocoded,Percent Complete',
    ...stats.byState.map(s =>
      `${s.state},${s.total},${s.geocoded},${((s.geocoded/s.total)*100).toFixed(1)}%`
    )
  ];

  writeFileSync(csvFilepath, csvLines.join('\n'));
  console.log(`📊 CSV report saved to: ${csvFilepath}\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const tenantId = args.find(arg => arg.startsWith('--tenant-id='))?.split('=')[1] ||
                   '58b8126a-2d2f-4f55-bc98-5b6784800bed';

  console.log('🗺️  Geocoding Report Generator');
  console.log('============================\n');
  console.log(`Tenant ID: ${tenantId}\n`);

  const stats = await generateReport(tenantId);
  printReport(stats);
  saveReportToFile(stats, tenantId);

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

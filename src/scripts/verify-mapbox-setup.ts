#!/usr/bin/env tsx
/**
 * Verify Mapbox Setup Script
 * Checks that Mapbox is configured correctly and token is valid
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  step: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

const results: VerificationResult[] = [];

async function verifyEnvironment(): Promise<void> {
  console.log('🔍 Step 1: Verifying Environment Configuration\n');

  // Check for token
  const publicToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const secretToken = process.env.MAPBOX_SECRET_TOKEN;

  if (!publicToken && !secretToken) {
    results.push({
      step: 'Environment Variables',
      status: 'fail',
      message: 'No Mapbox token found',
      details: 'Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN or MAPBOX_SECRET_TOKEN to .env.local'
    });
    return;
  }

  // Verify public token format
  if (publicToken) {
    const isValid = publicToken.startsWith('pk.') && publicToken.length > 100;
    results.push({
      step: 'Public Token Format',
      status: isValid ? 'pass' : 'fail',
      message: isValid ? 'Valid pk. token format' : 'Invalid token format',
      details: `Token length: ${publicToken.length}, Starts with pk.: ${publicToken.startsWith('pk.')}`
    });
  }

  // Verify secret token format
  if (secretToken) {
    const isValid = secretToken.startsWith('sk.') && secretToken.length > 100;
    results.push({
      step: 'Secret Token Format',
      status: isValid ? 'pass' : 'warn',
      message: isValid ? 'Valid sk. token format' : 'Invalid secret token format',
      details: `Token length: ${secretToken.length}, Starts with sk.: ${secretToken.startsWith('sk.')}`
    });
  }
}

async function verifyMapboxAPI(): Promise<void> {
  console.log('🔍 Step 2: Verifying Mapbox API Access\n');

  const token = process.env.MAPBOX_SECRET_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!token) {
    results.push({
      step: 'API Access',
      status: 'fail',
      message: 'Cannot test API without token'
    });
    return;
  }

  try {
    // Test geocoding API
    const testAddress = 'Los Angeles, CA';
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(testAddress)}.json?access_token=${token}&limit=1`;

    const response = await fetch(url);

    if (!response.ok) {
      results.push({
        step: 'Geocoding API',
        status: 'fail',
        message: `API returned ${response.status}: ${response.statusText}`,
        details: response.status === 401 ? 'Invalid token' : 'API error'
      });
      return;
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      results.push({
        step: 'Geocoding API',
        status: 'pass',
        message: 'Successfully geocoded test address',
        details: `Los Angeles coordinates: [${lat}, ${lng}]`
      });
    } else {
      results.push({
        step: 'Geocoding API',
        status: 'warn',
        message: 'API accessible but no results',
        details: 'May indicate API configuration issue'
      });
    }
  } catch (error) {
    results.push({
      step: 'Geocoding API',
      status: 'fail',
      message: 'Failed to connect to Mapbox API',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifyDatabase(): Promise<void> {
  console.log('🔍 Step 3: Verifying Database Status\n');

  try {
    const tenantId = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

    // Count total customers
    const totalCustomers = await prisma.customer.count({
      where: { tenantId }
    });

    // Count geocoded customers
    const geocodedCustomers = await prisma.customer.count({
      where: {
        tenantId,
        latitude: { not: null },
        longitude: { not: null }
      }
    });

    const percentGeocoded = (geocodedCustomers / totalCustomers) * 100;

    results.push({
      step: 'Database Connection',
      status: 'pass',
      message: 'Successfully connected to database',
      details: `Total customers: ${totalCustomers}`
    });

    results.push({
      step: 'Geocoding Status',
      status: percentGeocoded >= 95 ? 'pass' : percentGeocoded > 0 ? 'warn' : 'fail',
      message: `${geocodedCustomers}/${totalCustomers} customers geocoded (${percentGeocoded.toFixed(1)}%)`,
      details: percentGeocoded >= 95 ? 'Excellent coverage' :
               percentGeocoded > 0 ? 'Geocoding in progress or incomplete' :
               'No customers geocoded yet'
    });

    // Check for schema
    const hasLatitude = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Customer' AND column_name = 'latitude'
      LIMIT 1
    `;

    const hasLongitude = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Customer' AND column_name = 'longitude'
      LIMIT 1
    `;

    const schemaReady = Array.isArray(hasLatitude) && hasLatitude.length > 0 &&
                        Array.isArray(hasLongitude) && hasLongitude.length > 0;

    results.push({
      step: 'Database Schema',
      status: schemaReady ? 'pass' : 'fail',
      message: schemaReady ? 'Geolocation columns exist' : 'Missing latitude/longitude columns',
      details: schemaReady ? 'Database ready for geocoding' : 'Run prisma migrate'
    });

  } catch (error) {
    results.push({
      step: 'Database Access',
      status: 'fail',
      message: 'Failed to connect to database',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifyRateLimits(): Promise<void> {
  console.log('🔍 Step 4: Checking Rate Limit Configuration\n');

  const rateLimit = parseInt(process.env.GEOCODING_RATE_LIMIT || '600');

  if (rateLimit <= 0 || rateLimit > 1000) {
    results.push({
      step: 'Rate Limit Config',
      status: 'warn',
      message: `Unusual rate limit: ${rateLimit}/min`,
      details: 'Mapbox free tier is 600/min, paid tier is higher'
    });
  } else {
    results.push({
      step: 'Rate Limit Config',
      status: 'pass',
      message: `Rate limit set to ${rateLimit} requests/min`,
      details: rateLimit === 600 ? 'Using free tier limits' : 'Using custom limits'
    });
  }
}

function printResults(): void {
  console.log('\n' + '='.repeat(80));
  console.log('MAPBOX SETUP VERIFICATION RESULTS');
  console.log('='.repeat(80) + '\n');

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${result.step}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    console.log();

    if (result.status === 'pass') passCount++;
    else if (result.status === 'warn') warnCount++;
    else failCount++;
  });

  console.log('='.repeat(80));
  console.log(`Summary: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log('='.repeat(80) + '\n');

  if (failCount > 0) {
    console.log('❌ SETUP INCOMPLETE - Fix failed items before proceeding');
    console.log('   See /docs/deployment/MONDAY_MAPBOX_SETUP.md for help\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  SETUP MOSTLY COMPLETE - Review warnings before geocoding');
    console.log('   You can proceed but may want to address warnings\n');
  } else {
    console.log('✅ ALL CHECKS PASSED - Ready to geocode customers!');
    console.log('   Run: npm run geocode:customers -- --tenant-id=58b8126a-2d2f-4f55-bc98-5b6784800bed\n');
  }
}

async function main() {
  console.log('🗺️  Mapbox Setup Verification');
  console.log('============================\n');

  await verifyEnvironment();
  await verifyMapboxAPI();
  await verifyDatabase();
  await verifyRateLimits();

  printResults();

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

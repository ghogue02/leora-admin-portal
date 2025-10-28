/**
 * Phase 5 Integration Verification Script
 *
 * Comprehensive verification that all Phase 5 components are properly integrated.
 * Run this script after deployment to ensure everything works together.
 *
 * Usage: ts-node scripts/verify-phase5-integration.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import chalk from 'chalk';

const prisma = new PrismaClient();

interface VerificationResult {
  category: string;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
    details?: any;
  }>;
}

const results: VerificationResult[] = [];

// Utility functions
function pass(name: string, message?: string) {
  return { name, status: 'pass' as const, message };
}

function fail(name: string, message: string, details?: any) {
  return { name, status: 'fail' as const, message, details };
}

function warning(name: string, message: string) {
  return { name, status: 'warning' as const, message };
}

async function verifyDatabaseSchema(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Database Schema...'));

  const checks = [];

  try {
    // Check if new tables exist
    const tables = [
      'WarehouseZone',
      'WarehouseLocation',
      'PickSheet',
      'PickSheetItem',
      'DeliveryRoute',
      'RouteStop'
    ];

    for (const table of tables) {
      try {
        const count = await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].count();
        checks.push(pass(`Table ${table} exists`, `Found ${count} rows`));
      } catch (error: any) {
        checks.push(fail(`Table ${table} exists`, error.message));
      }
    }

    // Check enums exist
    try {
      await prisma.$queryRaw`SELECT unnest(enum_range(NULL::\"PickSheetStatus\"))`;
      checks.push(pass('Enum PickSheetStatus exists'));
    } catch (error: any) {
      checks.push(fail('Enum PickSheetStatus exists', error.message));
    }

    try {
      await prisma.$queryRaw`SELECT unnest(enum_range(NULL::\"RouteStatus\"))`;
      checks.push(pass('Enum RouteStatus exists'));
    } catch (error: any) {
      checks.push(fail('Enum RouteStatus exists', error.message));
    }

    // Check indexes exist
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename IN ('WarehouseLocation', 'PickSheet', 'PickSheetItem', 'DeliveryRoute')
    `;

    if (indexes.length >= 10) {
      checks.push(pass('Indexes created', `Found ${indexes.length} indexes`));
    } else {
      checks.push(warning('Indexes created', `Only found ${indexes.length} indexes, expected 10+`));
    }

  } catch (error: any) {
    checks.push(fail('Database schema verification', error.message));
  }

  return { category: 'Database Schema', checks };
}

async function verifyAPIRoutes(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying API Routes...'));

  const checks = [];

  const routes = [
    '/api/warehouse/locations',
    '/api/warehouse/zones',
    '/api/warehouse/bulk-import',
    '/api/operations/pick-sheets',
    '/api/routing/routes',
    '/api/routing/azuga/export',
    '/api/routing/azuga/import'
  ];

  for (const route of routes) {
    const filePath = `src/app${route}/route.ts`;
    try {
      execSync(`test -f ${filePath}`, { stdio: 'ignore' });
      checks.push(pass(`Route ${route}`, 'File exists'));
    } catch {
      checks.push(fail(`Route ${route}`, 'File not found', { filePath }));
    }
  }

  return { category: 'API Routes', checks };
}

async function verifyServices(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Services...'));

  const checks = [];

  const services = [
    'warehouse.ts',
    'inventory.ts',
    'pick-sheet-generator.ts',
    'route-optimizer.ts'
  ];

  for (const service of services) {
    const filePath = `src/lib/${service}`;
    try {
      execSync(`test -f ${filePath}`, { stdio: 'ignore' });
      checks.push(pass(`Service ${service}`, 'File exists'));

      // Try to import the service
      try {
        require(`../src/lib/${service.replace('.ts', '')}`);
        checks.push(pass(`Service ${service} imports`, 'No syntax errors'));
      } catch (error: any) {
        checks.push(fail(`Service ${service} imports`, error.message));
      }
    } catch {
      checks.push(fail(`Service ${service}`, 'File not found', { filePath }));
    }
  }

  return { category: 'Services', checks };
}

async function verifyWarehouseConfig(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Warehouse Configuration...'));

  const checks = [];

  try {
    // Check if any tenant has warehouse zones configured
    const zones = await prisma.warehouseZone.findMany({
      take: 10
    });

    if (zones.length > 0) {
      checks.push(pass('Warehouse zones configured', `Found ${zones.length} zones`));

      // Verify zone data integrity
      for (const zone of zones) {
        if (zone.startOrder >= zone.endOrder) {
          checks.push(fail(
            `Zone ${zone.name} configuration`,
            `Invalid pick order range: ${zone.startOrder} - ${zone.endOrder}`
          ));
        } else {
          checks.push(pass(`Zone ${zone.name} configuration`, 'Valid pick order range'));
        }
      }
    } else {
      checks.push(warning('Warehouse zones configured', 'No zones found, run seed script'));
    }

    // Check if any warehouse locations exist
    const locations = await prisma.warehouseLocation.findMany({
      take: 10
    });

    if (locations.length > 0) {
      checks.push(pass('Warehouse locations configured', `Found ${locations.length} locations`));

      // Verify pickOrder calculation
      const sorted = locations.sort((a, b) => a.pickOrder - b.pickOrder);
      let validOrder = true;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].pickOrder <= sorted[i - 1].pickOrder) {
          validOrder = false;
          break;
        }
      }

      if (validOrder) {
        checks.push(pass('Pick order calculation', 'All locations have unique pickOrder'));
      } else {
        checks.push(fail('Pick order calculation', 'Duplicate or invalid pickOrder values found'));
      }
    } else {
      checks.push(warning('Warehouse locations configured', 'No locations found'));
    }

  } catch (error: any) {
    checks.push(fail('Warehouse configuration', error.message));
  }

  return { category: 'Warehouse Configuration', checks };
}

async function verifyPickSheetGeneration(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Pick Sheet Generation...'));

  const checks = [];

  try {
    // Check if pick sheets exist
    const pickSheets = await prisma.pickSheet.findMany({
      take: 10,
      include: {
        items: true
      }
    });

    if (pickSheets.length > 0) {
      checks.push(pass('Pick sheets exist', `Found ${pickSheets.length} pick sheets`));

      // Verify pick sheet items are sorted by pickOrder
      for (const sheet of pickSheets) {
        if (sheet.items.length > 0) {
          const sorted = sheet.items.every((item, index) => {
            if (index === 0) return true;
            return item.pickOrder >= sheet.items[index - 1].pickOrder;
          });

          if (sorted) {
            checks.push(pass(
              `Pick sheet ${sheet.sheetNumber} item sorting`,
              'Items correctly sorted by pickOrder'
            ));
          } else {
            checks.push(fail(
              `Pick sheet ${sheet.sheetNumber} item sorting`,
              'Items not sorted by pickOrder'
            ));
          }
        }
      }
    } else {
      checks.push(warning('Pick sheets exist', 'No pick sheets found'));
    }

    // Verify pick sheet number format
    const recentSheet = await prisma.pickSheet.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (recentSheet) {
      if (/^PS-\d{8}-\d{3}$/.test(recentSheet.sheetNumber)) {
        checks.push(pass('Pick sheet numbering', `Format: ${recentSheet.sheetNumber}`));
      } else {
        checks.push(fail('Pick sheet numbering', `Invalid format: ${recentSheet.sheetNumber}`));
      }
    }

  } catch (error: any) {
    checks.push(fail('Pick sheet verification', error.message));
  }

  return { category: 'Pick Sheet Generation', checks };
}

async function verifyInventoryAllocation(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Inventory Allocation...'));

  const checks = [];

  try {
    // Check if inventory has allocated field
    const inventory = await prisma.inventory.findMany({
      take: 10
    });

    if (inventory.length > 0) {
      const hasAllocated = inventory.every(inv => typeof inv.allocated === 'number');

      if (hasAllocated) {
        checks.push(pass('Inventory allocation field', 'All records have allocated field'));
      } else {
        checks.push(fail('Inventory allocation field', 'Some records missing allocated field'));
      }

      // Verify allocated <= onHand
      const invalidAllocations = inventory.filter(inv => inv.allocated > inv.onHand);

      if (invalidAllocations.length === 0) {
        checks.push(pass('Inventory allocation validity', 'No over-allocations found'));
      } else {
        checks.push(fail(
          'Inventory allocation validity',
          `Found ${invalidAllocations.length} over-allocated records`,
          { invalidAllocations: invalidAllocations.slice(0, 5) }
        ));
      }
    } else {
      checks.push(warning('Inventory records', 'No inventory found'));
    }

  } catch (error: any) {
    checks.push(fail('Inventory allocation verification', error.message));
  }

  return { category: 'Inventory Allocation', checks };
}

async function verifyRouting(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Routing...'));

  const checks = [];

  try {
    // Check if routes exist
    const routes = await prisma.deliveryRoute.findMany({
      take: 10,
      include: {
        stops: {
          orderBy: { stopNumber: 'asc' }
        }
      }
    });

    if (routes.length > 0) {
      checks.push(pass('Delivery routes exist', `Found ${routes.length} routes`));

      // Verify stop sequencing
      for (const route of routes) {
        if (route.stops.length > 0) {
          const correctSequence = route.stops.every((stop, index) => {
            return stop.stopNumber === index + 1;
          });

          if (correctSequence) {
            checks.push(pass(
              `Route ${route.routeName} stop sequencing`,
              `${route.stops.length} stops correctly sequenced`
            ));
          } else {
            checks.push(fail(
              `Route ${route.routeName} stop sequencing`,
              'Stop numbers not sequential'
            ));
          }
        }
      }
    } else {
      checks.push(warning('Delivery routes exist', 'No routes found'));
    }

    // Verify route number format
    const recentRoute = await prisma.deliveryRoute.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (recentRoute && recentRoute.routeNumber) {
      if (/^RTI-\d{8}-\d{3}$/.test(recentRoute.routeNumber)) {
        checks.push(pass('Route numbering', `Format: ${recentRoute.routeNumber}`));
      } else {
        checks.push(fail('Route numbering', `Invalid format: ${recentRoute.routeNumber}`));
      }
    }

  } catch (error: any) {
    checks.push(fail('Routing verification', error.message));
  }

  return { category: 'Routing', checks };
}

async function verifyIntegrationTests(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Integration Tests...'));

  const checks = [];

  const testFile = 'src/__tests__/integration/phase5-integration.test.ts';

  try {
    execSync(`test -f ${testFile}`, { stdio: 'ignore' });
    checks.push(pass('Integration test file exists'));

    // Run integration tests
    try {
      console.log(chalk.gray('  Running integration tests...'));
      execSync('npm test -- phase5-integration.test.ts', {
        stdio: 'pipe',
        timeout: 60000
      });
      checks.push(pass('Integration tests pass', 'All tests passed'));
    } catch (error: any) {
      checks.push(fail('Integration tests pass', 'Some tests failed', {
        stderr: error.stderr?.toString().slice(0, 500)
      }));
    }
  } catch {
    checks.push(fail('Integration test file exists', 'File not found'));
  }

  return { category: 'Integration Tests', checks };
}

async function verifyDocumentation(): Promise<VerificationResult> {
  console.log(chalk.blue('\n🔍 Verifying Documentation...'));

  const checks = [];

  const docs = [
    'docs/WAREHOUSE_OPERATIONS_GUIDE.md',
    'docs/PICK_SHEET_GUIDE.md',
    'docs/ROUTING_DELIVERY_GUIDE.md',
    'docs/WAREHOUSE_CONFIGURATION_GUIDE.md',
    'docs/PHASE5_INTEGRATION_SUMMARY.md',
    'docs/PHASE5_COMPATIBILITY.md',
    'docs/PHASE5_DEPLOYMENT_COORDINATION.md',
    'docs/PHASE5_COMPLETE.md'
  ];

  for (const doc of docs) {
    try {
      execSync(`test -f ${doc}`, { stdio: 'ignore' });
      checks.push(pass(`Documentation: ${doc.split('/').pop()}`, 'File exists'));
    } catch {
      checks.push(fail(`Documentation: ${doc.split('/').pop()}`, 'File not found'));
    }
  }

  return { category: 'Documentation', checks };
}

function printResults(results: VerificationResult[]) {
  console.log(chalk.bold('\n\n📊 Verification Summary\n'));

  let totalPasses = 0;
  let totalFailures = 0;
  let totalWarnings = 0;

  for (const result of results) {
    const passes = result.checks.filter(c => c.status === 'pass').length;
    const failures = result.checks.filter(c => c.status === 'fail').length;
    const warnings = result.checks.filter(c => c.status === 'warning').length;

    totalPasses += passes;
    totalFailures += failures;
    totalWarnings += warnings;

    console.log(chalk.bold(`\n${result.category}:`));
    console.log(chalk.green(`  ✓ ${passes} passed`));
    if (failures > 0) console.log(chalk.red(`  ✗ ${failures} failed`));
    if (warnings > 0) console.log(chalk.yellow(`  ⚠ ${warnings} warnings`));

    // Show failures and warnings
    for (const check of result.checks) {
      if (check.status === 'fail') {
        console.log(chalk.red(`    ✗ ${check.name}: ${check.message}`));
        if (check.details) {
          console.log(chalk.gray(`      ${JSON.stringify(check.details, null, 2).slice(0, 200)}`));
        }
      } else if (check.status === 'warning') {
        console.log(chalk.yellow(`    ⚠ ${check.name}: ${check.message}`));
      }
    }
  }

  console.log(chalk.bold('\n\nOverall Results:'));
  console.log(chalk.green(`✓ ${totalPasses} checks passed`));
  if (totalFailures > 0) console.log(chalk.red(`✗ ${totalFailures} checks failed`));
  if (totalWarnings > 0) console.log(chalk.yellow(`⚠ ${totalWarnings} warnings`));

  if (totalFailures === 0) {
    console.log(chalk.green.bold('\n\n✅ Phase 5 Integration Verified Successfully!\n'));
    return 0;
  } else {
    console.log(chalk.red.bold('\n\n❌ Phase 5 Integration Has Issues - Please Review\n'));
    return 1;
  }
}

async function main() {
  console.log(chalk.bold.blue('🚀 Phase 5 Integration Verification\n'));
  console.log(chalk.gray('Checking all components are properly integrated...\n'));

  try {
    results.push(await verifyDatabaseSchema());
    results.push(await verifyWarehouseConfig());
    results.push(await verifyPickSheetGeneration());
    results.push(await verifyInventoryAllocation());
    results.push(await verifyRouting());
    results.push(await verifyAPIRoutes());
    results.push(await verifyServices());
    results.push(await verifyIntegrationTests());
    results.push(await verifyDocumentation());

    const exitCode = printResults(results);
    process.exit(exitCode);

  } catch (error) {
    console.error(chalk.red('\n\n❌ Verification Failed:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

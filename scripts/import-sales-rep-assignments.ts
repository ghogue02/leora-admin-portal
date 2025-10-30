/**
 * Import Sales Rep Assignments from CSV
 *
 * Usage: npx tsx scripts/import-sales-rep-assignments.ts [--dry-run] [--preview]
 */

import { PrismaClient, AccountType } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const db = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

type CSVRow = {
  accountManager: string;
  account: string;
  type: string;
  territory: string;
  buyerFirstName: string;
  buyerLastName: string;
  phone: string;
  email: string;
  revenueTarget: string;
  actualSales: string;
  updatedHAL: string;
};

type ImportStats = {
  total: number;
  matched: number;
  created: number;
  failed: number;
  skipped: number;
  repChanges: number;
};

const stats: ImportStats = {
  total: 0,
  matched: 0,
  created: 0,
  failed: 0,
  skipped: 0,
  repChanges: 0,
};

// Sales rep name mapping (CSV short names → DB lookup)
const REP_NAME_MAP: Record<string, string> = {
  'Angela': 'Angela',
  'Rosa-Anna': 'Rosa-Anna',
  'Ebony Booth': 'Ebony Booth',
  'Jose Bustillo': 'Jose Bustillo',
  'Mike': 'Mike',
  'Nicole': 'Nicole',
  'NWVA': 'NWVA',  // Special: will be null (unassigned)
};

// Account type mapping
function mapAccountType(type: string): AccountType | null {
  const normalized = type?.trim().toLowerCase();

  switch (normalized) {
    case 'active':
    case 'current':
    case 'avtive':  // Handle typo in CSV
      return 'ACTIVE';
    case 'target':
      return 'TARGET';
    case 'prospect':
    case 're-establish':
    case 're-estab':
      return 'PROSPECT';
    case 'hold':
      return 'HOLD';
    default:
      return null;
  }
}

// Normalize customer name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// Build sales rep lookup
async function buildRepLookup(): Promise<Map<string, string | null>> {
  console.log('\n📋 Building sales rep lookup...');

  const reps = await db.salesRep.findMany({
    where: { tenantId: TENANT_ID, isActive: true },
    include: { user: { select: { fullName: true, email: true } } },
  });

  const lookup = new Map<string, string | null>();

  for (const rep of reps) {
    const fullName = rep.user.fullName;
    const firstName = fullName.split(' ')[0];

    lookup.set(fullName, rep.id);
    lookup.set(firstName, rep.id);

    console.log(`  ✓ ${fullName} (${firstName}) → ${rep.id}`);
  }

  // NWVA = unassigned (null)
  lookup.set('NWVA', null);
  console.log(`  ✓ NWVA → null (unassigned)`);

  return lookup;
}

// Match customer by name
async function matchCustomer(
  csvName: string,
  territory: string | null
): Promise<string | null> {
  // Strategy 1: Exact match
  let customer = await db.customer.findFirst({
    where: {
      tenantId: TENANT_ID,
      name: { equals: csvName, mode: 'insensitive' },
    },
    select: { id: true, name: true },
  });

  if (customer) return customer.id;

  // Strategy 2: Normalized match
  const normalized = normalizeName(csvName);
  const customers = await db.customer.findMany({
    where: {
      tenantId: TENANT_ID,
      ...(territory ? { territory } : {}),
    },
    select: { id: true, name: true },
  });

  for (const cust of customers) {
    if (normalizeName(cust.name) === normalized) {
      return cust.id;
    }
  }

  // Strategy 3: Fuzzy match (contains)
  customer = await db.customer.findFirst({
    where: {
      tenantId: TENANT_ID,
      name: { contains: csvName.substring(0, 10), mode: 'insensitive' },
      ...(territory ? { territory } : {}),
    },
    select: { id: true, name: true },
  });

  return customer?.id ?? null;
}

// Process a single CSV row
async function processRow(
  row: CSVRow,
  repLookup: Map<string, string | null>,
  dryRun: boolean
): Promise<'matched' | 'created' | 'failed' | 'skipped'> {
  try {
    // Get sales rep ID
    const repName = REP_NAME_MAP[row.accountManager] || row.accountManager;
    const repId = repLookup.get(repName);

    if (repId === undefined) {
      console.error(`  ❌ Unknown rep: ${row.accountManager}`);
      return 'failed';
    }

    // Match customer
    let customerId = await matchCustomer(row.account, row.territory || null);

    if (customerId) {
      // Update existing customer
      if (!dryRun) {
        const oldCustomer = await db.customer.findUnique({
          where: { id: customerId },
          select: { salesRepId: true, name: true },
        });

        // Track rep change
        if (oldCustomer && oldCustomer.salesRepId !== repId) {
          stats.repChanges++;

          // Unassign old assignment
          if (oldCustomer.salesRepId) {
            await db.customerAssignment.updateMany({
              where: {
                tenantId: TENANT_ID,
                customerId,
                salesRepId: oldCustomer.salesRepId,
                unassignedAt: null,
              },
              data: { unassignedAt: new Date() },
            });
          }

          // Create new assignment
          if (repId) {
            await db.customerAssignment.create({
              data: {
                tenantId: TENANT_ID,
                customerId,
                salesRepId: repId,
                assignedAt: new Date(),
              },
            });
          }
        }

        // Update customer
        await db.customer.update({
          where: { id: customerId },
          data: {
            salesRepId: repId,
            territory: row.territory || undefined,
            accountType: mapAccountType(row.type) || undefined,
            billingEmail: row.email || undefined,
            phone: row.phone || undefined,
            buyerFirstName: row.buyerFirstName || undefined,
            buyerLastName: row.buyerLastName || undefined,
            quarterlyRevenueTarget: row.revenueTarget
              ? parseFloat(row.revenueTarget)
              : undefined,
            csvLastSyncedAt: new Date(),
          },
        });
      }

      console.log(`  ✓ Matched: ${row.account} → ${repName}`);
      return 'matched';
    } else {
      // Create new customer
      if (!dryRun) {
        await db.customer.create({
          data: {
            tenantId: TENANT_ID,
            name: row.account,
            salesRepId: repId,
            territory: row.territory || null,
            accountType: mapAccountType(row.type) || 'PROSPECT',
            accountPriority: 'MEDIUM',
            billingEmail: row.email || null,
            phone: row.phone || null,
            buyerFirstName: row.buyerFirstName || null,
            buyerLastName: row.buyerLastName || null,
            quarterlyRevenueTarget: row.revenueTarget
              ? parseFloat(row.revenueTarget)
              : null,
            csvImportedAt: new Date(),
            csvLastSyncedAt: new Date(),
          },
        });

        // Create initial assignment
        if (repId) {
          await db.customerAssignment.create({
            data: {
              tenantId: TENANT_ID,
              customerId: (await db.customer.findFirst({
                where: { tenantId: TENANT_ID, name: row.account },
                select: { id: true }
              }))!.id,
              salesRepId: repId,
              assignedAt: new Date(),
            },
          });
        }
      }

      console.log(`  + Created: ${row.account} → ${repName}`);
      return 'created';
    }
  } catch (error) {
    console.error(`  ❌ Error processing ${row.account}:`, error);
    return 'failed';
  }
}

// Main import function
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const previewOnly = args.includes('--preview');

  console.log('\n🚀 Sales Rep CSV Import\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : previewOnly ? 'PREVIEW' : 'LIVE IMPORT'}`);

  // Read CSV file
  const csvPath = path.join(__dirname, '..', '..', 'sales reps.csv');
  const csvContent = await fs.readFile(csvPath, 'utf-8');

  // Parse CSV
  const records = parse(csvContent, {
    columns: [
      'accountManager',
      'account',
      'type',
      'territory',
      'priority',
      'forCallPlan',
      'objective',
      'eventAccount',
      'buyerFirstName',
      'buyerLastName',
      'preferredMOC',
      'phone',
      'email',
      'notes',
      'wineClub',
      'events',
      'revenueTarget',
      'invoiceTarget',
      'bestDays',
      'onOffPremise',
      'actualSales',
      'updatedHAL',
      'changeCustomerId',
    ],
    skip_empty_lines: true,
    trim: true,
    from: 2, // Skip header row
  }) as CSVRow[];

  stats.total = records.length;
  console.log(`\n📊 CSV has ${stats.total} rows\n`);

  // Build rep lookup
  const repLookup = await buildRepLookup();

  if (previewOnly) {
    console.log('\n📋 Generating matching preview...\n');

    for (const row of records.slice(0, 50)) {  // Preview first 50
      const customerId = await matchCustomer(row.account, row.territory);
      if (customerId) {
        console.log(`  ✓ MATCH: ${row.account}`);
      } else {
        console.log(`  + NEW:   ${row.account} (will be created)`);
      }
    }

    console.log('\n📊 Run without --preview to see full report\n');
    return;
  }

  // Process in batches
  console.log('\n⚙️  Processing rows...\n');

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    console.log(`\nBatch ${Math.floor(i / 100) + 1} (rows ${i + 1}-${Math.min(i + 100, records.length)}):`);

    for (const row of batch) {
      const result = await processRow(row, repLookup, dryRun);
      stats[result]++;
    }
  }

  // Generate report
  console.log('\n' + '='.repeat(60));
  console.log('📊 IMPORT COMPLETE\n');
  console.log(`Total Rows:          ${stats.total}`);
  console.log(`Matched & Updated:   ${stats.matched} (${((stats.matched / stats.total) * 100).toFixed(1)}%)`);
  console.log(`New Customers:       ${stats.created} (${((stats.created / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Failed:              ${stats.failed}`);
  console.log(`Skipped:             ${stats.skipped}`);
  console.log(`Rep Reassignments:   ${stats.repChanges}`);
  console.log('='.repeat(60));

  if (dryRun) {
    console.log('\n⚠️  DRY RUN - No changes were made to the database\n');
  } else {
    console.log('\n✅ Changes committed to database\n');
  }

  // Verify rep counts
  console.log('\n📊 Customers per Sales Rep:\n');
  const repCounts = await db.customer.groupBy({
    by: ['salesRepId'],
    where: { tenantId: TENANT_ID },
    _count: { _all: true },
  });

  for (const group of repCounts) {
    if (!group.salesRepId) {
      console.log(`  Unassigned (NWVA): ${group._count._all}`);
    } else {
      const rep = await db.salesRep.findUnique({
        where: { id: group.salesRepId },
        include: { user: { select: { fullName: true } } },
      });
      console.log(`  ${rep?.user.fullName || 'Unknown'}: ${group._count._all}`);
    }
  }

  await db.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

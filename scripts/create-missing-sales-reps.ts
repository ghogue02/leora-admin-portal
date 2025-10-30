/**
 * Create Missing Sales Rep Users
 *
 * Creates the 6 sales reps from Travis's CSV that don't exist in database yet:
 * - Angela (197 accounts)
 * - Ebony Booth (229 accounts)
 * - Jose Bustillo (194 accounts)
 * - Mike (104 accounts)
 * - Nicole (102 accounts)
 * - Rosa-Anna (222 accounts)
 *
 * Usage: npx tsx scripts/create-missing-sales-reps.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const db = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Sales reps to create (based on CSV analysis)
const REPS_TO_CREATE = [
  {
    firstName: 'Angela',
    fullName: 'Angela Fultz',
    email: 'angela@wellcrafted.com',
    territory: 'Virginia Beach',  // Primary territory based on CSV
    expectedAccounts: 197,
  },
  {
    firstName: 'Ebony',
    fullName: 'Ebony Booth',
    email: 'ebony@wellcrafted.com',
    territory: 'Norfolk',  // Primary territory based on CSV
    expectedAccounts: 229,
  },
  {
    firstName: 'Jose',
    fullName: 'Jose Bustillo',
    email: 'jose@wellcrafted.com',
    territory: 'Hampton Roads',  // Primary territory based on CSV
    expectedAccounts: 194,
  },
  {
    firstName: 'Mike',
    fullName: 'Mike Allen',
    email: 'mike@wellcrafted.com',
    territory: 'Richmond',  // Primary territory based on CSV
    expectedAccounts: 104,
  },
  {
    firstName: 'Nicole',
    fullName: 'Nicole Shenandoah',
    email: 'nicole@wellcrafted.com',
    territory: 'Shenandoah Valley',  // Primary territory based on CSV
    expectedAccounts: 102,
  },
  {
    firstName: 'Rosa-Anna',
    fullName: 'Rosa-Anna Winchell',
    email: 'rosa-anna@wellcrafted.com',
    territory: 'Williamsburg',  // Primary territory based on CSV
    expectedAccounts: 222,
  },
];

async function main() {
  console.log('\n🚀 Creating Missing Sales Rep Users\n');
  console.log(`Creating ${REPS_TO_CREATE.length} sales rep users...\n`);

  // Default password (should be reset on first login)
  const defaultPassword = process.env.DEFAULT_SALES_REP_PASSWORD || 'TemporaryPassword123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  let created = 0;
  let skipped = 0;

  for (const rep of REPS_TO_CREATE) {
    try {
      // Check if user already exists
      const existing = await db.user.findFirst({
        where: {
          tenantId: TENANT_ID,
          OR: [
            { email: rep.email },
            { fullName: rep.fullName },
          ],
        },
      });

      if (existing) {
        console.log(`  ⏭️  Skipped: ${rep.fullName} (already exists)`);
        skipped++;
        continue;
      }

      // Create User
      const user = await db.user.create({
        data: {
          tenantId: TENANT_ID,
          email: rep.email,
          fullName: rep.fullName,
          hashedPassword,
          isActive: true,
        },
      });

      // Create SalesRep profile
      const salesRep = await db.salesRep.create({
        data: {
          tenantId: TENANT_ID,
          userId: user.id,
          territoryName: rep.territory,
          isActive: true,
          sampleAllowancePerMonth: 60,
          // Set default quotas (can be updated later)
          monthlyRevenueQuota: 10000,
          quarterlyRevenueQuota: 30000,
          annualRevenueQuota: 120000,
        },
      });

      console.log(`  ✅ Created: ${rep.fullName}`);
      console.log(`     Email: ${rep.email}`);
      console.log(`     Territory: ${rep.territory}`);
      console.log(`     User ID: ${user.id}`);
      console.log(`     SalesRep ID: ${salesRep.id}`);
      console.log(`     Expected Accounts: ${rep.expectedAccounts}\n`);

      created++;
    } catch (error) {
      console.error(`  ❌ Failed to create ${rep.fullName}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 CREATION COMPLETE\n');
  console.log(`Created:  ${created}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Total:    ${REPS_TO_CREATE.length}`);
  console.log('='.repeat(60));

  console.log('\n⚠️  IMPORTANT: Default password for all users: ' + defaultPassword);
  console.log('Users should reset their password on first login.\n');

  // Verify all reps now exist
  console.log('\n📋 All Sales Reps in Database:\n');
  const allReps = await db.salesRep.findMany({
    where: { tenantId: TENANT_ID, isActive: true },
    include: { user: { select: { fullName: true, email: true } } },
    orderBy: { user: { fullName: 'asc' } },
  });

  for (const rep of allReps) {
    console.log(`  ✓ ${rep.user.fullName} (${rep.user.email}) - ${rep.territoryName}`);
  }

  console.log(`\n✅ Total Active Sales Reps: ${allReps.length}\n`);

  await db.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

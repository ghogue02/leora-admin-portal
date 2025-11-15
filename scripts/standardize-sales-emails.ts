#!/usr/bin/env tsx
/**
 * CRM-83: Standardize sales team email addresses to firstname@wellcraftedbeverage.com
 *
 * This script:
 * 1. Audits current sales team emails
 * 2. Updates emails to firstname@wellcraftedbeverage.com format (no dots)
 * 3. Documents all changes for verification
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'c4168658-25a7-48b1-969c-b5bd56d87ef6';

interface EmailUpdate {
  userId: string;
  fullName: string;
  oldEmail: string;
  newEmail: string;
  territory: string;
}

async function main() {
  console.log('🔍 CRM-83: Standardizing Sales Team Email Addresses\n');
  console.log('=' .repeat(80));

  // Get all active sales reps
  const users = await prisma.user.findMany({
    where: {
      tenantId: TENANT_ID,
      salesRepProfile: { isNot: null },
      isActive: true
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      salesRepProfile: {
        select: {
          territoryName: true
        }
      }
    },
    orderBy: {
      fullName: 'asc'
    }
  });

  console.log(`\nFound ${users.length} active sales team members\n`);

  // Analyze current emails and determine updates needed
  const updates: EmailUpdate[] = [];
  const noChanges: Array<{ fullName: string; email: string }> = [];

  for (const user of users) {
    // Extract first name (lowercase, no special chars)
    const firstName = user.fullName.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
    const expectedEmail = `${firstName}@wellcraftedbeverage.com`;

    if (user.email !== expectedEmail) {
      updates.push({
        userId: user.id,
        fullName: user.fullName,
        oldEmail: user.email,
        newEmail: expectedEmail,
        territory: user.salesRepProfile?.territoryName || 'Unknown'
      });
    } else {
      noChanges.push({
        fullName: user.fullName,
        email: user.email
      });
    }
  }

  // Display audit report
  console.log('\n📊 AUDIT REPORT\n');
  console.log('-'.repeat(80));

  if (noChanges.length > 0) {
    console.log(`\n✅ Already Standardized (${noChanges.length}):\n`);
    noChanges.forEach(({ fullName, email }) => {
      console.log(`   ${fullName.padEnd(30)} ${email}`);
    });
  }

  if (updates.length > 0) {
    console.log(`\n⚠️  Needs Update (${updates.length}):\n`);
    updates.forEach(({ fullName, oldEmail, newEmail, territory }) => {
      console.log(`   ${fullName.padEnd(30)} ${territory.padEnd(25)}`);
      console.log(`      OLD: ${oldEmail}`);
      console.log(`      NEW: ${newEmail}`);
      console.log('');
    });
  } else {
    console.log('\n✨ All emails are already standardized!\n');
    await prisma.$disconnect();
    return;
  }

  // Confirm before updating
  console.log('-'.repeat(80));
  console.log(`\n🚨 About to update ${updates.length} email addresses`);
  console.log('   This will affect user login credentials!');
  console.log('   Make sure email forwards are configured first.\n');

  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('🔒 DRY RUN MODE - No changes will be made');
    console.log('   Run with --execute flag to apply changes\n');
    await prisma.$disconnect();
    return;
  }

  console.log('⚙️  EXECUTING UPDATES...\n');

  // Execute updates
  const results: Array<{ success: boolean; update: EmailUpdate; error?: string }> = [];

  for (const update of updates) {
    try {
      await prisma.user.update({
        where: {
          id: update.userId
        },
        data: {
          email: update.newEmail
        }
      });

      results.push({ success: true, update });
      console.log(`✅ Updated: ${update.fullName} → ${update.newEmail}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      results.push({ success: false, update, error: errorMsg });
      console.error(`❌ Failed: ${update.fullName} - ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📈 SUMMARY\n');

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`   Total Processed: ${results.length}`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ FAILURES:\n');
    results.filter(r => !r.success).forEach(({ update, error }) => {
      console.log(`   ${update.fullName}: ${error}`);
    });
  }

  console.log('\n✅ ACCEPTANCE CRITERIA CHECKLIST:\n');
  console.log('   [ ] Every sales team member has firstname@wellcraftedbeverage.com');
  console.log('   [ ] No dots or special characters in local-part');
  console.log('   [ ] All system notifications continue working');
  console.log('   [ ] Old addresses forward to new addresses (configure in email provider)');
  console.log('   [ ] Document changes and confirm with Travis\n');

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

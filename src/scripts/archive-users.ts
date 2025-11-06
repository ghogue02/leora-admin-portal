#!/usr/bin/env tsx

/**
 * Archive Users Script
 *
 * Archives (deactivates) specified users by setting isActive = false
 * Users to archive: Kelly Neel, Carolyn Vernon, Greg Hogue, Test Admin User
 *
 * Run: npx tsx scripts/archive-users.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERS_TO_ARCHIVE = [
  'kelly@wellcraftedbeverage.com',
  'carolyn@wellcraftedbeverage.com',
  'greg.hogue@gmail.com',
  'test@wellcrafted.com',
];

async function archiveUsers() {
  console.log('🗄️  User Archive Script\n');
  console.log('='.repeat(80) + '\n');

  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    // Find users before archiving
    console.log('📋 Finding users to archive...\n');
    const usersToArchive = await prisma.user.findMany({
      where: {
        email: {
          in: USERS_TO_ARCHIVE,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    console.log(`Found ${usersToArchive.length} users:\n`);
    usersToArchive.forEach(user => {
      console.log(`  ${user.isActive ? '✅' : '❌'} ${user.fullName || 'Unknown'}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     ID: ${user.id}`);
      console.log(`     Current Status: ${user.isActive ? 'ACTIVE' : 'INACTIVE'}\n`);
    });

    if (usersToArchive.length === 0) {
      console.log('⚠️  No users found to archive\n');
      return;
    }

    // Confirm before archiving
    const alreadyInactive = usersToArchive.filter(u => !u.isActive);
    const toDeactivate = usersToArchive.filter(u => u.isActive);

    if (alreadyInactive.length > 0) {
      console.log(`ℹ️  ${alreadyInactive.length} users already inactive:\n`);
      alreadyInactive.forEach(u => console.log(`    - ${u.email}`));
      console.log('');
    }

    if (toDeactivate.length === 0) {
      console.log('✅ All specified users are already archived. No changes needed.\n');
      return;
    }

    console.log(`🔄 Archiving ${toDeactivate.length} users...\n`);

    // Archive users
    const result = await prisma.user.updateMany({
      where: {
        email: {
          in: USERS_TO_ARCHIVE,
        },
        isActive: true,  // Only update active users
      },
      data: {
        isActive: false,
      },
    });

    console.log(`✅ Archived ${result.count} users successfully\n`);

    // Verify final state
    const verifyUsers = await prisma.user.findMany({
      where: {
        email: {
          in: USERS_TO_ARCHIVE,
        },
      },
      select: {
        email: true,
        fullName: true,
        isActive: true,
      },
    });

    console.log('📊 Final Status:\n');
    verifyUsers.forEach(user => {
      console.log(`  ${user.isActive ? '⚠️  STILL ACTIVE' : '✅ ARCHIVED'}: ${user.fullName || 'Unknown'} (${user.email})`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ User archival complete!\n');

  } catch (error) {
    console.error('\n❌ Error during archival:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

archiveUsers();

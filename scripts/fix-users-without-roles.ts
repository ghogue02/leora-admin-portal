#!/usr/bin/env tsx
/**
 * Fix Users Without Roles
 * Assigns appropriate roles to users missing role assignments
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres'
    }
  }
});

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function fixUsersWithoutRoles() {
  console.log('🔍 Finding users without roles...\n');

  try {
    // Find users without any roles
    const usersWithoutRoles = await prisma.user.findMany({
      where: {
        tenantId: TENANT_ID,
        roles: {
          none: {}
        }
      },
      include: {
        salesRepProfile: true
      }
    });

    console.log(`Found ${usersWithoutRoles.length} users without roles\n`);

    if (usersWithoutRoles.length === 0) {
      console.log('✅ All users have roles assigned!');
      return;
    }

    // Get all available roles
    const availableRoles = await prisma.role.findMany({
      where: { tenantId: TENANT_ID }
    });

    console.log(`Available roles: ${availableRoles.map(r => r.name).join(', ')}\n`);

    // Find or create basic roles
    const roles = {
      salesRep: availableRoles.find(r => r.name === 'SALES_REP'),
      admin: availableRoles.find(r => r.name === 'ADMIN'),
      manager: availableRoles.find(r => r.name === 'MANAGER')
    };

    let assigned = 0;
    let errors = 0;

    console.log('📋 Assigning roles:\n');
    console.log('User | Email | Role Assigned');
    console.log('-----|-------|---------------');

    for (const user of usersWithoutRoles) {
      // Determine appropriate role based on user profile
      let roleToAssign = roles.salesRep;

      if (user.email?.includes('admin')) {
        roleToAssign = roles.admin || roles.salesRep;
      } else if (user.salesRepProfile) {
        roleToAssign = roles.salesRep;
      } else {
        roleToAssign = roles.salesRep || roles.admin;
      }

      if (!roleToAssign) {
        console.error(`No suitable role found for ${user.email}`);
        errors++;
        continue;
      }

      try {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleToAssign.id,
            tenantId: TENANT_ID
          }
        });

        console.log(
          `${(user.fullName || 'Unknown').substring(0, 15).padEnd(15)} | ` +
          `${(user.email || 'no-email').substring(0, 30).padEnd(30)} | ` +
          roleToAssign.name
        );
        assigned++;
      } catch (error) {
        console.error(`Error assigning role to ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Role Assignment Summary:');
    console.log(`  Successfully assigned: ${assigned}`);
    console.log(`  Errors: ${errors}`);

    // Verify
    const remaining = await prisma.user.count({
      where: {
        tenantId: TENANT_ID,
        roles: {
          none: {}
        }
      }
    });

    console.log(`\n📊 Remaining users without roles: ${remaining}`);

  } catch (error) {
    console.error('❌ Error fixing user roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixUsersWithoutRoles().catch(console.error);

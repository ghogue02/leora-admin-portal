#!/usr/bin/env tsx
/**
 * Session Debugging Script
 *
 * This script helps diagnose session validation issues by:
 * 1. Checking database connection
 * 2. Verifying tenant exists
 * 3. Listing active sessions
 * 4. Validating session structure
 *
 * Usage: npx tsx scripts/debug-session.ts [sessionId]
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function debugSession(sessionId?: string) {
  console.log('🔍 Session Debugging Tool\n');
  console.log('=' . repeat(60));

  try {
    // 1. Test database connection
    console.log('\n📊 Testing Database Connection...');
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Database connection successful');

    // 2. Check default tenant
    console.log('\n🏢 Checking Default Tenant...');
    const defaultSlug = process.env.DEFAULT_TENANT_SLUG;
    console.log(`   Default tenant slug: ${defaultSlug || 'NOT SET'}`);

    if (defaultSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: defaultSlug },
      });

      if (tenant) {
        console.log(`✅ Tenant found: ${tenant.name} (${tenant.id})`);
      } else {
        console.log(`❌ Tenant with slug "${defaultSlug}" not found!`);
      }
    }

    // 3. List all sessions
    console.log('\n📝 Active Sessions:');
    const sessions = await prisma.salesSession.findMany({
      where: {
        expiresAt: { gte: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    if (sessions.length === 0) {
      console.log('   ⚠️  No active sessions found');
      console.log('   → User needs to log in to create a session');
    } else {
      console.log(`   Found ${sessions.length} active session(s):\n`);
      sessions.forEach((session, idx) => {
        const isExpired = session.expiresAt < new Date();
        const status = isExpired ? '❌ EXPIRED' : '✅ ACTIVE';
        console.log(`   ${idx + 1}. ${status}`);
        console.log(`      Session ID: ${session.id}`);
        console.log(`      User: ${session.user.email} (${session.user.fullName})`);
        console.log(`      Tenant: ${session.tenantId}`);
        console.log(`      Expires: ${session.expiresAt.toISOString()}`);
        console.log(`      Active: ${session.user.isActive}`);
        console.log('');
      });
    }

    // 4. Check specific session if provided
    if (sessionId) {
      console.log(`\n🔎 Checking Specific Session: ${sessionId}`);
      const session = await prisma.salesSession.findUnique({
        where: { id: sessionId },
        include: {
          user: {
            include: {
              salesRepProfile: true,
              roles: {
                include: {
                  role: {
                    include: {
                      permissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!session) {
        console.log('   ❌ Session not found in database');
      } else {
        const isExpired = session.expiresAt < new Date();
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
        console.log(`   User: ${session.user.email}`);
        console.log(`   Active: ${session.user.isActive}`);
        console.log(`   Has Sales Rep: ${!!session.user.salesRepProfile}`);
        console.log(`   Roles: ${session.user.roles.length}`);
        console.log(`   Expires: ${session.expiresAt.toISOString()}`);

        if (isExpired) {
          console.log('\n   ⚠️  This session has expired!');
          console.log('   → User needs to log in again');
        }
      }
    }

    // 5. Check expired sessions
    console.log('\n🗑️  Expired Sessions (should be cleaned up):');
    const expiredCount = await prisma.salesSession.count({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    console.log(`   Found ${expiredCount} expired session(s)`);

    if (expiredCount > 0) {
      console.log('   → Run cleanup: await prisma.salesSession.deleteMany({');
      console.log('        where: { expiresAt: { lt: new Date() } }');
      console.log('      })');
    }

  } catch (error) {
    console.error('\n❌ Error during debugging:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Next Steps:');
  console.log('   1. If no active sessions: User needs to login');
  console.log('   2. If session expired: User needs to login again');
  console.log('   3. If database error: Check DATABASE_URL in .env.local');
  console.log('   4. If tenant not found: Check DEFAULT_TENANT_SLUG\n');
}

// Run the diagnostic
const sessionId = process.argv[2];
debugSession(sessionId).catch(console.error);

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugAuth() {
  console.log('🔍 Debugging Auth System...\n');

  try {
    // Check Travis user
    console.log('1️⃣ Checking Travis user...');
    const user = await prisma.user.findFirst({
      where: {
        email: 'travis@wellcraftedbeverage.com',
      },
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
    });

    if (!user) {
      console.log('❌ Travis user NOT FOUND');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isActive: user.isActive,
      tenantId: user.tenantId,
      salesRepProfile: user.salesRepProfile ? {
        id: user.salesRepProfile.id,
        territoryName: user.salesRepProfile.territoryName,
        isActive: user.salesRepProfile.isActive,
      } : null,
      roles: user.roles.map(r => r.role.code),
    });

    // Check sessions
    console.log('\n2️⃣ Checking active sessions for Travis...');
    const sessions = await prisma.salesSession.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log(`Found ${sessions.length} session(s):`);
    sessions.forEach((session, i) => {
      const isExpired = session.expiresAt < new Date();
      console.log(`  ${i + 1}. Session ${session.id.substring(0, 12)}...`);
      console.log(`     Created: ${session.createdAt.toISOString()}`);
      console.log(`     Expires: ${session.expiresAt.toISOString()}`);
      console.log(`     Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
      console.log(`     Tenant: ${session.tenantId}`);
    });

    // Check tenant configuration
    console.log('\n3️⃣ Checking tenant configuration...');
    const tenant = await prisma.tenant.findUnique({
      where: { slug: 'well-crafted' },
    });

    if (tenant) {
      console.log('✅ Tenant found:', {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      });
    } else {
      console.log('❌ Tenant NOT FOUND for slug: well-crafted');
    }

    // Check environment
    console.log('\n4️⃣ Environment Configuration:');
    console.log('   DEFAULT_TENANT_SLUG:', process.env.DEFAULT_TENANT_SLUG ?? 'NOT SET');
    console.log('   SALES_SESSION_TTL_MS:', process.env.SALES_SESSION_TTL_MS ?? 'NOT SET (using default)');
    console.log('   SALES_SESSION_MAX_AGE:', process.env.SALES_SESSION_MAX_AGE ?? 'NOT SET (using default)');
    console.log('   NODE_ENV:', process.env.NODE_ENV ?? 'NOT SET');

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAuth();

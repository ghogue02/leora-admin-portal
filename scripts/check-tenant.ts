import { PrismaClient } from '@prisma/client';

// Use direct URL to bypass connection pooler
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function checkTenant() {
  try {
    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });

    console.log('Tenants:', tenants);

    if (tenants.length === 0) {
      console.log('\nNo tenants found. Creating default tenant...');
      const tenant = await prisma.tenant.create({
        data: {
          id: 'well-crafted',
          name: 'Well Crafted Wine & Beverage Co.',
          domain: 'well-crafted',
        }
      });
      console.log('Created:', tenant);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkTenant();

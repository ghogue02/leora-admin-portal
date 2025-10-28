import { PrismaClient } from '@prisma/client';

// Use working direct connection
const connectionUrl = "postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

async function verify() {
  console.log('📊 Verification Report\n');

  // Total customers
  const total = await prisma.customer.count();
  console.log(`Total customers: ${total}\n`);

  // By classification
  const byType = await prisma.customer.groupBy({
    by: ['accountType'],
    _count: true
  });

  console.log('By Account Type:');
  for (const row of byType) {
    console.log(`  ${row.accountType}: ${row._count}`);
  }

  // By territory
  const byTerritory = await prisma.customer.groupBy({
    by: ['territory'],
    _count: true,
    orderBy: { _count: { territory: 'desc' } },
    take: 10
  });

  console.log('\nTop 10 Territories:');
  for (const row of byTerritory) {
    console.log(`  ${row.territory}: ${row._count}`);
  }

  // Sample customers
  const samples = await prisma.customer.findMany({
    take: 5,
    select: {
      name: true,
      accountType: true,
      accountPriority: true,
      lastOrderDate: true,
      territory: true
    }
  });

  console.log('\nSample Customers:');
  for (const customer of samples) {
    console.log(`  ${customer.name} - ${customer.accountType} (${customer.territory})`);
  }

  await prisma.$disconnect();
}

verify();

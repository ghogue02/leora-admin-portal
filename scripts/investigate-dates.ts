import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkActualDateRange() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'well-crafted' } });
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  console.log('📅 Checking Actual Order Date Ranges...\n');

  // Get min/max orderedAt
  const orderedAtRange = await prisma.order.aggregate({
    where: { tenantId: tenant.id },
    _min: { orderedAt: true },
    _max: { orderedAt: true }
  });

  console.log('orderedAt range:');
  console.log('  Min:', orderedAtRange._min.orderedAt);
  console.log('  Max:', orderedAtRange._max.orderedAt);
  console.log('');

  // Get min/max deliveredAt
  const deliveredAtRange = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      deliveredAt: { not: null }
    },
    _min: { deliveredAt: true },
    _max: { deliveredAt: true }
  });

  console.log('deliveredAt range:');
  console.log('  Min:', deliveredAtRange._min.deliveredAt);
  console.log('  Max:', deliveredAtRange._max.deliveredAt);
  console.log('');

  // Count orders with null deliveredAt
  const nullDeliveredCount = await prisma.order.count({
    where: {
      tenantId: tenant.id,
      deliveredAt: null
    }
  });

  console.log('Orders with NULL deliveredAt:', nullDeliveredCount);
  console.log('');

  // Check recent orders by orderedAt
  const recentOrders = await prisma.order.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      total: true,
      orderedAt: true,
      deliveredAt: true
    },
    orderBy: { orderedAt: 'desc' },
    take: 10
  });

  console.log('🔍 Most Recent Orders (by orderedAt):');
  for (const o of recentOrders) {
    console.log('  $' + Number(o.total).toFixed(2),
                '| Ordered:', o.orderedAt?.toLocaleDateString(),
                '| Delivered:', o.deliveredAt?.toLocaleDateString() || 'NULL');
  }

  await prisma.$disconnect();
}

checkActualDateRange().catch(console.error);

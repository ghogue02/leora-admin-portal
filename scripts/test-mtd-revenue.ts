import { PrismaClient } from '@prisma/client';
import { startOfMonth, startOfWeek, endOfWeek } from 'date-fns';

const prisma = new PrismaClient();

async function testMTDRevenue() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  console.log('📅 Date Ranges:');
  console.log('  Week Start:', weekStart.toISOString());
  console.log('  Week End:', weekEnd.toISOString());
  console.log('  Month Start:', monthStart.toISOString());
  console.log('  Now:', now.toISOString());
  console.log('');

  // Get tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'well-crafted' }
  });

  if (!tenant) {
    console.error('❌ Tenant not found');
    return;
  }

  console.log('🏢 Tenant:', tenant.name, '(' + tenant.id + ')');
  console.log('');

  // Weekly revenue
  const weeklyOrders = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      deliveredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: { not: 'CANCELLED' }
    },
    _sum: { total: true },
    _count: true
  });

  // MTD revenue
  const mtdOrders = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      deliveredAt: {
        gte: monthStart,
        lte: now,
      },
      status: { not: 'CANCELLED' }
    },
    _sum: { total: true },
    _count: true
  });

  console.log('📊 Revenue Analysis:');
  console.log('  This Week:');
  console.log('    Orders:', weeklyOrders._count);
  console.log('    Revenue: $' + (Number(weeklyOrders._sum.total || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  console.log('');
  console.log('  Month-to-Date:');
  console.log('    Orders:', mtdOrders._count);
  console.log('    Revenue: $' + (Number(mtdOrders._sum.total || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  console.log('');

  // Sample orders to understand the data
  const sampleOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      deliveredAt: {
        gte: monthStart,
        lte: now,
      },
      status: { not: 'CANCELLED' }
    },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      deliveredAt: true,
      status: true
    },
    orderBy: { deliveredAt: 'desc' },
    take: 5
  });

  console.log('🔍 Sample Orders (Most Recent MTD):');
  for (const order of sampleOrders) {
    console.log('  Order', order.orderNumber, '- $' + Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 }),
                '- Delivered:', order.deliveredAt?.toLocaleDateString());
  }

  await prisma.$disconnect();
}

testMTDRevenue().catch(console.error);

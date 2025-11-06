import { PrismaClient } from '@prisma/client';
import { startOfMonth } from 'date-fns';

const prisma = new PrismaClient();

async function verifyOctoberData() {
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'well-crafted' } });
  if (!tenant) {
    console.log('Tenant not found');
    return;
  }

  const now = new Date();
  const monthStart = startOfMonth(now);

  // October 2025 MTD orders
  const octoberOrders = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      deliveredAt: {
        gte: monthStart,
        lte: now
      },
      status: { not: 'CANCELLED' }
    },
    _sum: { total: true },
    _count: true
  });

  console.log('📊 October 2025 MTD Results:');
  console.log('  Orders:', octoberOrders._count);
  console.log('  Revenue: $' + Number(octoberOrders._sum.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }));
  console.log('');

  // Sample recent orders
  const recentOrders = await prisma.order.findMany({
    where: {
      tenantId: tenant.id,
      deliveredAt: { gte: monthStart }
    },
    select: {
      total: true,
      deliveredAt: true
    },
    orderBy: { deliveredAt: 'desc' },
    take: 5
  });

  console.log('📦 Recent October Orders:');
  for (const o of recentOrders) {
    console.log('  $' + Number(o.total).toFixed(2), '- Delivered:', o.deliveredAt?.toLocaleDateString());
  }

  await prisma.$disconnect();
}

verifyOctoberData().catch(console.error);

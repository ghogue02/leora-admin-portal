import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'well-crafted' }
  });

  if (!tenant) {
    console.log('ERROR: Tenant not found');
    return;
  }

  console.log('\n=== TENANT ===');
  console.log(JSON.stringify(tenant, null, 2));

  // Get sales reps
  const salesReps = await prisma.salesRep.findMany({
    where: { tenantId: tenant.id },
    include: {
      user: {
        select: { fullName: true, email: true }
      }
    }
  });

  console.log('\n=== SALES REPS ===');
  salesReps.forEach(rep => {
    console.log(`${rep.user.fullName} (${rep.user.email})`);
    console.log(`  Territory: ${rep.territoryName}`);
    console.log(`  Weekly Quota: ${rep.weeklyRevenueQuota}`);
    console.log(`  Monthly Quota: ${rep.monthlyRevenueQuota}`);
    console.log(`  Active: ${rep.isActive}`);
  });

  // Check customer risk status distribution
  const riskCounts = await prisma.customer.groupBy({
    by: ['riskStatus', 'salesRepId'],
    where: {
      tenantId: tenant.id,
      isPermanentlyClosed: false
    },
    _count: { _all: true }
  });

  console.log('\n=== CUSTOMER RISK STATUS ===');
  console.log(JSON.stringify(riskCounts, null, 2));

  // Check orders with dates
  const orderStats = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      status: { not: 'CANCELLED' }
    },
    _count: { _all: true }
  });

  const deliveredStats = await prisma.order.aggregate({
    where: {
      tenantId: tenant.id,
      status: { not: 'CANCELLED' },
      deliveredAt: { not: null }
    },
    _count: { _all: true },
    _min: { deliveredAt: true },
    _max: { deliveredAt: true }
  });

  console.log('\n=== ORDER STATS ===');
  console.log(`Total orders: ${orderStats._count._all}`);
  console.log(`Delivered orders: ${deliveredStats._count._all}`);
  console.log(`Earliest delivery: ${deliveredStats._min.deliveredAt}`);
  console.log(`Latest delivery: ${deliveredStats._max.deliveredAt}`);

  // Check current week orders for a specific rep
  const travis = salesReps.find(r => r.user.email === 'travis@wellcraftedbeverage.com');
  if (travis) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    console.log(`\n=== TRAVIS CURRENT WEEK (${weekStartStr} to ${weekEndStr}) ===`);

    const weekOrders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        customer: { salesRepId: travis.id },
        deliveredAt: {
          gte: weekStart,
          lte: weekEnd
        },
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        deliveredAt: true,
        total: true,
        customer: { select: { name: true } }
      },
      take: 10
    });

    console.log(`Orders this week: ${weekOrders.length}`);
    if (weekOrders.length > 0) {
      console.log(JSON.stringify(weekOrders, null, 2));
    }

    // Check LAST week
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(weekEnd.getDate() - 7);

    const lastWeekOrders = await prisma.order.findMany({
      where: {
        tenantId: tenant.id,
        customer: { salesRepId: travis.id },
        deliveredAt: {
          gte: lastWeekStart,
          lte: lastWeekEnd
        },
        status: { not: 'CANCELLED' }
      },
      select: {
        id: true,
        deliveredAt: true,
        total: true
      }
    });

    console.log(`\n=== TRAVIS LAST WEEK ===`);
    console.log(`Orders last week: ${lastWeekOrders.length}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

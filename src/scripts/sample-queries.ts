import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function runSampleQueries() {
  console.log('🔍 Running interesting database queries...\n');

  try {
    // 1. Top Revenue Customers
    console.log('📊 TOP 10 CUSTOMERS BY REVENUE');
    console.log('━'.repeat(60));
    const topCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      _sum: { total: true },
      _count: { id: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 10,
    });

    for (const customer of topCustomers) {
      const customerData = await prisma.customer.findUnique({
        where: { id: customer.customerId },
        select: { name: true, state: true },
      });
      console.log(
        `${customerData?.name || 'Unknown'} (${customerData?.state || 'N/A'}):`,
        `$${customer._sum.total?.toFixed(2) || '0.00'}`,
        `(${customer._count.id} orders)`
      );
    }

    // 2. Order Status Distribution
    console.log('\n\n📦 ORDER STATUS DISTRIBUTION');
    console.log('━'.repeat(60));
    const orderStatuses = await prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    orderStatuses.forEach((status) => {
      console.log(`${status.status}: ${status._count.id} orders`);
    });

    // 3. Sales Rep Performance
    console.log('\n\n👥 SALES REP PERFORMANCE');
    console.log('━'.repeat(60));
    const salesReps = await prisma.salesRep.findMany({
      include: {
        user: { select: { fullName: true } },
        customers: { select: { id: true } },
        _count: { select: { customers: true } },
      },
      where: { isActive: true },
    });

    for (const rep of salesReps) {
      console.log(
        `${rep.user.fullName} (${rep.territoryName}):`,
        `${rep._count.customers} customers`,
        rep.weeklyRevenueQuota
          ? `| Weekly Quota: $${rep.weeklyRevenueQuota}`
          : ''
      );
    }

    // 4. Customer Risk Status
    console.log('\n\n⚠️  CUSTOMER RISK BREAKDOWN');
    console.log('━'.repeat(60));
    const riskStatus = await prisma.customer.groupBy({
      by: ['riskStatus'],
      _count: { id: true },
    });
    riskStatus.forEach((risk) => {
      console.log(`${risk.riskStatus}: ${risk._count.id} customers`);
    });

    // 5. Top Products by Revenue
    console.log('\n\n🍷 TOP 10 PRODUCTS BY REVENUE');
    console.log('━'.repeat(60));
    const topProducts = await prisma.orderLine.groupBy({
      by: ['skuId'],
      _sum: { quantity: true },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    for (const product of topProducts) {
      const sku = await prisma.sku.findUnique({
        where: { id: product.skuId },
        include: { product: { select: { name: true, brand: true } } },
      });
      console.log(
        `${sku?.product.name || 'Unknown'} ${sku?.product.brand ? `(${sku.product.brand})` : ''}`,
        `- ${product._sum.quantity || 0} units`,
        `(${product._count.id} orders)`
      );
    }

    // 6. Recent Activity Summary
    console.log('\n\n📅 RECENT ACTIVITY (Last 30 Days)');
    console.log('━'.repeat(60));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentActivities = await prisma.activity.groupBy({
      by: ['activityTypeId'],
      _count: { id: true },
      where: { occurredAt: { gte: thirtyDaysAgo } },
    });

    for (const activity of recentActivities) {
      const activityType = await prisma.activityType.findUnique({
        where: { id: activity.activityTypeId },
        select: { name: true },
      });
      console.log(
        `${activityType?.name || 'Unknown'}: ${activity._count.id} activities`
      );
    }

    // 7. Sample Usage Stats
    console.log('\n\n🎁 SAMPLE USAGE STATISTICS');
    console.log('━'.repeat(60));
    const sampleStats = await prisma.sampleUsage.aggregate({
      _count: { id: true },
      _sum: { quantity: true },
    });
    const samplesConverted = await prisma.sampleUsage.count({
      where: { resultedInOrder: true },
    });
    const conversionRate =
      sampleStats._count.id > 0
        ? ((samplesConverted / sampleStats._count.id) * 100).toFixed(1)
        : '0.0';

    console.log(`Total Samples Given: ${sampleStats._sum.quantity || 0}`);
    console.log(`Sample Events: ${sampleStats._count.id}`);
    console.log(`Converted to Orders: ${samplesConverted} (${conversionRate}%)`);

    // 8. Invoice Status
    console.log('\n\n💰 INVOICE STATUS SUMMARY');
    console.log('━'.repeat(60));
    const invoiceStats = await prisma.invoice.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { total: true },
    });
    invoiceStats.forEach((invoice) => {
      console.log(
        `${invoice.status}: ${invoice._count.id} invoices`,
        `($${invoice._sum.total?.toFixed(2) || '0.00'})`
      );
    });

    // 9. Active Carts
    console.log('\n\n🛒 SHOPPING CART STATUS');
    console.log('━'.repeat(60));
    const cartStats = await prisma.cart.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    cartStats.forEach((cart) => {
      console.log(`${cart.status}: ${cart._count.id} carts`);
    });

    // 10. Monthly Order Trend (Last 6 Months)
    console.log('\n\n📈 MONTHLY ORDER TREND (Last 6 Months)');
    console.log('━'.repeat(60));
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await prisma.$queryRaw<
      Array<{ month: string; order_count: bigint; total_revenue: number }>
    >`
      SELECT
        TO_CHAR(DATE_TRUNC('month', "orderedAt"), 'YYYY-MM') as month,
        COUNT(*) as order_count,
        COALESCE(SUM(total), 0) as total_revenue
      FROM "Order"
      WHERE "orderedAt" >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', "orderedAt")
      ORDER BY month DESC
    `;

    monthlyOrders.forEach((month) => {
      console.log(
        `${month.month}: ${month.order_count} orders`,
        `($${Number(month.total_revenue).toFixed(2)})`
      );
    });
  } catch (error) {
    console.error('Error running queries:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runSampleQueries();

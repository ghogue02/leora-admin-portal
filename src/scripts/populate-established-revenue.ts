import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Populate establishedRevenue for all customers
 * Calculates annual revenue baseline using last 12 months of delivered orders
 * Required for AT_RISK_REVENUE health status to function properly
 */
async function populateEstablishedRevenue() {
  console.log('🚀 Starting establishedRevenue population...\n');

  try {
    // Get tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      throw new Error('No tenant found in database');
    }

    console.log(`📊 Tenant: ${tenant.name} (${tenant.id})\n`);

    // Get all customers with order history
    const customersWithOrders = await prisma.customer.findMany({
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
        orders: {
          some: {
            deliveredAt: { not: null },
          },
        },
      },
      select: {
        id: true,
        name: true,
        establishedRevenue: true,
        orders: {
          where: {
            deliveredAt: {
              not: null,
              gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)), // Last 12 months
            },
          },
          select: {
            total: true,
            deliveredAt: true,
          },
        },
      },
    });

    console.log(`👥 Found ${customersWithOrders.length} customers with order history\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const customer of customersWithOrders) {
      try {
        // Skip if already has establishedRevenue and it's reasonable
        if (customer.establishedRevenue && Number(customer.establishedRevenue) > 0) {
          skipped++;
          continue;
        }

        // Calculate total revenue from last 12 months
        const totalRevenue = customer.orders.reduce(
          (sum, order) => sum + Number(order.total || 0),
          0
        );

        // Calculate annualized revenue
        // If customer has < 12 months of data, extrapolate
        const oldestOrder = customer.orders.reduce(
          (oldest, order) =>
            order.deliveredAt! < oldest ? order.deliveredAt! : oldest,
          customer.orders[0]?.deliveredAt || new Date()
        );

        const monthsOfData = Math.max(
          Math.ceil(
            (new Date().getTime() - oldestOrder.getTime()) / (1000 * 60 * 60 * 24 * 30)
          ),
          1
        );

        const annualizedRevenue = monthsOfData < 12
          ? (totalRevenue / monthsOfData) * 12
          : totalRevenue;

        // Update customer
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            establishedRevenue: annualizedRevenue,
          },
        });

        updated++;

        if (updated % 100 === 0) {
          console.log(`   ✅ Processed ${updated} customers...`);
        }
      } catch (error) {
        console.error(`   ❌ Error updating customer ${customer.name}:`, error);
        errors++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ESTABLISHED REVENUE POPULATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n✅ Updated: ${updated} customers`);
    console.log(`⏭️  Skipped: ${skipped} customers (already had established revenue)`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} customers`);
    }
    console.log('\n' + '='.repeat(60));

    // Get statistics
    const stats = await prisma.customer.aggregate({
      where: {
        tenantId: tenant.id,
        establishedRevenue: { not: null },
      },
      _count: { _all: true },
      _avg: { establishedRevenue: true },
      _max: { establishedRevenue: true },
      _min: { establishedRevenue: true },
    });

    console.log('\n📈 REVENUE STATISTICS:');
    console.log(`   • Customers with established revenue: ${stats._count._all}`);
    console.log(`   • Average annual revenue: $${Number(stats._avg.establishedRevenue || 0).toFixed(2)}`);
    console.log(`   • Highest annual revenue: $${Number(stats._max.establishedRevenue || 0).toFixed(2)}`);
    console.log(`   • Lowest annual revenue: $${Number(stats._min.establishedRevenue || 0).toFixed(2)}`);
    console.log('\n✅ AT_RISK_REVENUE health status is now ready to use!\n');

  } catch (error) {
    console.error('\n❌ Fatal error during population:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateEstablishedRevenue()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

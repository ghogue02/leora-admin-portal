import { withTenant } from '@/lib/prisma';
import { subMonths } from 'date-fns';

// Default tenant ID from environment
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || '550e8400-e29b-41d4-a716-446655440000';

async function checkCustomerOrders() {
  try {
    console.log('🔍 Searching for customer: Wells Discount Wine (Baltimore City)');
    console.log('   Using Tenant ID:', TENANT_ID);
    console.log('');

    const result = await withTenant(TENANT_ID, async (db) => {
      // Find the customer
      const customer = await db.customer.findFirst({
        where: {
          tenantId: TENANT_ID,
          name: {
            contains: 'Wells Discount Wine',
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          tenantId: true
        }
      });

      if (!customer) {
        return null;
      }

      // Get total order count
      const totalOrders = await db.order.count({
        where: {
          customerId: customer.id,
          tenantId: TENANT_ID
        }
      });

      // Get orders from last 6 months
      const sixMonthsAgo = subMonths(new Date(), 6);

      const recentOrders = await db.order.findMany({
        where: {
          customerId: customer.id,
          tenantId: TENANT_ID,
          orderedAt: {
            gte: sixMonthsAgo
          }
        },
        select: {
          id: true,
          orderNumber: true,
          orderedAt: true,
          status: true,
          totalAmount: true
        },
        orderBy: {
          orderedAt: 'desc'
        }
      });

      return { customer, totalOrders, recentOrders };
    });

    if (!result) {
      console.log('❌ Customer not found');
      return;
    }

    const { customer, totalOrders, recentOrders } = result;

    console.log('✅ Customer Found:');
    console.log('  ID:', customer.id);
    console.log('  Name:', customer.name);
    console.log('  Tenant ID:', customer.tenantId);
    console.log('');

    console.log('📦 Total Orders (All Time):', totalOrders);
    console.log('');

    console.log('📅 Orders in Last 6 Months:', recentOrders.length);
    console.log('');

    if (recentOrders.length > 0) {
      console.log('Recent Orders:');
      recentOrders.forEach((order, idx) => {
        console.log(`  ${idx + 1}. Order #${order.orderNumber}`);
        console.log(`     ID: ${order.id}`);
        console.log(`     Date: ${order.orderedAt.toISOString().split('T')[0]}`);
        console.log(`     Status: ${order.status}`);
        console.log(`     Amount: $${order.totalAmount}`);
        console.log('');
      });

      // Count by status
      const statusCounts = recentOrders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Status Breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      const nonCancelledCount = recentOrders.filter(o => o.status !== 'CANCELLED').length;
      console.log('');
      console.log('🎯 Non-Cancelled Orders:', nonCancelledCount);
      console.log('');

      // Summary
      console.log('📊 SUMMARY:');
      console.log(`   Customer should ${nonCancelledCount > 0 ? '✅ HAVE' : '❌ NOT HAVE'} recent purchases to display`);
      console.log(`   Recent non-cancelled orders: ${nonCancelledCount}`);
    } else {
      console.log('⚠️  No orders found in the last 6 months');
      console.log('');
      console.log('📊 SUMMARY:');
      console.log('   Customer should ❌ NOT HAVE recent purchases to display');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

checkCustomerOrders();

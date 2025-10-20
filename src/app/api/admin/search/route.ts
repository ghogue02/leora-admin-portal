import { NextRequest, NextResponse } from 'next/server';
import { withAdminSession } from '@/lib/auth/admin';

export async function GET(request: NextRequest) {
  return withAdminSession(request, async ({ db, tenantId }) => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const searchQuery = `%${query}%`;

    // Search across multiple entities in parallel
    const [customers, orders, users, inventory] = await Promise.all([
      // Search customers
      db.customer.findMany({
        where: {
          tenantId,
          OR: [
            { accountNumber: { contains: query, mode: 'insensitive' } },
            { billingEmail: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          accountNumber: true,
          billingEmail: true,
        },
        take: 5,
      }),

      // Search orders (UUID can't use contains, use startsWith or equals)
      db.order.findMany({
        where: {
          tenantId,
          id: { startsWith: query },
        },
        select: {
          id: true,
          status: true,
          orderedAt: true,
          customer: {
            select: {
              id: true,
            },
          },
        },
        take: 5,
      }),

      // Search users
      db.user.findMany({
        where: {
          tenantId,
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { fullName: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          email: true,
          fullName: true,
        },
        take: 5,
      }),

      // Search inventory/products
      db.sku.findMany({
        where: {
          tenantId,
          OR: [
            { code: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          code: true,
          productId: true,
        },
        take: 5,
      }),
    ]);

    // Format results
    const results = [];

    if (customers.length > 0) {
      results.push({
        type: 'customers',
        label: 'Customers',
        results: customers.map((c) => ({
          id: c.id,
          type: 'customer',
          title: c.accountNumber,
          subtitle: c.billingEmail,
          url: `/admin/customers/${c.id}`,
        })),
      });
    }

    if (orders.length > 0) {
      results.push({
        type: 'orders',
        label: 'Orders',
        results: orders.map((o) => ({
          id: o.id,
          type: 'order',
          title: `Order ${o.id}`,
          subtitle: o.status,
          url: `/sales/admin/orders/${o.id}`,
        })),
      });
    }

    if (users.length > 0) {
      results.push({
        type: 'users',
        label: 'Users',
        results: users.map((u) => ({
          id: u.id,
          type: 'user',
          title: u.fullName,
          subtitle: u.email,
          url: `/admin/accounts/user/${u.id}`,
        })),
      });
    }

    if (inventory.length > 0) {
      results.push({
        type: 'products',
        label: 'Products',
        results: inventory.map((i) => ({
          id: i.id,
          type: 'product',
          title: i.code,
          subtitle: 'Product',
          url: `/admin/inventory/${i.id}`,
        })),
      });
    }

    return NextResponse.json({ results });
  });
}

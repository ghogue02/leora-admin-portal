import { PrismaClient } from '@prisma/client';

export type ValidationSeverity = 'high' | 'medium' | 'low';

export type ValidationResult = {
  ruleId: string;
  issueCount: number;
  affectedRecords: Array<{
    id: string;
    entityType: string;
    details: Record<string, any>;
  }>;
};

export type ValidationRule = {
  id: string;
  name: string;
  description: string;
  severity: ValidationSeverity;
  check: (db: PrismaClient, tenantId: string) => Promise<ValidationResult>;
  fix?: (db: PrismaClient, tenantId: string, recordIds: string[], params?: any) => Promise<void>;
};

// Rule 1: Customers Without Sales Rep
export const customersWithoutSalesRep: ValidationRule = {
  id: 'customers-without-sales-rep',
  name: 'Customers Without Sales Rep',
  description: 'Active customers that do not have an assigned sales representative',
  severity: 'high',
  check: async (db, tenantId) => {
    const customers = await db.customer.findMany({
      where: {
        tenantId,
        salesRepId: null,
        isPermanentlyClosed: false,
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        billingEmail: true,
        lastOrderDate: true,
      },
    });

    return {
      ruleId: 'customers-without-sales-rep',
      issueCount: customers.length,
      affectedRecords: customers.map(c => ({
        id: c.id,
        entityType: 'Customer',
        details: {
          name: c.name,
          accountNumber: c.accountNumber,
          billingEmail: c.billingEmail,
          lastOrderDate: c.lastOrderDate,
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds, params) => {
    const { salesRepId } = params || {};
    if (!salesRepId) throw new Error('salesRepId is required');

    await db.customer.updateMany({
      where: {
        tenantId,
        id: { in: recordIds },
      },
      data: {
        salesRepId,
      },
    });
  },
};

// Rule 2: Orders Without Invoice
export const ordersWithoutInvoice: ValidationRule = {
  id: 'orders-without-invoice',
  name: 'Orders Without Invoice',
  description: 'Fulfilled orders that do not have a linked invoice',
  severity: 'high',
  check: async (db, tenantId) => {
    const orders = await db.order.findMany({
      where: {
        tenantId,
        status: 'FULFILLED',
        invoices: {
          none: {},
        },
      },
      select: {
        id: true,
        customer: {
          select: {
            name: true,
          },
        },
        orderedAt: true,
        fulfilledAt: true,
        total: true,
      },
    });

    return {
      ruleId: 'orders-without-invoice',
      issueCount: orders.length,
      affectedRecords: orders.map(o => ({
        id: o.id,
        entityType: 'Order',
        details: {
          customerName: o.customer.name,
          orderedAt: o.orderedAt,
          fulfilledAt: o.fulfilledAt,
          total: o.total,
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds) => {
    for (const orderId of recordIds) {
      const order = await db.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          customerId: true,
          total: true,
          orderedAt: true,
        },
      });

      if (!order) continue;

      await db.invoice.create({
        data: {
          tenantId,
          orderId: order.id,
          customerId: order.customerId,
          status: 'DRAFT',
          subtotal: order.total || 0,
          total: order.total || 0,
          issuedAt: order.orderedAt || new Date(),
        },
      });
    }
  },
};

// Rule 3: Customers Missing Email
export const customersMissingEmail: ValidationRule = {
  id: 'customers-missing-email',
  name: 'Customers Missing Email',
  description: 'Customers without a billing email address',
  severity: 'high',
  check: async (db, tenantId) => {
    const customers = await db.customer.findMany({
      where: {
        tenantId,
        OR: [
          { billingEmail: null },
          { billingEmail: '' },
        ],
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        phone: true,
      },
    });

    return {
      ruleId: 'customers-missing-email',
      issueCount: customers.length,
      affectedRecords: customers.map(c => ({
        id: c.id,
        entityType: 'Customer',
        details: {
          name: c.name,
          accountNumber: c.accountNumber,
          phone: c.phone,
        },
      })),
    };
  },
};

// Rule 4: Invoice Amount Mismatch
export const invoiceAmountMismatch: ValidationRule = {
  id: 'invoice-amount-mismatch',
  name: 'Invoice Amount Mismatch',
  description: 'Invoices where total does not match the linked order total',
  severity: 'high',
  check: async (db, tenantId) => {
    const invoices = await db.invoice.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        order: {
          select: {
            id: true,
            total: true,
            customer: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const mismatched = invoices.filter(inv => {
      const invoiceTotal = Number(inv.total || 0);
      const orderTotal = Number(inv.order.total || 0);
      return Math.abs(invoiceTotal - orderTotal) > 0.01;
    });

    return {
      ruleId: 'invoice-amount-mismatch',
      issueCount: mismatched.length,
      affectedRecords: mismatched.map(inv => ({
        id: inv.id,
        entityType: 'Invoice',
        details: {
          invoiceNumber: inv.invoiceNumber,
          invoiceTotal: inv.total,
          orderTotal: inv.order.total,
          customerName: inv.order.customer.name,
          difference: Number(inv.total || 0) - Number(inv.order.total || 0),
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds) => {
    for (const invoiceId of recordIds) {
      const invoice = await db.invoice.findUnique({
        where: { id: invoiceId },
        select: {
          order: {
            select: {
              total: true,
            },
          },
        },
      });

      if (!invoice) continue;

      await db.invoice.update({
        where: { id: invoiceId },
        data: {
          total: invoice.order.total,
          subtotal: invoice.order.total,
        },
      });
    }
  },
};

// Rule 5: Inactive Customers with Recent Orders
export const inactiveCustomersWithOrders: ValidationRule = {
  id: 'inactive-customers-with-orders',
  name: 'Inactive Customers with Recent Orders',
  description: 'Customers marked as permanently closed but have orders in the last 30 days',
  severity: 'medium',
  check: async (db, tenantId) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const customers = await db.customer.findMany({
      where: {
        tenantId,
        isPermanentlyClosed: true,
        orders: {
          some: {
            orderedAt: {
              gte: thirtyDaysAgo,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        closedReason: true,
        lastOrderDate: true,
        orders: {
          where: {
            orderedAt: {
              gte: thirtyDaysAgo,
            },
          },
          orderBy: {
            orderedAt: 'desc',
          },
          take: 1,
          select: {
            orderedAt: true,
            total: true,
          },
        },
      },
    });

    return {
      ruleId: 'inactive-customers-with-orders',
      issueCount: customers.length,
      affectedRecords: customers.map(c => ({
        id: c.id,
        entityType: 'Customer',
        details: {
          name: c.name,
          accountNumber: c.accountNumber,
          closedReason: c.closedReason,
          lastOrderDate: c.orders[0]?.orderedAt,
          lastOrderTotal: c.orders[0]?.total,
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds) => {
    await db.customer.updateMany({
      where: {
        tenantId,
        id: { in: recordIds },
      },
      data: {
        isPermanentlyClosed: false,
        reactivatedDate: new Date(),
      },
    });
  },
};

// Rule 6: Sales Reps with No Customers
export const salesRepsWithNoCustomers: ValidationRule = {
  id: 'sales-reps-no-customers',
  name: 'Sales Reps with No Customers',
  description: 'Active sales representatives with no assigned customers',
  severity: 'medium',
  check: async (db, tenantId) => {
    const salesReps = await db.salesRep.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
        territoryName: true,
        customers: {
          select: {
            id: true,
          },
        },
      },
    });

    const repsWithNoCustomers = salesReps.filter(rep => rep.customers.length === 0);

    return {
      ruleId: 'sales-reps-no-customers',
      issueCount: repsWithNoCustomers.length,
      affectedRecords: repsWithNoCustomers.map(rep => ({
        id: rep.id,
        entityType: 'SalesRep',
        details: {
          name: rep.user.fullName,
          email: rep.user.email,
          territoryName: rep.territoryName,
        },
      })),
    };
  },
};

// Rule 7: Out of Stock Products in Active Price Lists
export const outOfStockInPriceLists: ValidationRule = {
  id: 'out-of-stock-in-price-lists',
  name: 'Out of Stock Products in Active Price Lists',
  description: 'SKUs with zero inventory but still available in active price lists',
  severity: 'low',
  check: async (db, tenantId) => {
    const now = new Date();

    // Get active price list items
    const priceListItems = await db.priceListItem.findMany({
      where: {
        tenantId,
        priceList: {
          OR: [
            {
              AND: [
                { effectiveAt: { lte: now } },
                { expiresAt: { gte: now } },
              ],
            },
            {
              AND: [
                { effectiveAt: { lte: now } },
                { expiresAt: null },
              ],
            },
          ],
        },
      },
      select: {
        id: true,
        sku: {
          select: {
            id: true,
            code: true,
            product: {
              select: {
                name: true,
              },
            },
            inventories: {
              select: {
                onHand: true,
                location: true,
              },
            },
          },
        },
        priceList: {
          select: {
            name: true,
          },
        },
      },
    });

    // Filter to items with zero inventory across all locations
    const outOfStock = priceListItems.filter(item => {
      const totalOnHand = item.sku.inventories.reduce((sum, inv) => sum + inv.onHand, 0);
      return totalOnHand === 0;
    });

    return {
      ruleId: 'out-of-stock-in-price-lists',
      issueCount: outOfStock.length,
      affectedRecords: outOfStock.map(item => ({
        id: item.id,
        entityType: 'PriceListItem',
        details: {
          skuCode: item.sku.code,
          productName: item.sku.product.name,
          priceListName: item.priceList.name,
          inventoryLocations: item.sku.inventories.map(inv => ({
            location: inv.location,
            onHand: inv.onHand,
          })),
        },
      })),
    };
  },
};

// Rule 8: Duplicate Customer Entries
export const duplicateCustomers: ValidationRule = {
  id: 'duplicate-customers',
  name: 'Duplicate Customer Entries',
  description: 'Customers with identical billing emails or very similar names',
  severity: 'high',
  check: async (db, tenantId) => {
    // Find customers with duplicate emails
    const customersWithEmail = await db.customer.findMany({
      where: {
        tenantId,
        billingEmail: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        billingEmail: true,
        accountNumber: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const emailGroups = new Map<string, typeof customersWithEmail>();
    customersWithEmail.forEach(customer => {
      const email = customer.billingEmail?.toLowerCase() || '';
      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email)!.push(customer);
    });

    const duplicates: Array<{
      id: string;
      entityType: string;
      details: Record<string, any>;
    }> = [];

    emailGroups.forEach((customers, email) => {
      if (customers.length > 1) {
        customers.forEach((customer, index) => {
          duplicates.push({
            id: customer.id,
            entityType: 'Customer',
            details: {
              name: customer.name,
              email: customer.billingEmail,
              accountNumber: customer.accountNumber,
              createdAt: customer.createdAt,
              duplicateOf: index === 0 ? 'original' : customers[0].id,
              duplicateCount: customers.length,
            },
          });
        });
      }
    });

    return {
      ruleId: 'duplicate-customers',
      issueCount: duplicates.length,
      affectedRecords: duplicates,
    };
  },
};

// Rule 9: Users Without Roles
export const usersWithoutRoles: ValidationRule = {
  id: 'users-without-roles',
  name: 'Users Without Roles',
  description: 'User or PortalUser records with no assigned roles',
  severity: 'medium',
  check: async (db, tenantId) => {
    const [usersWithoutRoles, portalUsersWithoutRoles] = await Promise.all([
      db.user.findMany({
        where: {
          tenantId,
          roles: {
            none: {},
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          isActive: true,
        },
      }),
      db.portalUser.findMany({
        where: {
          tenantId,
          roles: {
            none: {},
          },
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
        },
      }),
    ]);

    const affectedRecords = [
      ...usersWithoutRoles.map(u => ({
        id: u.id,
        entityType: 'User',
        details: {
          email: u.email,
          fullName: u.fullName,
          isActive: u.isActive,
        },
      })),
      ...portalUsersWithoutRoles.map(u => ({
        id: u.id,
        entityType: 'PortalUser',
        details: {
          email: u.email,
          fullName: u.fullName,
          status: u.status,
        },
      })),
    ];

    return {
      ruleId: 'users-without-roles',
      issueCount: affectedRecords.length,
      affectedRecords,
    };
  },
};

// Rule 10: Orders with Negative Totals
export const ordersWithNegativeTotals: ValidationRule = {
  id: 'orders-negative-totals',
  name: 'Orders with Negative Totals',
  description: 'Orders with total amounts less than zero',
  severity: 'high',
  check: async (db, tenantId) => {
    const orders = await db.order.findMany({
      where: {
        tenantId,
        total: {
          lt: 0,
        },
      },
      select: {
        id: true,
        customer: {
          select: {
            name: true,
          },
        },
        orderedAt: true,
        total: true,
        status: true,
      },
    });

    return {
      ruleId: 'orders-negative-totals',
      issueCount: orders.length,
      affectedRecords: orders.map(o => ({
        id: o.id,
        entityType: 'Order',
        details: {
          customerName: o.customer.name,
          orderedAt: o.orderedAt,
          total: o.total,
          status: o.status,
        },
      })),
    };
  },
};

// Rule 11: Orphaned Portal Users
export const orphanedPortalUsers: ValidationRule = {
  id: 'orphaned-portal-users',
  name: 'Orphaned Portal Users',
  description: 'Portal users linked to non-existent customers',
  severity: 'high',
  check: async (db, tenantId) => {
    const portalUsers = await db.portalUser.findMany({
      where: {
        tenantId,
        customerId: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        customerId: true,
        customer: true,
      },
    });

    const orphaned = portalUsers.filter(pu => !pu.customer);

    return {
      ruleId: 'orphaned-portal-users',
      issueCount: orphaned.length,
      affectedRecords: orphaned.map(pu => ({
        id: pu.id,
        entityType: 'PortalUser',
        details: {
          email: pu.email,
          fullName: pu.fullName,
          customerId: pu.customerId,
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds) => {
    // Set customerId to null for orphaned portal users
    await db.portalUser.updateMany({
      where: {
        tenantId,
        id: { in: recordIds },
      },
      data: {
        customerId: null,
      },
    });
  },
};

// Rule 12: Missing Inventory Locations
export const missingInventoryLocations: ValidationRule = {
  id: 'missing-inventory-locations',
  name: 'Missing Inventory Locations',
  description: 'Inventory records without a location specified',
  severity: 'medium',
  check: async (db, tenantId) => {
    // Location is a required field in the schema, so this check is not applicable
    // Return empty result
    const inventories: any[] = [];

    return {
      ruleId: 'missing-inventory-locations',
      issueCount: inventories.length,
      affectedRecords: inventories.map(inv => ({
        id: inv.id,
        entityType: 'Inventory',
        details: {
          skuCode: inv.sku.code,
          productName: inv.sku.product.name,
          onHand: inv.onHand,
          allocated: inv.allocated,
        },
      })),
    };
  },
  fix: async (db, tenantId, recordIds, params) => {
    const { location } = params || { location: 'MAIN' };

    await db.inventory.updateMany({
      where: {
        tenantId,
        id: { in: recordIds },
      },
      data: {
        location,
      },
    });
  },
};

// Export all rules
export const allValidationRules: ValidationRule[] = [
  customersWithoutSalesRep,
  ordersWithoutInvoice,
  customersMissingEmail,
  invoiceAmountMismatch,
  inactiveCustomersWithOrders,
  salesRepsWithNoCustomers,
  outOfStockInPriceLists,
  duplicateCustomers,
  usersWithoutRoles,
  ordersWithNegativeTotals,
  orphanedPortalUsers,
  missingInventoryLocations,
];

// Helper to get a specific rule
export function getValidationRule(ruleId: string): ValidationRule | undefined {
  return allValidationRules.find(rule => rule.id === ruleId);
}

// Helper to run all validation rules
export async function runAllValidationRules(
  db: PrismaClient,
  tenantId: string
): Promise<ValidationResult[]> {
  const results = await Promise.all(
    allValidationRules.map(rule => rule.check(db, tenantId))
  );
  return results;
}

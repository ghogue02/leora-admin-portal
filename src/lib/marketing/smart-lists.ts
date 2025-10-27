/**
 * Smart Lists - Auto-population logic
 * Dynamically populate email lists based on criteria
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface SmartListCriteria {
  type:
    | 'all_in_territory'
    | 'high_value'
    | 'ordered_product'
    | 'no_order_in_days'
    | 'account_type'
    | 'account_priority'
    | 'custom';
  territory?: string;
  minRevenue?: number;
  productId?: string;
  skuId?: string;
  days?: number;
  accountType?: string;
  accountPriority?: string;
  customQuery?: Prisma.CustomerWhereInput;
}

/**
 * Build Prisma where clause from smart list criteria
 */
export function buildSmartListQuery(
  tenantId: string,
  criteria: SmartListCriteria
): Prisma.CustomerWhereInput {
  const baseWhere: Prisma.CustomerWhereInput = {
    tenantId,
  };

  switch (criteria.type) {
    case 'all_in_territory':
      return {
        ...baseWhere,
        territory: criteria.territory,
      };

    case 'high_value':
      return {
        ...baseWhere,
        establishedRevenue: {
          gte: criteria.minRevenue || 10000,
        },
      };

    case 'ordered_product':
      return {
        ...baseWhere,
        orders: {
          some: {
            lines: {
              some: {
                skuId: criteria.skuId,
              },
            },
          },
        },
      };

    case 'no_order_in_days':
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (criteria.days || 30));

      return {
        ...baseWhere,
        OR: [
          {
            lastOrderDate: {
              lt: cutoffDate,
            },
          },
          {
            lastOrderDate: null,
          },
        ],
      };

    case 'account_type':
      return {
        ...baseWhere,
        accountType: criteria.accountType as any,
      };

    case 'account_priority':
      return {
        ...baseWhere,
        accountPriority: criteria.accountPriority as any,
      };

    case 'custom':
      return {
        ...baseWhere,
        ...criteria.customQuery,
      };

    default:
      return baseWhere;
  }
}

/**
 * Populate smart list with customers matching criteria
 */
export async function populateSmartList(
  tenantId: string,
  listId: string
): Promise<{ added: number; removed: number }> {
  const list = await prisma.emailList.findUnique({
    where: { id: listId },
  });

  if (!list || !list.isSmartList || !list.smartCriteria) {
    throw new Error('Not a valid smart list');
  }

  const criteria = list.smartCriteria as SmartListCriteria;
  const where = buildSmartListQuery(tenantId, criteria);

  // Get all customers matching criteria
  const customers = await prisma.customer.findMany({
    where,
    select: { id: true },
  });

  const customerIds = customers.map((c) => c.id);

  // Get existing members
  const existingMembers = await prisma.emailListMember.findMany({
    where: { listId },
    select: { customerId: true },
  });

  const existingIds = new Set(existingMembers.map((m) => m.customerId));

  // Add new members
  const toAdd = customerIds.filter((id) => !existingIds.has(id));
  const addedCount = await prisma.emailListMember.createMany({
    data: toAdd.map((customerId) => ({
      tenantId,
      listId,
      customerId,
    })),
    skipDuplicates: true,
  });

  // Remove members no longer matching
  const toRemove = Array.from(existingIds).filter(
    (id) => !customerIds.includes(id)
  );
  const removedCount = await prisma.emailListMember.deleteMany({
    where: {
      listId,
      customerId: {
        in: toRemove,
      },
    },
  });

  // Update member count
  await prisma.emailList.update({
    where: { id: listId },
    data: {
      memberCount: customerIds.length,
    },
  });

  return {
    added: addedCount.count,
    removed: removedCount.count,
  };
}

/**
 * Refresh all smart lists for a tenant
 */
export async function refreshAllSmartLists(
  tenantId: string
): Promise<{ updated: number }> {
  const smartLists = await prisma.emailList.findMany({
    where: {
      tenantId,
      isSmartList: true,
    },
  });

  for (const list of smartLists) {
    await populateSmartList(tenantId, list.id);
  }

  return { updated: smartLists.length };
}

/**
 * Preview smart list results (without saving)
 */
export async function previewSmartList(
  tenantId: string,
  criteria: SmartListCriteria
): Promise<{ count: number; preview: any[] }> {
  const where = buildSmartListQuery(tenantId, criteria);

  const [count, preview] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        billingEmail: true,
        territory: true,
        establishedRevenue: true,
      },
    }),
  ]);

  return { count, preview };
}

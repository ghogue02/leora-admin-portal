/**
 * Pick Sheet Generator Service
 * Handles pick sheet creation, management, and CSV export
 */

import { prisma } from '@/lib/prisma';
import { PickSheet, PickSheetItem, PickSheetStatus, Prisma } from '@prisma/client';
import { parseLocation } from '@/lib/warehouse';

export interface GeneratePickSheetOptions {
  orderIds?: string[];
  includeStatuses?: string[];
}

export interface PickSheetWithItems extends PickSheet {
  items: (PickSheetItem & {
    sku: { code: string; product: { name: string } };
    customer: { name: string };
    orderLine: { order: { id: string } };
  })[];
}

/**
 * Generate a new pick sheet from submitted orders
 */
export async function generatePickSheet(
  tenantId: string,
  userId: string,
  options: GeneratePickSheetOptions = {}
): Promise<PickSheetWithItems> {
  const { orderIds, includeStatuses = ['SUBMITTED'] } = options;

  // Build query for eligible orders
  const where: Prisma.OrderWhereInput = {
    tenantId,
    status: { in: includeStatuses },
    pickSheetStatus: 'not_picked',
  };

  if (orderIds && orderIds.length > 0) {
    where.id = { in: orderIds };
  }

  // Get orders with lines and inventory
  const orders = await prisma.order.findMany({
    where,
    include: {
      lines: {
        include: {
          sku: {
            include: {
              inventories: {
                where: {
                  tenantId,
                  onHand: { gt: 0 },
                },
                orderBy: {
                  pickOrder: 'asc',
                },
              },
              product: true,
            },
          },
        },
      },
      customer: true,
    },
  });

  if (orders.length === 0) {
    throw new Error('No eligible orders found for pick sheet generation');
  }

  // Generate sheet number
  const lastSheet = await prisma.pickSheet.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  const sheetNumber = lastSheet
    ? `PS-${String(parseInt(lastSheet.sheetNumber.replace('PS-', '')) + 1).padStart(6, '0')}`
    : 'PS-000001';

  // Create pick sheet items
  const pickSheetItems: Prisma.PickSheetItemCreateManyInput[] = [];

  for (const order of orders) {
    for (const line of order.lines) {
      const inventory = line.sku.inventories[0];
      if (!inventory) continue;

      // Calculate pickOrder from inventory location
      const locationParse = parseLocation(inventory.location);
      const pickOrder = locationParse.pickOrder || inventory.pickOrder || 999999;

      pickSheetItems.push({
        tenantId,
        pickSheetId: '', // Will be set after pickSheet creation
        orderLineId: line.id,
        skuId: line.skuId,
        customerId: order.customerId,
        quantity: line.quantity,
        pickOrder,
      });
    }
  }

  // Sort items by pickOrder
  pickSheetItems.sort((a, b) => a.pickOrder - b.pickOrder);

  // Create pick sheet with items in a transaction
  const pickSheet = await prisma.$transaction(async (tx) => {
    // Create pick sheet
    const sheet = await tx.pickSheet.create({
      data: {
        tenantId,
        sheetNumber,
        status: PickSheetStatus.READY,
        createdById: userId,
      },
    });

    // Update pickSheetId in items
    pickSheetItems.forEach((item) => {
      item.pickSheetId = sheet.id;
    });

    // Create items
    await tx.pickSheetItem.createMany({
      data: pickSheetItems,
    });

    // Update order statuses
    await tx.order.updateMany({
      where: {
        id: { in: orders.map((o) => o.id) },
      },
      data: {
        pickSheetStatus: 'on_sheet',
        pickSheetId: sheet.id,
      },
    });

    return sheet;
  });

  // Fetch complete pick sheet with items
  return getPickSheetById(tenantId, pickSheet.id);
}

/**
 * Get pick sheet by ID with all related data
 */
export async function getPickSheetById(
  tenantId: string,
  pickSheetId: string
): Promise<PickSheetWithItems> {
  const sheet = await prisma.pickSheet.findUnique({
    where: {
      id: pickSheetId,
      tenantId,
    },
    include: {
      items: {
        orderBy: {
          pickOrder: 'asc',
        },
        include: {
          sku: {
            include: {
              product: true,
            },
          },
          customer: true,
          orderLine: {
            include: {
              order: true,
            },
          },
        },
      },
    },
  });

  if (!sheet) {
    throw new Error('Pick sheet not found');
  }

  return sheet as PickSheetWithItems;
}

/**
 * Start picking a pick sheet
 */
export async function startPicking(
  tenantId: string,
  pickSheetId: string,
  pickerName: string
): Promise<PickSheet> {
  const sheet = await prisma.pickSheet.findUnique({
    where: { id: pickSheetId, tenantId },
  });

  if (!sheet) {
    throw new Error('Pick sheet not found');
  }

  if (sheet.status !== PickSheetStatus.READY) {
    throw new Error('Pick sheet must be in READY status to start picking');
  }

  return prisma.pickSheet.update({
    where: { id: pickSheetId },
    data: {
      status: PickSheetStatus.PICKING,
      pickerName,
      startedAt: new Date(),
    },
  });
}

/**
 * Mark a pick sheet item as picked
 */
export async function markItemPicked(
  tenantId: string,
  itemId: string
): Promise<PickSheetItem> {
  const item = await prisma.pickSheetItem.findUnique({
    where: { id: itemId, tenantId },
    include: { pickSheet: true },
  });

  if (!item) {
    throw new Error('Pick sheet item not found');
  }

  if (item.pickSheet.status !== PickSheetStatus.PICKING) {
    throw new Error('Pick sheet must be in PICKING status');
  }

  return prisma.pickSheetItem.update({
    where: { id: itemId },
    data: {
      isPicked: true,
      pickedAt: new Date(),
    },
  });
}

/**
 * Complete a pick sheet
 */
export async function completePickSheet(
  tenantId: string,
  pickSheetId: string
): Promise<PickSheet> {
  const sheet = await prisma.pickSheet.findUnique({
    where: { id: pickSheetId, tenantId },
    include: { items: true },
  });

  if (!sheet) {
    throw new Error('Pick sheet not found');
  }

  if (sheet.status !== PickSheetStatus.PICKING) {
    throw new Error('Pick sheet must be in PICKING status');
  }

  // Check if all items are picked
  const unpicked = sheet.items.filter((item) => !item.isPicked);
  if (unpicked.length > 0) {
    throw new Error(`Cannot complete pick sheet: ${unpicked.length} items not yet picked`);
  }

  return prisma.pickSheet.update({
    where: { id: pickSheetId },
    data: {
      status: PickSheetStatus.PICKED,
      completedAt: new Date(),
    },
  });
}

/**
 * Cancel a pick sheet and rollback order statuses
 */
export async function cancelPickSheet(
  tenantId: string,
  pickSheetId: string
): Promise<PickSheet> {
  return prisma.$transaction(async (tx) => {
    const sheet = await tx.pickSheet.findUnique({
      where: { id: pickSheetId, tenantId },
      include: { items: { include: { orderLine: true } } },
    });

    if (!sheet) {
      throw new Error('Pick sheet not found');
    }

    if (sheet.status === PickSheetStatus.PICKED) {
      throw new Error('Cannot cancel a completed pick sheet');
    }

    // Get unique order IDs
    const orderIds = [...new Set(sheet.items.map((item) => item.orderLine.orderId))];

    // Update order statuses back to not_picked
    await tx.order.updateMany({
      where: { id: { in: orderIds } },
      data: {
        pickSheetStatus: 'not_picked',
        pickSheetId: null,
      },
    });

    // Cancel pick sheet
    return tx.pickSheet.update({
      where: { id: pickSheetId },
      data: {
        status: PickSheetStatus.CANCELLED,
      },
    });
  });
}

/**
 * Export pick sheet to CSV format
 */
export async function exportPickSheetCSV(
  tenantId: string,
  pickSheetId: string
): Promise<string> {
  const sheet = await getPickSheetById(tenantId, pickSheetId);

  const headers = [
    'Pick Order',
    'Customer',
    'SKU',
    'Product',
    'Quantity',
    'Order ID',
    'Picked',
  ];

  const rows = sheet.items.map((item) => [
    item.pickOrder.toString(),
    item.customer.name,
    item.sku.code,
    item.sku.product.name,
    item.quantity.toString(),
    item.orderLine.order.id,
    item.isPicked ? 'Yes' : 'No',
  ]);

  // Build CSV
  const csvLines = [headers.join(',')];
  rows.forEach((row) => {
    csvLines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
  });

  return csvLines.join('\n');
}

/**
 * List pick sheets with filtering
 */
export async function listPickSheets(
  tenantId: string,
  filters: {
    status?: PickSheetStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<PickSheet[]> {
  const { status, limit = 50, offset = 0 } = filters;

  const where: Prisma.PickSheetWhereInput = { tenantId };
  if (status) {
    where.status = status;
  }

  return prisma.pickSheet.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      createdBy: {
        select: {
          fullName: true,
          email: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });
}

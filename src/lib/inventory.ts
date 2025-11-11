/**
 * Inventory Transaction Service Layer
 *
 * Provides atomic inventory operations with transaction support to ensure
 * data consistency across inventory state transitions.
 *
 * State Machine Flow:
 * AVAILABLE → (allocate) → ALLOCATED → (ship) → SHIPPED
 *            ↑           ↓
 *            └── (release) ──┘
 */

import { prisma } from '@/lib/prisma';
import { Prisma, type OrderStatus } from '@prisma/client';
import { getAvailableQty } from './inventory/availability';
import { publishOrderStatusUpdated } from '@/lib/realtime/orders.server';
import { publishInventoryStockChanged } from '@/lib/realtime/inventory.server';

/**
 * Inventory transaction types for audit trail
 */
export enum InventoryTransactionType {
  ALLOCATION = 'ALLOCATION',
  RELEASE = 'RELEASE',
  SHIPMENT = 'SHIPMENT',
  ADJUSTMENT = 'ADJUSTMENT',
}

/**
 * Error types for inventory operations
 */
export class InventoryError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'InventoryError';
  }
}

export class InsufficientInventoryError extends InventoryError {
  constructor(skuId: string, requested: number, available: number) {
    super(
      `Insufficient inventory for SKU ${skuId}. Requested: ${requested}, Available: ${available}`,
      'INSUFFICIENT_INVENTORY',
      { skuId, requested, available }
    );
  }
}

export class InventoryNotFoundError extends InventoryError {
  constructor(skuId: string, location: string) {
    super(
      `Inventory not found for SKU ${skuId} at location ${location}`,
      'INVENTORY_NOT_FOUND',
      { skuId, location }
    );
  }
}

type InventoryStockEvent = {
  tenantId: string;
  inventoryId: string;
  skuId: string;
  location: string;
  onHand: number;
  allocated: number;
  updatedAt: Date;
};

type OrderStatusEvent = {
  tenantId: string;
  orderId: string;
  customerId: string;
  salesRepId: string | null;
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
  updatedAt: Date;
};

/**
 * Allocate inventory for an order atomically
 *
 * This operation:
 * 1. Checks inventory availability
 * 2. Updates inventory allocated quantity
 * 3. Creates audit trail records
 * 4. Updates order status
 *
 * All operations happen within a transaction - either all succeed or all rollback
 *
 * @param orderId - The order ID to allocate inventory for
 * @param items - Array of items with productId and quantity
 * @param location - Warehouse location (default: 'main')
 * @param userId - User performing the operation (optional, for audit)
 * @throws {InsufficientInventoryError} If insufficient inventory available
 * @throws {InventoryNotFoundError} If inventory record doesn't exist
 */
export async function allocateInventory(
  orderId: string,
  items: { skuId: string; quantity: number }[],
  location: string = 'main',
  userId?: string
): Promise<void> {
  const inventoryEvents: InventoryStockEvent[] = [];
  let orderStatusEvent: OrderStatusEvent | null = null;

  await prisma.$transaction(async (tx) => {
    // 1. Get order and verify it exists
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) {
      throw new InventoryError('Order not found', 'ORDER_NOT_FOUND', { orderId });
    }

    // 2. Check and allocate inventory for each item
    for (const item of items) {
      const inventory = await tx.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: order.tenantId,
            skuId: item.skuId,
            location,
          },
        },
      });

      if (!inventory) {
        throw new InventoryNotFoundError(item.skuId, location);
      }

      // Use canonical availability calculation
      // Note: reserved is currently 0 as allocation happens after reservation expires
      const available = getAvailableQty({
        onHand: inventory.onHand,
        allocated: inventory.allocated,
        reserved: 0,
      });

      if (available < item.quantity) {
        throw new InsufficientInventoryError(item.skuId, item.quantity, available);
      }

      // Update inventory with optimistic locking (using updatedAt)
      const updated = await tx.inventory.update({
        where: {
          id: inventory.id,
          updatedAt: inventory.updatedAt, // Optimistic locking
        },
        data: {
          allocated: {
            increment: item.quantity,
          },
        },
      });

      inventoryEvents.push({
        tenantId: order.tenantId,
        inventoryId: inventory.id,
        skuId: inventory.skuId,
        location: inventory.location,
        onHand: updated.onHand,
        allocated: updated.allocated,
        updatedAt: updated.updatedAt,
      });

      // 3. Create audit trail record
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          entityType: 'Inventory',
          entityId: inventory.id,
          action: InventoryTransactionType.ALLOCATION,
          changes: {
            type: InventoryTransactionType.ALLOCATION,
            orderId,
            skuId: item.skuId,
            quantity: item.quantity,
            location,
            before: {
              onHand: inventory.onHand,
              allocated: inventory.allocated,
            },
            after: {
              onHand: updated.onHand,
              allocated: updated.allocated,
            },
          },
          metadata: {
            available: getAvailableQty({
              onHand: inventory.onHand,
              allocated: inventory.allocated,
              reserved: 0,
            }),
            requested: item.quantity,
          },
        },
      });
    }

    // 4. Update order status to SUBMITTED
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'SUBMITTED',
        orderedAt: new Date(),
      },
    });

    orderStatusEvent = {
      tenantId: order.tenantId,
      orderId: order.id,
      customerId: order.customerId,
      salesRepId: order.salesRepId,
      previousStatus: order.status as OrderStatus,
      newStatus: 'SUBMITTED' as OrderStatus,
      updatedAt: updatedOrder.updatedAt,
    };

    // 5. Create order-level audit log
    await tx.auditLog.create({
      data: {
        tenantId: order.tenantId,
        userId,
        entityType: 'Order',
        entityId: orderId,
        action: 'INVENTORY_ALLOCATED',
        changes: {
          items: items.map((i) => ({
            skuId: i.skuId,
            quantity: i.quantity,
            location,
          })),
        },
        metadata: {
          previousStatus: order.status,
          newStatus: 'SUBMITTED',
        },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
  });

  await Promise.all(
    inventoryEvents.map((event) =>
      publishInventoryStockChanged({
        tenantId: event.tenantId,
        inventoryId: event.inventoryId,
        skuId: event.skuId,
        location: event.location,
        onHand: event.onHand,
        allocated: event.allocated,
        updatedAt: event.updatedAt,
      }),
    ),
  );

  if (orderStatusEvent) {
    await publishOrderStatusUpdated({
      tenantId: orderStatusEvent.tenantId,
      orderId: orderStatusEvent.orderId,
      customerId: orderStatusEvent.customerId,
      salesRepId: orderStatusEvent.salesRepId,
      previousStatus: orderStatusEvent.previousStatus,
      status: orderStatusEvent.newStatus,
      updatedAt: orderStatusEvent.updatedAt,
    });
  }
}

/**
 * Release allocated inventory back to available pool
 *
 * This is used when:
 * - An order is cancelled
 * - An allocation needs to be reversed
 * - A partial release is needed
 *
 * @param orderId - The order ID to release inventory for
 * @param location - Warehouse location (default: 'main')
 * @param userId - User performing the operation (optional, for audit)
 */
export async function releaseInventory(
  orderId: string,
  location: string = 'main',
  userId?: string
): Promise<void> {
  const inventoryEvents: InventoryStockEvent[] = [];
  let orderStatusEvent: OrderStatusEvent | null = null;

  await prisma.$transaction(async (tx) => {
    // 1. Get order with lines
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) {
      throw new InventoryError('Order not found', 'ORDER_NOT_FOUND', { orderId });
    }

    // 2. Release inventory for each line item
    for (const line of order.lines) {
      const inventory = await tx.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: order.tenantId,
            skuId: line.skuId,
            location,
          },
        },
      });

      if (!inventory) {
        // Log warning but continue (inventory might have been deleted)
        console.warn(`Inventory not found for SKU ${line.skuId} at ${location}`);
        continue;
      }

      // Update inventory
      const updated = await tx.inventory.update({
        where: {
          id: inventory.id,
          updatedAt: inventory.updatedAt,
        },
        data: {
          allocated: {
            decrement: line.quantity,
          },
        },
      });

      inventoryEvents.push({
        tenantId: order.tenantId,
        inventoryId: inventory.id,
        skuId: inventory.skuId,
        location: inventory.location,
        onHand: updated.onHand,
        allocated: updated.allocated,
        updatedAt: updated.updatedAt,
      });

      // Create audit trail
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          entityType: 'Inventory',
          entityId: inventory.id,
          action: InventoryTransactionType.RELEASE,
          changes: {
            type: InventoryTransactionType.RELEASE,
            orderId,
            skuId: line.skuId,
            quantity: line.quantity,
            location,
            before: {
              onHand: inventory.onHand,
              allocated: inventory.allocated,
            },
            after: {
              onHand: updated.onHand,
              allocated: updated.allocated,
            },
          },
        },
      });
    }

    // 3. Update order status to CANCELLED
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
      },
    });

    orderStatusEvent = {
      tenantId: order.tenantId,
      orderId: order.id,
      customerId: order.customerId,
      salesRepId: order.salesRepId,
      previousStatus: order.status as OrderStatus,
      newStatus: 'CANCELLED' as OrderStatus,
      updatedAt: updatedOrder.updatedAt,
    };

    // 4. Create order-level audit log
    await tx.auditLog.create({
      data: {
        tenantId: order.tenantId,
        userId,
        entityType: 'Order',
        entityId: orderId,
        action: 'INVENTORY_RELEASED',
        changes: {
          lineCount: order.lines.length,
          location,
        },
        metadata: {
          previousStatus: order.status,
          newStatus: 'CANCELLED',
        },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await Promise.all(
    inventoryEvents.map((event) =>
      publishInventoryStockChanged({
        tenantId: event.tenantId,
        inventoryId: event.inventoryId,
        skuId: event.skuId,
        location: event.location,
        onHand: event.onHand,
        allocated: event.allocated,
        updatedAt: event.updatedAt,
      }),
    ),
  );

  if (orderStatusEvent) {
    await publishOrderStatusUpdated({
      tenantId: orderStatusEvent.tenantId,
      orderId: orderStatusEvent.orderId,
      customerId: orderStatusEvent.customerId,
      salesRepId: orderStatusEvent.salesRepId,
      previousStatus: orderStatusEvent.previousStatus,
      status: orderStatusEvent.newStatus,
      updatedAt: orderStatusEvent.updatedAt,
    });
  }
}

/**
 * Mark inventory as shipped and deduct from on-hand quantity
 *
 * This operation:
 * 1. Deducts allocated quantity from both allocated and onHand
 * 2. Creates shipment audit trail
 * 3. Updates order status to FULFILLED
 *
 * @param orderId - The order ID to ship
 * @param trackingNumber - Shipment tracking number
 * @param location - Warehouse location (default: 'main')
 * @param userId - User performing the operation (optional, for audit)
 */
export async function shipInventory(
  orderId: string,
  trackingNumber: string,
  location: string = 'main',
  userId?: string
): Promise<void> {
  const inventoryEvents: InventoryStockEvent[] = [];
  let orderStatusEvent: OrderStatusEvent | null = null;

  await prisma.$transaction(async (tx) => {
    // 1. Get order with lines
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { lines: true },
    });

    if (!order) {
      throw new InventoryError('Order not found', 'ORDER_NOT_FOUND', { orderId });
    }

    if (order.status !== 'SUBMITTED') {
      throw new InventoryError(
        `Order ${orderId} cannot be shipped with status ${order.status}`,
        'INVALID_ORDER_STATUS',
        { orderId, status: order.status }
      );
    }

    // 2. Ship inventory for each line item
    for (const line of order.lines) {
      const inventory = await tx.inventory.findUnique({
        where: {
          tenantId_skuId_location: {
            tenantId: order.tenantId,
            skuId: line.skuId,
            location,
          },
        },
      });

      if (!inventory) {
        throw new InventoryNotFoundError(line.skuId, location);
      }

      // Verify allocation exists
      if (inventory.allocated < line.quantity) {
        throw new InventoryError(
          `Insufficient allocated inventory for SKU ${line.skuId}`,
          'INSUFFICIENT_ALLOCATION',
          {
            skuId: line.skuId,
            allocated: inventory.allocated,
            required: line.quantity,
          }
        );
      }

      // Update inventory: deduct from both allocated and onHand
      const updated = await tx.inventory.update({
        where: {
          id: inventory.id,
          updatedAt: inventory.updatedAt,
        },
        data: {
          onHand: {
            decrement: line.quantity,
          },
          allocated: {
            decrement: line.quantity,
          },
        },
      });

      inventoryEvents.push({
        tenantId: order.tenantId,
        inventoryId: inventory.id,
        skuId: inventory.skuId,
        location: inventory.location,
        onHand: updated.onHand,
        allocated: updated.allocated,
        updatedAt: updated.updatedAt,
      });

      // Create audit trail
      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          entityType: 'Inventory',
          entityId: inventory.id,
          action: InventoryTransactionType.SHIPMENT,
          changes: {
            type: InventoryTransactionType.SHIPMENT,
            orderId,
            skuId: line.skuId,
            quantity: line.quantity,
            location,
            trackingNumber,
            before: {
              onHand: inventory.onHand,
              allocated: inventory.allocated,
            },
            after: {
              onHand: updated.onHand,
              allocated: updated.allocated,
            },
          },
        },
      });
    }

    // 3. Update order status to FULFILLED
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'FULFILLED',
        fulfilledAt: new Date(),
      },
    });

    orderStatusEvent = {
      tenantId: order.tenantId,
      orderId: order.id,
      customerId: order.customerId,
      salesRepId: order.salesRepId,
      previousStatus: order.status as OrderStatus,
      newStatus: 'FULFILLED' as OrderStatus,
      updatedAt: updatedOrder.updatedAt,
    };

    // 4. Create order-level audit log
    await tx.auditLog.create({
      data: {
        tenantId: order.tenantId,
        userId,
        entityType: 'Order',
        entityId: orderId,
        action: 'INVENTORY_SHIPPED',
        changes: {
          trackingNumber,
          lineCount: order.lines.length,
          location,
        },
        metadata: {
          previousStatus: order.status,
          newStatus: 'FULFILLED',
        },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await Promise.all(
    inventoryEvents.map((event) =>
      publishInventoryStockChanged({
        tenantId: event.tenantId,
        inventoryId: event.inventoryId,
        skuId: event.skuId,
        location: event.location,
        onHand: event.onHand,
        allocated: event.allocated,
        updatedAt: event.updatedAt,
      }),
    ),
  );

  if (orderStatusEvent) {
    await publishOrderStatusUpdated({
      tenantId: orderStatusEvent.tenantId,
      orderId: orderStatusEvent.orderId,
      customerId: orderStatusEvent.customerId,
      salesRepId: orderStatusEvent.salesRepId,
      previousStatus: orderStatusEvent.previousStatus,
      status: orderStatusEvent.newStatus,
      updatedAt: orderStatusEvent.updatedAt,
    });
  }
}

/**
 * Adjust inventory quantity with reason tracking
 *
 * This is used for:
 * - Manual inventory corrections
 * - Damaged goods write-offs
 * - Found inventory
 * - Cycle count adjustments
 *
 * @param tenantId - Tenant ID
 * @param skuId - SKU ID to adjust
 * @param quantity - Quantity to adjust (positive to add, negative to subtract)
 * @param reason - Reason for adjustment
 * @param location - Warehouse location (default: 'main')
 * @param userId - User performing the operation (optional, for audit)
 */
export async function adjustInventory(
  tenantId: string,
  skuId: string,
  quantity: number,
  reason: string,
  location: string = 'main',
  userId?: string
): Promise<void> {
  let inventoryEvent: InventoryStockEvent | null = null;

  await prisma.$transaction(async (tx) => {
    // 1. Get or create inventory record
    let inventory = await tx.inventory.findUnique({
      where: {
        tenantId_skuId_location: {
          tenantId,
          skuId,
          location,
        },
      },
    });

    let isNew = false;
    if (!inventory) {
      // Create new inventory record
      inventory = await tx.inventory.create({
        data: {
          tenantId,
          skuId,
          location,
          onHand: Math.max(0, quantity),
          allocated: 0,
        },
      });
      isNew = true;
    }

    // 2. Update inventory
    const newOnHand = Math.max(0, inventory.onHand + quantity);
    const updated = await tx.inventory.update({
      where: {
        id: inventory.id,
        updatedAt: inventory.updatedAt,
      },
      data: {
        onHand: newOnHand,
      },
    });

    inventoryEvent = {
      tenantId,
      inventoryId: inventory.id,
      skuId,
      location: inventory.location,
      onHand: updated.onHand,
      allocated: updated.allocated,
      updatedAt: updated.updatedAt,
    };

    // 3. Create audit trail
    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        entityType: 'Inventory',
        entityId: inventory.id,
        action: InventoryTransactionType.ADJUSTMENT,
        changes: {
          type: InventoryTransactionType.ADJUSTMENT,
          skuId,
          quantity,
          reason,
          location,
          isNew,
          before: {
            onHand: inventory.onHand,
            allocated: inventory.allocated,
          },
          after: {
            onHand: updated.onHand,
            allocated: updated.allocated,
          },
        },
        metadata: {
          adjustment: quantity,
          finalQuantity: newOnHand,
        },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  if (inventoryEvent) {
    await publishInventoryStockChanged({
      tenantId: inventoryEvent.tenantId,
      inventoryId: inventoryEvent.inventoryId,
      skuId: inventoryEvent.skuId,
      location: inventoryEvent.location,
      onHand: inventoryEvent.onHand,
      allocated: inventoryEvent.allocated,
      updatedAt: inventoryEvent.updatedAt,
    });
  }
}

/**
 * Get inventory availability for a SKU
 *
 * @param tenantId - Tenant ID
 * @param skuId - SKU ID
 * @param location - Warehouse location (default: 'main')
 * @returns Available quantity (onHand - allocated)
 */
export async function getAvailableInventory(
  tenantId: string,
  skuId: string,
  location: string = 'main'
): Promise<number> {
  const inventory = await prisma.inventory.findUnique({
    where: {
      tenantId_skuId_location: {
        tenantId,
        skuId,
        location,
      },
    },
  });

  if (!inventory) {
    return 0;
  }

  // Use canonical availability calculation
  // Note: reserved is currently 0 as this field is managed separately in InventoryReservation table
  return getAvailableQty({
    onHand: inventory.onHand,
    allocated: inventory.allocated,
    reserved: 0, // Managed in separate InventoryReservation table
  });
}

/**
 * Check if order can be allocated (all items have sufficient inventory)
 *
 * @param orderId - Order ID to check
 * @param location - Warehouse location (default: 'main')
 * @returns Object with canAllocate flag and details
 */
export async function canAllocateOrder(
  orderId: string,
  location: string = 'main'
): Promise<{
  canAllocate: boolean;
  details: Array<{
    skuId: string;
    required: number;
    available: number;
    sufficient: boolean;
  }>;
}> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });

  if (!order) {
    throw new InventoryError('Order not found', 'ORDER_NOT_FOUND', { orderId });
  }

  const details = await Promise.all(
    order.lines.map(async (line) => {
      const available = await getAvailableInventory(
        order.tenantId,
        line.skuId,
        location
      );

      return {
        skuId: line.skuId,
        required: line.quantity,
        available,
        sufficient: available >= line.quantity,
      };
    })
  );

  return {
    canAllocate: details.every((d) => d.sufficient),
    details,
  };
}

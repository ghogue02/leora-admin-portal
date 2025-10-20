import { OrderStatus, Prisma, type PrismaClient } from "@prisma/client";

export class OrderFlowError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type InventorySnapshot = Array<{
  id: string;
  skuId: string;
  onHand: number;
  allocated: number;
  location: string;
}>;

export async function fetchInventorySnapshots(
  tx: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  skuIds: string[],
) {
  if (skuIds.length === 0) {
    return new Map<string, InventorySnapshot>();
  }

  const records = await tx.inventory.findMany({
    where: {
      tenantId,
      skuId: {
        in: Array.from(new Set(skuIds)),
      },
    },
    select: {
      id: true,
      skuId: true,
      onHand: true,
      allocated: true,
      location: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "asc",
    },
  });

  const map = new Map<string, InventorySnapshot>();
  for (const record of records) {
    const list = map.get(record.skuId) ?? [];
    list.push({
      id: record.id,
      skuId: record.skuId,
      onHand: record.onHand,
      allocated: record.allocated,
      location: record.location,
    });
    map.set(record.skuId, list);
  }

  return map;
}

type QuantityDescriptor = {
  skuId: string;
  quantity: number;
};

export function ensureInventoryAvailability(
  inventoryMap: Map<string, InventorySnapshot>,
  items: QuantityDescriptor[],
) {
  items.forEach((item) => {
    const inventories = inventoryMap.get(item.skuId) ?? [];
    const available = inventories.reduce((sum, inventory) => {
      const free = Math.max(0, inventory.onHand - inventory.allocated);
      return sum + free;
    }, 0);

    if (available < item.quantity) {
      throw new OrderFlowError(
        `Not enough inventory to fulfill SKU ${item.skuId}. Available ${available}, requested ${item.quantity}.`,
        409,
      );
    }
  });
}

export type AllocationDetail = {
  inventoryId: string;
  location: string;
  quantity: number;
};

export async function allocateInventory(
  tx: PrismaClient | Prisma.TransactionClient,
  inventoryMap: Map<string, InventorySnapshot>,
  items: QuantityDescriptor[],
) {
  const allocations = new Map<string, AllocationDetail[]>();

  for (const item of items) {
    const inventories = inventoryMap.get(item.skuId) ?? [];
    let remaining = item.quantity;

    for (const inventory of inventories) {
      if (remaining <= 0) break;
      const free = Math.max(0, inventory.onHand - inventory.allocated);
      if (free <= 0) continue;

      const allocate = Math.min(free, remaining);
      if (allocate > 0) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            allocated: {
              increment: allocate,
            },
          },
        });
        inventory.allocated += allocate;
        remaining -= allocate;

        const existing = allocations.get(item.skuId) ?? [];
        existing.push({
          inventoryId: inventory.id,
          location: inventory.location,
          quantity: allocate,
        });
        allocations.set(item.skuId, existing);
      }
    }

    if (remaining > 0) {
      throw new OrderFlowError(
        `Unable to allocate inventory for SKU ${item.skuId}. Remaining ${remaining}.`,
        409,
      );
    }
  }

  return allocations;
}

export async function releaseInventory(
  tx: PrismaClient | Prisma.TransactionClient,
  inventoryMap: Map<string, InventorySnapshot>,
  items: QuantityDescriptor[],
) {
  for (const item of items) {
    const inventories = inventoryMap.get(item.skuId) ?? [];
    let remaining = item.quantity;

    for (const inventory of inventories) {
      if (remaining <= 0) break;
      const allocated = Math.max(0, inventory.allocated);
      if (allocated <= 0) continue;

      const release = Math.min(allocated, remaining);
      if (release > 0) {
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            allocated: {
              decrement: release,
            },
          },
        });
        inventory.allocated -= release;
        remaining -= release;
      }
    }

    if (remaining > 0) {
      throw new OrderFlowError(
        `Unable to release inventory for SKU ${item.skuId}. Remaining ${remaining}.`,
        409,
      );
    }
  }
}

export async function releaseInventoryFromDetails(
  tx: PrismaClient | Prisma.TransactionClient,
  details: AllocationDetail[],
) {
  for (const detail of details) {
    await tx.inventory.update({
      where: { id: detail.inventoryId },
      data: {
        allocated: {
          decrement: detail.quantity,
        },
      },
    });
  }
}

type OrderLineWithAllocations = {
  skuId: string;
  quantity: number;
  appliedPricingRules: unknown;
};

export async function releaseAllocationsForOrder(
  tx: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  lines: OrderLineWithAllocations[],
) {
  const allocationDetails = lines.flatMap((line) => {
    const rules = line.appliedPricingRules as
      | {
          allocations?: AllocationDetail[];
        }
      | null
      | undefined;
    return rules?.allocations ?? [];
  });

  if (allocationDetails.length > 0) {
    await releaseInventoryFromDetails(tx, allocationDetails);
    return;
  }

  const quantityDescriptors = lines.map((line) => ({
    skuId: line.skuId,
    quantity: line.quantity,
  }));

  const inventoryMap = await fetchInventorySnapshots(
    tx,
    tenantId,
    quantityDescriptors.map((item) => item.skuId),
  );
  await releaseInventory(tx, inventoryMap, quantityDescriptors);
}

export async function recordPortalOrderActivity(
  tx: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  activityCode: string,
  orderId: string,
  portalUserId: string,
  subject: string,
  notes: string,
) {
  const activityType = await tx.activityType.findFirst({
    where: {
      tenantId,
      code: activityCode,
    },
    select: {
      id: true,
    },
  });

  if (!activityType) return;

  await tx.activity.create({
    data: {
      tenantId,
      activityTypeId: activityType.id,
      portalUserId,
      orderId,
      subject,
      occurredAt: new Date(),
      notes,
    },
  });
}

export function orderStatusAllowsCancellation(status: OrderStatus) {
  return status === OrderStatus.SUBMITTED || status === OrderStatus.PARTIALLY_FULFILLED;
}

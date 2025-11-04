import type { PrismaClient, Prisma } from "@prisma/client";
import { getAvailableQty, getAvailabilityStatus } from './availability';
import { getReorderPoint } from './reorder/get-reorder-point';

/**
 * Inventory reservation system to prevent overselling
 */

export type InventoryCheckResult = {
  available: boolean;
  currentStock: number;
  reserved: number;
  availableQuantity: number;
  warning?: string;
};

export type ReservationResult = {
  success: boolean;
  reservationId?: string;
  error?: string;
  availableQuantity?: number;
};

/**
 * Check if inventory is available for a SKU
 * Returns detailed availability information
 */
export async function checkInventoryAvailability(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  skuId: string,
  requestedQuantity: number,
): Promise<InventoryCheckResult> {
  // Get total on-hand inventory
  const inventoryRecords = await db.inventory.findMany({
    where: {
      tenantId,
      skuId,
      status: "AVAILABLE",
    },
    select: {
      onHand: true,
      allocated: true,
    },
  });

  const totalOnHand = inventoryRecords.reduce((sum, inv) => sum + inv.onHand, 0);
  const totalAllocated = inventoryRecords.reduce((sum, inv) => sum + inv.allocated, 0);

  // Get active reservations (gracefully handle if table doesn't exist)
  let totalReserved = 0;
  try {
    const activeReservations = await db.$queryRaw<Array<{ total: bigint }>>`
      SELECT COALESCE(SUM(quantity), 0)::bigint as total
      FROM "InventoryReservation"
      WHERE "tenantId" = ${tenantId}::uuid
        AND "skuId" = ${skuId}::uuid
        AND "status" = 'ACTIVE'
        AND ("expiresAt" IS NULL OR "expiresAt" > NOW())
    `;
    totalReserved = Number(activeReservations[0]?.total ?? 0);
  } catch (error) {
    // InventoryReservation table doesn't exist yet - that's ok, use 0
    console.warn('InventoryReservation table not found, using 0 for reservations');
    totalReserved = 0;
  }

  // Use canonical availability calculation
  const availableQuantity = getAvailableQty({
    onHand: totalOnHand,
    allocated: totalAllocated,
    reserved: totalReserved,
  });

  const result: InventoryCheckResult = {
    available: availableQuantity >= requestedQuantity,
    currentStock: totalOnHand,
    reserved: totalReserved,
    availableQuantity,
  };

  // Add warnings for low stock using data-driven reorder point
  // Phase 2 Improvement: Uses SKU-specific ROP instead of hardcoded 10
  const reorderPoint = await getReorderPoint(skuId, tenantId);

  if (availableQuantity === 0) {
    result.warning = "Out of stock";
  } else if (availableQuantity < reorderPoint) {
    result.warning = `Low stock: ${availableQuantity} units available (reorder point: ${reorderPoint})`;
  }

  return result;
}

/**
 * Reserve inventory for an order
 * This prevents other orders from claiming the same inventory
 */
export async function reserveInventory(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  orderId: string,
  items: Array<{ skuId: string; quantity: number }>,
): Promise<ReservationResult> {
  // Check availability for all items first
  for (const item of items) {
    const check = await checkInventoryAvailability(db, tenantId, item.skuId, item.quantity);

    if (!check.available) {
      return {
        success: false,
        error: `Insufficient inventory for SKU ${item.skuId}. Available: ${check.availableQuantity}, Requested: ${item.quantity}`,
        availableQuantity: check.availableQuantity,
      };
    }
  }

  // Create reservations for all items
  const reservations = await Promise.all(
    items.map((item) =>
      db.$executeRaw`
        INSERT INTO "InventoryReservation" (
          "tenantId", "skuId", "orderId", "quantity", "status", "reservedAt"
        ) VALUES (
          ${tenantId}::uuid, ${item.skuId}::uuid, ${orderId}::uuid, ${item.quantity}, 'ACTIVE', NOW()
        )
      `,
    ),
  );

  return {
    success: true,
    reservationId: orderId, // Using orderId as reference
  };
}

/**
 * Release inventory reservations when an order is cancelled
 */
export async function releaseInventoryReservation(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  orderId: string,
): Promise<void> {
  await db.$executeRaw`
    UPDATE "InventoryReservation"
    SET "status" = 'RELEASED', "releasedAt" = NOW()
    WHERE "tenantId" = ${tenantId}::uuid
      AND "orderId" = ${orderId}::uuid
      AND "status" = 'ACTIVE'
  `;
}

/**
 * Fulfill inventory reservation and update actual inventory
 */
export async function fulfillInventoryReservation(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  orderId: string,
): Promise<void> {
  // Get all reservations for this order
  const reservations = await db.$queryRaw<
    Array<{ skuId: string; quantity: number }>
  >`
    SELECT "skuId", quantity
    FROM "InventoryReservation"
    WHERE "tenantId" = ${tenantId}::uuid
      AND "orderId" = ${orderId}::uuid
      AND "status" = 'ACTIVE'
  `;

  // Update inventory for each SKU
  for (const reservation of reservations) {
    // Decrease on-hand inventory
    await db.$executeRaw`
      UPDATE "Inventory"
      SET "onHand" = "onHand" - ${reservation.quantity}
      WHERE "tenantId" = ${tenantId}::uuid
        AND "skuId" = ${reservation.skuId}::uuid
        AND "status" = 'AVAILABLE'
    `;
  }

  // Mark reservations as fulfilled
  await db.$executeRaw`
    UPDATE "InventoryReservation"
    SET "status" = 'FULFILLED', "releasedAt" = NOW()
    WHERE "tenantId" = ${tenantId}::uuid
      AND "orderId" = ${orderId}::uuid
      AND "status" = 'ACTIVE'
  `;
}

/**
 * Get inventory status for catalog display
 */
export async function getInventoryStatus(
  db: PrismaClient | Prisma.TransactionClient,
  tenantId: string,
  skuId: string,
): Promise<{
  onHand: number;
  available: number;
  reserved: number;
  lowStock: boolean;
  outOfStock: boolean;
}> {
  const check = await checkInventoryAvailability(db, tenantId, skuId, 0);

  return {
    onHand: check.currentStock,
    available: check.availableQuantity,
    reserved: check.reserved,
    lowStock: check.availableQuantity > 0 && check.availableQuantity < 10,
    outOfStock: check.availableQuantity <= 0,
  };
}

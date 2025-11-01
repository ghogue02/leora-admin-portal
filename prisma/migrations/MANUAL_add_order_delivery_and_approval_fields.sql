-- Manual Migration: Add Order Delivery and Approval Fields
-- Created: 2025-10-31
-- Run this when database connection is available

-- Step 1: Add new OrderStatus enum values
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY_TO_DELIVER';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PICKED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';

-- Step 2: Add new Order table columns
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "requestedDeliveryDate" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "warehouseLocation" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryTimeWindow" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvedById" UUID;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- Step 3: Add foreign key for approvedBy relationship
ALTER TABLE "Order" ADD CONSTRAINT "Order_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Add indexes for Order table
CREATE INDEX IF NOT EXISTS "Order_deliveryDate_idx" ON "Order"("deliveryDate");
CREATE INDEX IF NOT EXISTS "Order_requiresApproval_status_idx" ON "Order"("requiresApproval", "status");

-- Step 5: Add new Customer table columns
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "requiresPO" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "defaultWarehouseLocation" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "defaultDeliveryTimeWindow" TEXT;

-- Step 6: Add new SalesRep table column
ALTER TABLE "SalesRep" ADD COLUMN IF NOT EXISTS "deliveryDaysArray" TEXT[] DEFAULT '{}';

-- Step 7: Add index for InventoryReservation expiration
CREATE INDEX IF NOT EXISTS "InventoryReservation_expiresAt_idx" ON "InventoryReservation"("expiresAt");

-- Step 8: Add comments for documentation
COMMENT ON COLUMN "Order"."deliveryDate" IS 'Actual scheduled delivery date';
COMMENT ON COLUMN "Order"."requestedDeliveryDate" IS 'Originally requested date (if changed)';
COMMENT ON COLUMN "Order"."warehouseLocation" IS 'Warehouse: Baltimore, Warrenton, or main';
COMMENT ON COLUMN "Order"."deliveryTimeWindow" IS 'Time window: 8am-12pm, 12pm-5pm, anytime, after-5pm';
COMMENT ON COLUMN "Order"."requiresApproval" IS 'True if order has insufficient inventory and needs manager approval';
COMMENT ON COLUMN "Customer"."requiresPO" IS 'True if customer requires PO number on all orders';
COMMENT ON COLUMN "Customer"."defaultWarehouseLocation" IS 'Default warehouse for orders';
COMMENT ON COLUMN "Customer"."defaultDeliveryTimeWindow" IS 'Default delivery time window';
COMMENT ON COLUMN "SalesRep"."deliveryDaysArray" IS 'Array of delivery days: Monday, Wednesday, Friday, etc.';

-- Migration complete
SELECT 'Migration completed successfully' AS status;
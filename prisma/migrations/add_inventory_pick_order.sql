-- Migration: Add pickOrder field to Inventory table
-- Purpose: Enable automatic warehouse picking order calculation
-- Date: 2025-10-25
-- Related: WAREHOUSE_PICKORDER.md, WAREHOUSE_IMPLEMENTATION_SUMMARY.md

-- Add pickOrder column (nullable for backwards compatibility)
ALTER TABLE "Inventory" ADD COLUMN IF NOT EXISTS "pickOrder" INTEGER;

-- Create index for efficient sorting (essential for performance)
CREATE INDEX IF NOT EXISTS "Inventory_pickOrder_idx" ON "Inventory"("pickOrder");

-- Optional: Add index for location-based queries
CREATE INDEX IF NOT EXISTS "Inventory_location_idx" ON "Inventory"("location");

-- Add comment to column for documentation
COMMENT ON COLUMN "Inventory"."pickOrder" IS 'Auto-calculated warehouse picking order: (aisle × 10000) + (row × 100) + shelf';

-- Note: After running this migration, execute the recalculation script:
-- npm run tsx scripts/recalculate-pick-orders.ts

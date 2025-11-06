-- Capture order line usage classifications (BTG, Wine Club, Supplier Event, etc.)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'OrderUsageType'
    ) THEN
        CREATE TYPE "OrderUsageType" AS ENUM ('BTG', 'WINE_CLUB', 'SUPPLIER_EVENT', 'OTHER_ONE_OFF');
    END IF;
END $$;

ALTER TABLE "OrderLine"
    ADD COLUMN IF NOT EXISTS "usageType" "OrderUsageType";

-- Index to support reporting pivots by usage type
CREATE INDEX IF NOT EXISTS "idx_orderline_usage_type"
    ON "OrderLine"("tenantId", "usageType");

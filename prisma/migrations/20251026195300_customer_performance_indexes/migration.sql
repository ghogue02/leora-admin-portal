-- Customer Detail Page Performance Optimization
-- This migration adds critical indexes to improve customer detail page load times from 10s+ to <2s

-- Index for Order queries filtered by customer and tenant
CREATE INDEX IF NOT EXISTS "idx_order_customer_tenant" ON "Order"("customerId", "tenantId", "status", "deliveredAt" DESC);

-- Index for OrderLine aggregations (top products by revenue/volume)
CREATE INDEX IF NOT EXISTS "idx_orderline_customer_sku" ON "OrderLine"("skuId", "tenantId");

-- Index for Activity timeline queries
CREATE INDEX IF NOT EXISTS "idx_activity_customer_time" ON "Activity"("customerId", "tenantId", "occurredAt" DESC);

-- Index for Sample history queries
CREATE INDEX IF NOT EXISTS "idx_sample_customer_time" ON "SampleUsage"("customerId", "tenantId", "tastedAt" DESC);

-- Index for Invoice queries (account holds/balances)
CREATE INDEX IF NOT EXISTS "idx_invoice_customer_status" ON "Invoice"("customerId", "tenantId", "status", "dueDate" ASC);

-- Index for TopProduct queries (company-wide top products)
CREATE INDEX IF NOT EXISTS "idx_topproduct_calc_rank" ON "TopProduct"("tenantId", "calculatedAt" DESC, "rankingType", "rank");

-- Composite index for OrderLine filtering in top products calculation
CREATE INDEX IF NOT EXISTS "idx_orderline_delivered_sample" ON "OrderLine"("tenantId", "isSample");

-- Add index for Order.deliveredAt if not exists (for date range filtering)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_order_delivered_tenant'
    ) THEN
        CREATE INDEX "idx_order_delivered_tenant" ON "Order"("deliveredAt" DESC, "tenantId");
    END IF;
END $$;

-- Optimize queries for suggestion generation

-- Index for finding customers by last order date
CREATE INDEX IF NOT EXISTS "Customer_lastOrderDate_idx"
  ON "Customer"("tenantId", "lastOrderDate" DESC);

-- Index for finding customers by territory and last order
CREATE INDEX IF NOT EXISTS "Customer_territory_lastOrder_idx"
  ON "Customer"("tenantId", "territory", "lastOrderDate" DESC);

-- Index for customer order lookups
CREATE INDEX IF NOT EXISTS "Order_customerId_orderedAt_idx"
  ON "Order"("customerId", "orderedAt" DESC);

-- Index for established revenue filtering
CREATE INDEX IF NOT EXISTS "Customer_establishedRevenue_idx"
  ON "Customer"("tenantId", "establishedRevenue" DESC)
  WHERE "establishedRevenue" IS NOT NULL;

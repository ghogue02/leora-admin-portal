-- Phase 2.5: SKU Demand Statistics Table
-- Stores calculated demand patterns for data-driven reorder points

CREATE TABLE IF NOT EXISTS "SKUDemandStats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "skuId" UUID NOT NULL,

  -- Demand statistics
  "meanDailyDemand" DECIMAL(10, 4) NOT NULL DEFAULT 0,
  "sdDailyDemand" DECIMAL(10, 4) NOT NULL DEFAULT 0,
  "minDailyDemand" INT NOT NULL DEFAULT 0,
  "maxDailyDemand" INT NOT NULL DEFAULT 0,
  "totalDemand" INT NOT NULL DEFAULT 0,
  "daysWithDemand" INT NOT NULL DEFAULT 0,
  "daysInPeriod" INT NOT NULL DEFAULT 90,

  -- Lead time statistics
  "meanLeadDays" INT NOT NULL DEFAULT 7,
  "sdLeadDays" INT NOT NULL DEFAULT 2,

  -- Calculated reorder point
  "reorderPoint" INT NOT NULL,
  "serviceLevelZ" DECIMAL(4, 2) NOT NULL DEFAULT 1.64, -- 95% service level

  -- Inventory targets
  "targetDaysOfSupply" INT NOT NULL DEFAULT 14,
  "eoq" INT, -- Economic Order Quantity (optional)
  "maxCapacity" INT, -- Maximum shelf capacity (optional)

  -- Demand classification
  "demandPattern" TEXT, -- 'fast', 'medium', 'slow', 'intermittent'
  "intermittencyRate" DECIMAL(5, 2), -- % of days with zero demand
  "coefficientOfVariation" DECIMAL(6, 4), -- CV = σ/μ

  -- Metadata
  "lastCalculated" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lookbackDays" INT NOT NULL DEFAULT 90,

  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Foreign keys
  CONSTRAINT "SKUDemandStats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "SKUDemandStats_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SKU"("id") ON DELETE CASCADE,

  -- Unique constraint
  CONSTRAINT "SKUDemandStats_tenantId_skuId_key" UNIQUE ("tenantId", "skuId")
);

-- Indexes for efficient queries
CREATE INDEX "SKUDemandStats_tenantId_idx" ON "SKUDemandStats"("tenantId");
CREATE INDEX "SKUDemandStats_skuId_idx" ON "SKUDemandStats"("skuId");
CREATE INDEX "SKUDemandStats_reorderPoint_idx" ON "SKUDemandStats"("tenantId", "reorderPoint");
CREATE INDEX "SKUDemandStats_lastCalculated_idx" ON "SKUDemandStats"("lastCalculated");

-- Comment
COMMENT ON TABLE "SKUDemandStats" IS 'Statistical demand patterns for data-driven reorder points (Phase 2.5)';

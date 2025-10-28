-- Create TerritoryBlock table
CREATE TABLE IF NOT EXISTS "TerritoryBlock" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "territory" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT TRUE,
    "startTime" TEXT,
    "endTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TerritoryBlock_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "TerritoryBlock_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE
);

-- Prevent duplicate territory blocks for the same day
CREATE UNIQUE INDEX IF NOT EXISTS "TerritoryBlock_unique_day"
    ON "TerritoryBlock"("tenantId", "callPlanId", "dayOfWeek", "territory");

CREATE INDEX IF NOT EXISTS "TerritoryBlock_tenant_idx" ON "TerritoryBlock"("tenantId");
CREATE INDEX IF NOT EXISTS "TerritoryBlock_callPlan_day_idx" ON "TerritoryBlock"("callPlanId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "TerritoryBlock_territory_idx" ON "TerritoryBlock"("territory");

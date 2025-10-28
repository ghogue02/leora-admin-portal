-- Create CallPlanSchedule table
CREATE TABLE IF NOT EXISTS "CallPlanSchedule" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "callPlanId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallPlanSchedule_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "CallPlanSchedule_callPlan_fkey" FOREIGN KEY ("callPlanId") REFERENCES "CallPlan"("id") ON DELETE CASCADE,
    CONSTRAINT "CallPlanSchedule_customer_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

-- Indexes to support schedule lookups
CREATE INDEX IF NOT EXISTS "CallPlanSchedule_tenant_idx" ON "CallPlanSchedule"("tenantId");
CREATE INDEX IF NOT EXISTS "CallPlanSchedule_callPlanDate_idx" ON "CallPlanSchedule"("callPlanId", "scheduledDate");
CREATE INDEX IF NOT EXISTS "CallPlanSchedule_customer_idx" ON "CallPlanSchedule"("customerId");

-- Prevent duplicate schedule entries for the same account and slot
CREATE UNIQUE INDEX IF NOT EXISTS "CallPlanSchedule_unique_slot"
    ON "CallPlanSchedule"("tenantId", "callPlanId", "customerId", "scheduledDate", "scheduledTime");

-- Create HealthThreshold table for advanced threshold configuration
CREATE TABLE "HealthThreshold" (
    "id" UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "tenantId" UUID NOT NULL,
    "accountType" "AccountType",
    "accountPriority" "AccountPriority",
    "dormantDays" INTEGER NOT NULL DEFAULT 45,
    "gracePeriodPercent" DECIMAL(3,2) NOT NULL DEFAULT 0.30,
    "revenueDeclinePercent" DECIMAL(3,2) NOT NULL DEFAULT 0.15,
    "minGraceDays" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthThreshold_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint
CREATE UNIQUE INDEX "HealthThreshold_tenantId_accountType_accountPriority_key" ON "HealthThreshold"("tenantId", "accountType", "accountPriority");

-- Add indexes
CREATE INDEX "HealthThreshold_tenantId_idx" ON "HealthThreshold"("tenantId");
CREATE INDEX "HealthThreshold_accountType_idx" ON "HealthThreshold"("accountType");
CREATE INDEX "HealthThreshold_accountPriority_idx" ON "HealthThreshold"("accountPriority");

-- Add foreign key constraint
ALTER TABLE "HealthThreshold" ADD CONSTRAINT "HealthThreshold_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

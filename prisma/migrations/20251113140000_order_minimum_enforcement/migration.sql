-- Add tenant-level minimum order configuration
ALTER TABLE "TenantSettings"
ADD COLUMN "minimumOrderAmount" DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
ADD COLUMN "minimumOrderEnforcementEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Add customer-level overrides + auditing
ALTER TABLE "Customer"
ADD COLUMN "minimumOrderOverride" DECIMAL(10, 2),
ADD COLUMN "minimumOrderOverrideNotes" TEXT,
ADD COLUMN "minimumOrderOverrideUpdatedAt" TIMESTAMP(3),
ADD COLUMN "minimumOrderOverrideUpdatedBy" TEXT;

-- Persist applied threshold + approval metadata on orders
ALTER TABLE "Order"
ADD COLUMN "minimumOrderThreshold" DECIMAL(10, 2),
ADD COLUMN "minimumOrderViolation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "approvalReasons" JSONB;

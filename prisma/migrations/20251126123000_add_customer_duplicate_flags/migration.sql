-- Create enum type
CREATE TYPE "CustomerDuplicateStatus" AS ENUM ('OPEN', 'RESOLVED');

-- Create table for customer duplicate flags
CREATE TABLE "CustomerDuplicateFlag" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "duplicateOfCustomerId" UUID,
  "flaggedByPortalUserId" UUID,
  "status" "CustomerDuplicateStatus" NOT NULL DEFAULT 'OPEN',
  "notes" TEXT,
  "resolvedAt" TIMESTAMP(6),
  "resolvedBy" UUID,
  "createdAt" TIMESTAMP(6) NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT now()
);

-- Indexes to support lookups
CREATE INDEX "CustomerDuplicateFlag_tenantId_idx" ON "CustomerDuplicateFlag" ("tenantId");
CREATE INDEX "CustomerDuplicateFlag_customerId_idx" ON "CustomerDuplicateFlag" ("customerId");
CREATE INDEX "CustomerDuplicateFlag_status_idx" ON "CustomerDuplicateFlag" ("status");
CREATE INDEX "CustomerDuplicateFlag_duplicateOfCustomerId_idx" ON "CustomerDuplicateFlag" ("duplicateOfCustomerId");
CREATE INDEX "CustomerDuplicateFlag_flaggedByPortalUserId_idx" ON "CustomerDuplicateFlag" ("flaggedByPortalUserId");

-- Foreign key constraints
ALTER TABLE "CustomerDuplicateFlag"
  ADD CONSTRAINT "CustomerDuplicateFlag_tenant_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "CustomerDuplicateFlag"
  ADD CONSTRAINT "CustomerDuplicateFlag_customer_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "CustomerDuplicateFlag"
  ADD CONSTRAINT "CustomerDuplicateFlag_duplicate_of_fkey"
    FOREIGN KEY ("duplicateOfCustomerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CustomerDuplicateFlag"
  ADD CONSTRAINT "CustomerDuplicateFlag_resolved_by_fkey"
    FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE "CustomerDuplicateFlag"
  ADD CONSTRAINT "CustomerDuplicateFlag_flagged_by_portal_user_fkey"
    FOREIGN KEY ("flaggedByPortalUserId") REFERENCES "PortalUser"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

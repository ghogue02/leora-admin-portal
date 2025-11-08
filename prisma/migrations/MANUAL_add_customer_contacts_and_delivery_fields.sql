-- Adds richer delivery preference fields and a structured contacts table

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "deliveryInstructions" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryWindows" JSONB,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT;

CREATE TABLE IF NOT EXISTS "CustomerContact" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "fullName" TEXT NOT NULL,
  "role" TEXT,
  "phone" TEXT,
  "mobile" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "businessCardUrl" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "CustomerContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CustomerContact_tenant_customer_idx"
  ON "CustomerContact" ("tenantId", "customerId");

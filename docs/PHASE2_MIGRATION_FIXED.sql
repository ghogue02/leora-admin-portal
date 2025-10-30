-- ============================================================================
-- PHASE 2 MIGRATION - CARLA SYSTEM (FIXED)
-- Database: Well Crafted (zqezunzlyjkseugujkrl)
-- Date: October 25, 2025
-- FIX: Added proper enum casting for AccountPriority and CallPlanStatus
-- ============================================================================

-- Run this entire script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

BEGIN;

-- ============================================================================
-- STEP 1: CREATE NEW ENUMS
-- ============================================================================

-- AccountPriority enum for customer importance
CREATE TYPE "AccountPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CallPlanStatus enum for weekly plan lifecycle
CREATE TYPE "CallPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- ContactOutcome enum for X/Y/Blank tracking
CREATE TYPE "ContactOutcome" AS ENUM ('NOT_ATTEMPTED', 'NO_CONTACT', 'CONTACTED', 'VISITED');

-- ============================================================================
-- STEP 2: EXTEND CUSTOMER TABLE
-- ============================================================================

-- Add priority field for call planning
ALTER TABLE "Customer"
ADD COLUMN "accountPriority" "AccountPriority";

-- Add territory field for geographic filtering
ALTER TABLE "Customer"
ADD COLUMN "territory" TEXT;

-- Create indexes for filtering and sorting
CREATE INDEX "Customer_accountPriority_idx" ON "Customer"("accountPriority");
CREATE INDEX "Customer_territory_idx" ON "Customer"("territory");

-- ============================================================================
-- STEP 3: EXTEND CALLPLAN TABLE
-- ============================================================================

-- Add week tracking fields
ALTER TABLE "CallPlan"
ADD COLUMN "weekNumber" INTEGER,
ADD COLUMN "year" INTEGER,
ADD COLUMN "status" "CallPlanStatus",
ADD COLUMN "targetCount" INTEGER;

-- Create indexes for weekly plan queries
CREATE INDEX "CallPlan_week_idx" ON "CallPlan"("tenantId", "weekNumber", "year");
CREATE INDEX "CallPlan_status_idx" ON "CallPlan"("status");

-- ============================================================================
-- STEP 4: CREATE CALLPLANACCOUNT TABLE (Join Table)
-- ============================================================================

CREATE TABLE "CallPlanAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "callPlanId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "objective" TEXT,
  "addedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactOutcome" "ContactOutcome" NOT NULL DEFAULT 'NOT_ATTEMPTED',
  "contactedAt" TIMESTAMP,
  "notes" TEXT,

  CONSTRAINT "CallPlanAccount_callPlan_fkey" FOREIGN KEY ("callPlanId")
    REFERENCES "CallPlan"("id") ON DELETE CASCADE,
  CONSTRAINT "CallPlanAccount_customer_fkey" FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id") ON DELETE CASCADE,
  CONSTRAINT "CallPlanAccount_tenant_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Unique constraint: customer can only be in call plan once
CREATE UNIQUE INDEX "CallPlanAccount_callPlanId_customerId_key"
  ON "CallPlanAccount"("callPlanId", "customerId");

-- Performance indexes
CREATE INDEX "CallPlanAccount_tenantId_idx" ON "CallPlanAccount"("tenantId");
CREATE INDEX "CallPlanAccount_callPlanId_idx" ON "CallPlanAccount"("callPlanId");
CREATE INDEX "CallPlanAccount_customerId_idx" ON "CallPlanAccount"("customerId");
CREATE INDEX "CallPlanAccount_contactOutcome_idx" ON "CallPlanAccount"("contactOutcome");

-- ============================================================================
-- STEP 5: CREATE CALLPLANACTIVITY TABLE (Activity Tracking)
-- ============================================================================

CREATE TABLE "CallPlanActivity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "callPlanId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "activityTypeId" UUID NOT NULL,
  "occurredAt" TIMESTAMP NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CallPlanActivity_callPlan_fkey" FOREIGN KEY ("callPlanId")
    REFERENCES "CallPlan"("id") ON DELETE CASCADE,
  CONSTRAINT "CallPlanActivity_customer_fkey" FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id") ON DELETE CASCADE,
  CONSTRAINT "CallPlanActivity_activityType_fkey" FOREIGN KEY ("activityTypeId")
    REFERENCES "ActivityType"("id") ON DELETE CASCADE,
  CONSTRAINT "CallPlanActivity_tenant_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX "CallPlanActivity_tenantId_idx" ON "CallPlanActivity"("tenantId");
CREATE INDEX "CallPlanActivity_callPlanId_idx" ON "CallPlanActivity"("callPlanId");
CREATE INDEX "CallPlanActivity_customerId_idx" ON "CallPlanActivity"("customerId");

-- ============================================================================
-- STEP 6: CREATE CALENDARSYNC TABLE (OAuth Token Storage)
-- ============================================================================

CREATE TABLE "CalendarSync" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "provider" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "refreshToken" TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "calendarId" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CalendarSync_tenant_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id") ON DELETE CASCADE,
  CONSTRAINT "CalendarSync_user_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE CASCADE
);

-- Unique constraint: one provider per user
CREATE UNIQUE INDEX "CalendarSync_tenantId_userId_provider_key"
  ON "CalendarSync"("tenantId", "userId", "provider");

-- Performance indexes
CREATE INDEX "CalendarSync_tenantId_userId_idx" ON "CalendarSync"("tenantId", "userId");

-- ============================================================================
-- STEP 7: EXTEND CALENDAREVENT TABLE
-- ============================================================================

-- Add fields for call plan integration and external sync
ALTER TABLE "CalendarEvent"
ADD COLUMN "callPlanAccountId" UUID,
ADD COLUMN "externalEventId" TEXT,
ADD COLUMN "syncedAt" TIMESTAMP;

-- Add foreign key to CallPlanAccount
ALTER TABLE "CalendarEvent"
ADD CONSTRAINT "CalendarEvent_callPlanAccount_fkey"
  FOREIGN KEY ("callPlanAccountId")
  REFERENCES "CallPlanAccount"("id") ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX "CalendarEvent_callPlanAccountId_idx" ON "CalendarEvent"("callPlanAccountId");
CREATE INDEX "CalendarEvent_externalEventId_idx" ON "CalendarEvent"("externalEventId");

-- ============================================================================
-- STEP 8: SET DEFAULT VALUES (WITH PROPER CASTING)
-- ============================================================================

-- Update existing customers with default accountPriority based on accountType
UPDATE "Customer"
SET "accountPriority" = (CASE
  WHEN "accountType" = 'ACTIVE' THEN 'HIGH'
  WHEN "accountType" = 'TARGET' THEN 'MEDIUM'
  WHEN "accountType" = 'PROSPECT' THEN 'LOW'
  ELSE 'MEDIUM'
END)::"AccountPriority"
WHERE "accountPriority" IS NULL;

-- Update any existing call plans to DRAFT status if not already set
UPDATE "CallPlan"
SET "status" = 'DRAFT'::"CallPlanStatus"
WHERE "status" IS NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to confirm success)
-- ============================================================================

-- 1. Verify enums created
SELECT unnest(enum_range(NULL::"AccountPriority")) as priority;
SELECT unnest(enum_range(NULL::"CallPlanStatus")) as status;
SELECT unnest(enum_range(NULL::"ContactOutcome")) as outcome;

-- 2. Verify Customer columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name IN ('accountPriority', 'territory');

-- 3. Verify CallPlan columns added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CallPlan'
  AND column_name IN ('weekNumber', 'year', 'status', 'targetCount');

-- 4. Verify new tables created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('CallPlanAccount', 'CallPlanActivity', 'CalendarSync')
ORDER BY table_name;

-- 5. Verify accountPriority distribution
SELECT "accountPriority", COUNT(*) as count
FROM "Customer"
WHERE "accountPriority" IS NOT NULL
GROUP BY "accountPriority"
ORDER BY count DESC;

-- Expected: HIGH (most), MEDIUM, LOW

-- ============================================================================
-- SUCCESS! Migration Complete
-- Next: npx prisma db pull && npx prisma generate
-- ============================================================================

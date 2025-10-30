-- ============================================================================
-- CARLA SYSTEM - PHASE 2.1 DATABASE MIGRATION
-- ============================================================================
-- Migration: add_carla_system
-- Created: 2025-10-25
-- Description: Add CARLA (Call Planning and Account Management) System schema
--
-- EXECUTION INSTRUCTIONS:
-- 1. Open Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Execute this entire script in a single transaction
-- 4. Verify all changes using the verification queries at the end
-- 5. Run Prisma introspection: npx prisma db pull
-- 6. Generate Prisma Client: npx prisma generate
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

-- Account Priority for call planning and territory management
CREATE TYPE "AccountPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

-- Call Plan Status tracking through lifecycle
CREATE TYPE "CallPlanStatus" AS ENUM (
  'DRAFT',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED'
);

-- Contact Outcome tracking for weekly execution
-- Maps to X/Y/Blank checkbox system in UI
CREATE TYPE "ContactOutcome" AS ENUM (
  'NOT_ATTEMPTED',  -- Default state, not yet tried
  'NO_CONTACT',     -- Blank - Attempted but couldn't reach
  'CONTACTED',      -- X - Reached via email, phone, or text
  'VISITED'         -- Y - In-person visit completed
);

-- ============================================================================
-- STEP 2: EXTEND EXISTING TABLES
-- ============================================================================

-- Extend Customer table with CARLA fields
ALTER TABLE "Customer"
  ADD COLUMN "accountPriority" "AccountPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "territory" TEXT;

-- Create index for territory filtering
CREATE INDEX "Customer_territory_idx" ON "Customer"("territory");
CREATE INDEX "Customer_accountPriority_idx" ON "Customer"("accountPriority");

-- Add comment for documentation
COMMENT ON COLUMN "Customer"."accountPriority" IS 'Priority level for call planning and account management';
COMMENT ON COLUMN "Customer"."territory" IS 'Sales territory for filtering and assignment';

-- Extend CallPlan table with CARLA fields
ALTER TABLE "CallPlan"
  ADD COLUMN "weekNumber" INTEGER,
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "status" "CallPlanStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "targetCount" INTEGER;

-- Create composite index for week/year lookups
CREATE INDEX "CallPlan_year_weekNumber_idx" ON "CallPlan"("year", "weekNumber");
CREATE INDEX "CallPlan_status_idx" ON "CallPlan"("status");

-- Add comments for documentation
COMMENT ON COLUMN "CallPlan"."weekNumber" IS 'Week number of year (1-52)';
COMMENT ON COLUMN "CallPlan"."year" IS 'Year for the call plan';
COMMENT ON COLUMN "CallPlan"."status" IS 'Current status of the call plan';
COMMENT ON COLUMN "CallPlan"."targetCount" IS 'Target number of accounts to contact this week';

-- ============================================================================
-- STEP 3: CREATE NEW TABLES
-- ============================================================================

-- CallPlanAccount - Join table linking accounts to call plans
-- Tracks which accounts are included in each weekly call plan
CREATE TABLE "CallPlanAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "callPlanId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "objective" TEXT,
  "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactOutcome" "ContactOutcome" NOT NULL DEFAULT 'NOT_ATTEMPTED',
  "contactedAt" TIMESTAMP(3),
  "notes" TEXT,

  -- Foreign key constraints
  CONSTRAINT "CallPlanAccount_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "CallPlanAccount_callPlanId_fkey"
    FOREIGN KEY ("callPlanId")
    REFERENCES "CallPlan"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "CallPlanAccount_customerId_fkey"
    FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  -- Unique constraint: one entry per account per call plan
  CONSTRAINT "CallPlanAccount_callPlanId_customerId_key"
    UNIQUE ("callPlanId", "customerId")
);

-- Create indexes for efficient querying
CREATE INDEX "CallPlanAccount_tenantId_idx" ON "CallPlanAccount"("tenantId");
CREATE INDEX "CallPlanAccount_callPlanId_idx" ON "CallPlanAccount"("callPlanId");
CREATE INDEX "CallPlanAccount_customerId_idx" ON "CallPlanAccount"("customerId");
CREATE INDEX "CallPlanAccount_contactOutcome_idx" ON "CallPlanAccount"("contactOutcome");
CREATE INDEX "CallPlanAccount_contactedAt_idx" ON "CallPlanAccount"("contactedAt");

-- Add table comment
COMMENT ON TABLE "CallPlanAccount" IS 'Join table linking customers to call plans with contact tracking';
COMMENT ON COLUMN "CallPlanAccount"."objective" IS '3-5 word objective for this account this week';
COMMENT ON COLUMN "CallPlanAccount"."contactOutcome" IS 'Contact status: NOT_ATTEMPTED, NO_CONTACT, CONTACTED, or VISITED';

-- CallPlanActivity - Track execution of call plan activities
-- Links activities to specific call plans for reporting
CREATE TABLE "CallPlanActivity" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "callPlanId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "activityTypeId" UUID NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints
  CONSTRAINT "CallPlanActivity_tenantId_fkey"
    FOREIGN KEY ("tenantId")
    REFERENCES "Tenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "CallPlanActivity_callPlanId_fkey"
    FOREIGN KEY ("callPlanId")
    REFERENCES "CallPlan"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "CallPlanActivity_customerId_fkey"
    FOREIGN KEY ("customerId")
    REFERENCES "Customer"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT "CallPlanActivity_activityTypeId_fkey"
    FOREIGN KEY ("activityTypeId")
    REFERENCES "ActivityType"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

-- Create indexes for efficient querying
CREATE INDEX "CallPlanActivity_tenantId_idx" ON "CallPlanActivity"("tenantId");
CREATE INDEX "CallPlanActivity_callPlanId_idx" ON "CallPlanActivity"("callPlanId");
CREATE INDEX "CallPlanActivity_customerId_idx" ON "CallPlanActivity"("customerId");
CREATE INDEX "CallPlanActivity_activityTypeId_idx" ON "CallPlanActivity"("activityTypeId");
CREATE INDEX "CallPlanActivity_occurredAt_idx" ON "CallPlanActivity"("occurredAt");

-- Add table comment
COMMENT ON TABLE "CallPlanActivity" IS 'Tracks activities performed as part of call plan execution';
COMMENT ON COLUMN "CallPlanActivity"."occurredAt" IS 'When the activity occurred';

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE "CallPlanAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CallPlanActivity" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for CallPlanAccount
-- Users can only access call plan accounts within their tenant
CREATE POLICY "CallPlanAccount tenant isolation"
  ON "CallPlanAccount"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);

-- Create RLS policies for CallPlanActivity
-- Users can only access call plan activities within their tenant
CREATE POLICY "CallPlanActivity tenant isolation"
  ON "CallPlanActivity"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id')::uuid);

-- ============================================================================
-- STEP 5: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get current week number
CREATE OR REPLACE FUNCTION get_current_week_number()
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_current_week_number() IS 'Returns the current ISO week number (1-52)';

-- Function to get week start date from week number and year
CREATE OR REPLACE FUNCTION get_week_start_date(p_year INTEGER, p_week INTEGER)
RETURNS DATE AS $$
BEGIN
  RETURN (DATE_TRUNC('year', make_date(p_year, 1, 1))
    + ((p_week - 1) * INTERVAL '7 days'))::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_week_start_date(INTEGER, INTEGER) IS 'Returns the start date (Monday) for a given week number and year';

-- Function to auto-categorize accounts based on last order date
CREATE OR REPLACE FUNCTION categorize_account_type(p_last_order_date TIMESTAMP)
RETURNS "AccountType" AS $$
BEGIN
  IF p_last_order_date IS NULL THEN
    RETURN 'PROSPECT';
  ELSIF p_last_order_date >= CURRENT_DATE - INTERVAL '6 months' THEN
    RETURN 'ACTIVE';
  ELSIF p_last_order_date >= CURRENT_DATE - INTERVAL '12 months' THEN
    RETURN 'TARGET';
  ELSE
    RETURN 'PROSPECT';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION categorize_account_type(TIMESTAMP) IS 'Auto-categorizes account type based on last order date: ACTIVE (<6mo), TARGET (6-12mo), PROSPECT (>12mo or never)';

-- ============================================================================
-- STEP 6: CREATE VIEWS FOR REPORTING
-- ============================================================================

-- View: Call Plan Summary
-- Provides aggregated statistics for each call plan
CREATE OR REPLACE VIEW "CallPlanSummary" AS
SELECT
  cp.id AS "callPlanId",
  cp."tenantId",
  cp.name,
  cp.year,
  cp."weekNumber",
  cp.status,
  cp."targetCount",
  COUNT(cpa.id) AS "totalAccounts",
  COUNT(CASE WHEN cpa."contactOutcome" = 'CONTACTED' THEN 1 END) AS "contactedCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'VISITED' THEN 1 END) AS "visitedCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'NO_CONTACT' THEN 1 END) AS "noContactCount",
  COUNT(CASE WHEN cpa."contactOutcome" = 'NOT_ATTEMPTED' THEN 1 END) AS "notAttemptedCount",
  ROUND(
    (COUNT(CASE WHEN cpa."contactOutcome" IN ('CONTACTED', 'VISITED') THEN 1 END)::NUMERIC /
     NULLIF(COUNT(cpa.id), 0) * 100),
    1
  ) AS "completionPercentage"
FROM "CallPlan" cp
LEFT JOIN "CallPlanAccount" cpa ON cpa."callPlanId" = cp.id
GROUP BY cp.id, cp."tenantId", cp.name, cp.year, cp."weekNumber", cp.status, cp."targetCount";

COMMENT ON VIEW "CallPlanSummary" IS 'Aggregated statistics for call plans including contact counts and completion percentage';

-- View: Account Call Plan History
-- Shows all call plan participations for each account
CREATE OR REPLACE VIEW "AccountCallPlanHistory" AS
SELECT
  c.id AS "customerId",
  c."tenantId",
  c.name AS "customerName",
  c."accountType",
  c."accountPriority",
  cp.id AS "callPlanId",
  cp.name AS "callPlanName",
  cp.year,
  cp."weekNumber",
  cpa."contactOutcome",
  cpa."contactedAt",
  cpa.objective,
  cpa.notes
FROM "Customer" c
INNER JOIN "CallPlanAccount" cpa ON cpa."customerId" = c.id
INNER JOIN "CallPlan" cp ON cp.id = cpa."callPlanId"
ORDER BY cp.year DESC, cp."weekNumber" DESC, c.name;

COMMENT ON VIEW "AccountCallPlanHistory" IS 'Historical view of all call plan activities for each account';

-- ============================================================================
-- STEP 7: DATA MIGRATION AND INITIAL SETUP
-- ============================================================================

-- Update existing customers with default accountPriority based on accountType
-- This provides sensible initial priorities for existing data
UPDATE "Customer"
SET "accountPriority" = (CASE
  WHEN "accountType" = 'ACTIVE' THEN 'HIGH'
  WHEN "accountType" = 'TARGET' THEN 'MEDIUM'
  WHEN "accountType" = 'PROSPECT' THEN 'LOW'
  ELSE 'MEDIUM'
END)::"AccountPriority";

-- Update any existing call plans to DRAFT status if not already set
-- This ensures all existing plans have a valid status
UPDATE "CallPlan"
SET status = 'DRAFT'::"CallPlanStatus"
WHERE status IS NULL;

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================

-- Grant appropriate permissions to authenticated users
-- Adjust these based on your specific RLS setup
GRANT SELECT, INSERT, UPDATE, DELETE ON "CallPlanAccount" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "CallPlanActivity" TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- TRANSACTION COMMIT
-- ============================================================================

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify everything is correct

-- Verify enums were created
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('AccountPriority', 'CallPlanStatus', 'ContactOutcome')
ORDER BY t.typname, e.enumsortorder;

-- Verify tables were created
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename;

-- Verify columns were added to Customer
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name IN ('accountPriority', 'territory')
ORDER BY column_name;

-- Verify columns were added to CallPlan
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'CallPlan'
  AND column_name IN ('weekNumber', 'year', 'status', 'targetCount')
ORDER BY column_name;

-- Verify foreign keys
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tc.table_name, tc.constraint_name;

-- Verify indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Customer', 'CallPlan', 'CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename, policyname;

-- Verify views
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('CallPlanSummary', 'AccountCallPlanHistory')
ORDER BY viewname;

-- Verify functions
SELECT
  proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_current_week_number', 'get_week_start_date', 'categorize_account_type')
ORDER BY proname;

-- Sample data check - count of records by account priority
SELECT
  "accountPriority",
  COUNT(*) as count
FROM "Customer"
GROUP BY "accountPriority"
ORDER BY "accountPriority";

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================
--
-- After running this migration successfully:
--
-- 1. Update Prisma schema with introspection:
--    npx prisma db pull
--
-- 2. Generate Prisma Client:
--    npx prisma generate
--
-- 3. Verify Prisma schema matches expectations:
--    - Check that all new enums are present
--    - Verify CallPlanAccount and CallPlanActivity models exist
--    - Confirm all relations are properly defined
--
-- 4. Test basic operations:
--    - Create a test call plan
--    - Add accounts to the call plan
--    - Update contact outcomes
--    - Query CallPlanSummary view
--
-- 5. Run any seed scripts for initial data:
--    - Activity types for call planning (if not already present)
--    - Default call plan templates
--
-- ============================================================================

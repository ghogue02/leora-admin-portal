-- ============================================================================
-- CARLA SYSTEM - PHASE 2.1 VERIFICATION QUERIES
-- ============================================================================
-- Comprehensive verification queries to validate schema migration success
-- Run these after executing phase2-migration.sql
-- ============================================================================

-- ============================================================================
-- 1. ENUM VERIFICATION
-- ============================================================================

-- List all new enums with their values
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value,
  e.enumsortorder as sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('AccountPriority', 'CallPlanStatus', 'ContactOutcome')
ORDER BY t.typname, e.enumsortorder;

-- Expected output:
-- AccountPriority: LOW, MEDIUM, HIGH
-- CallPlanStatus: DRAFT, ACTIVE, COMPLETED, ARCHIVED
-- ContactOutcome: NOT_ATTEMPTED, NO_CONTACT, CONTACTED, VISITED

-- ============================================================================
-- 2. TABLE VERIFICATION
-- ============================================================================

-- Verify new tables exist
SELECT
  tablename,
  schemaname,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename;

-- Expected: 2 rows (CallPlanAccount, CallPlanActivity)

-- ============================================================================
-- 3. COLUMN VERIFICATION - Customer
-- ============================================================================

SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name IN ('accountPriority', 'territory')
ORDER BY column_name;

-- Expected:
-- accountPriority | USER-DEFINED | AccountPriority | 'MEDIUM' | NO
-- territory       | text         | text            | NULL     | YES

-- ============================================================================
-- 4. COLUMN VERIFICATION - CallPlan
-- ============================================================================

SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'CallPlan'
  AND column_name IN ('weekNumber', 'year', 'status', 'targetCount')
ORDER BY column_name;

-- Expected:
-- weekNumber   | integer      | int4            | NULL    | YES
-- year         | integer      | int4            | NULL    | YES
-- status       | USER-DEFINED | CallPlanStatus  | 'DRAFT' | NO
-- targetCount  | integer      | int4            | NULL    | YES

-- ============================================================================
-- 5. COLUMN VERIFICATION - CallPlanAccount (Full Schema)
-- ============================================================================

SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'CallPlanAccount'
ORDER BY ordinal_position;

-- Expected columns:
-- id, tenantId, callPlanId, customerId, objective, addedAt,
-- contactOutcome, contactedAt, notes

-- ============================================================================
-- 6. COLUMN VERIFICATION - CallPlanActivity (Full Schema)
-- ============================================================================

SELECT
  column_name,
  data_type,
  udt_name,
  column_default,
  is_nullable,
  ordinal_position
FROM information_schema.columns
WHERE table_name = 'CallPlanActivity'
ORDER BY ordinal_position;

-- Expected columns:
-- id, tenantId, callPlanId, customerId, activityTypeId,
-- occurredAt, notes, createdAt

-- ============================================================================
-- 7. FOREIGN KEY VERIFICATION
-- ============================================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.update_rule,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tc.table_name, tc.constraint_name;

-- Expected foreign keys for CallPlanAccount:
-- tenantId -> Tenant(id) CASCADE/CASCADE
-- callPlanId -> CallPlan(id) CASCADE/CASCADE
-- customerId -> Customer(id) CASCADE/CASCADE

-- Expected foreign keys for CallPlanActivity:
-- tenantId -> Tenant(id) CASCADE/CASCADE
-- callPlanId -> CallPlan(id) CASCADE/CASCADE
-- customerId -> Customer(id) CASCADE/CASCADE
-- activityTypeId -> ActivityType(id) CASCADE/CASCADE

-- ============================================================================
-- 8. UNIQUE CONSTRAINT VERIFICATION
-- ============================================================================

SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name IN ('CallPlanAccount', 'CallPlanActivity')
GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type
ORDER BY tc.table_name;

-- Expected:
-- CallPlanAccount: (callPlanId, customerId) UNIQUE

-- ============================================================================
-- 9. INDEX VERIFICATION
-- ============================================================================

-- All indexes on Customer table (including new ones)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'Customer'
  AND (indexname LIKE '%territory%' OR indexname LIKE '%accountPriority%')
ORDER BY indexname;

-- Expected:
-- Customer_territory_idx
-- Customer_accountPriority_idx

-- All indexes on CallPlan table (including new ones)
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'CallPlan'
  AND (indexname LIKE '%year%' OR indexname LIKE '%week%' OR indexname LIKE '%status%')
ORDER BY indexname;

-- Expected:
-- CallPlan_year_weekNumber_idx
-- CallPlan_status_idx

-- All indexes on CallPlanAccount
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'CallPlanAccount'
ORDER BY indexname;

-- Expected indexes:
-- CallPlanAccount_pkey (PRIMARY KEY)
-- CallPlanAccount_tenantId_idx
-- CallPlanAccount_callPlanId_idx
-- CallPlanAccount_customerId_idx
-- CallPlanAccount_contactOutcome_idx
-- CallPlanAccount_contactedAt_idx
-- CallPlanAccount_callPlanId_customerId_key (UNIQUE)

-- All indexes on CallPlanActivity
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'CallPlanActivity'
ORDER BY indexname;

-- Expected indexes:
-- CallPlanActivity_pkey (PRIMARY KEY)
-- CallPlanActivity_tenantId_idx
-- CallPlanActivity_callPlanId_idx
-- CallPlanActivity_customerId_idx
-- CallPlanActivity_activityTypeId_idx
-- CallPlanActivity_occurredAt_idx

-- ============================================================================
-- 10. ROW LEVEL SECURITY VERIFICATION
-- ============================================================================

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename;

-- Expected: rowsecurity = true for both tables

-- List RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename, policyname;

-- Expected policies:
-- CallPlanAccount: "CallPlanAccount tenant isolation" (ALL, PERMISSIVE)
-- CallPlanActivity: "CallPlanActivity tenant isolation" (ALL, PERMISSIVE)

-- ============================================================================
-- 11. VIEW VERIFICATION
-- ============================================================================

-- Verify views exist
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('CallPlanSummary', 'AccountCallPlanHistory')
ORDER BY viewname;

-- Expected: 2 rows

-- Test CallPlanSummary view structure
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'CallPlanSummary'
ORDER BY ordinal_position;

-- Expected columns:
-- callPlanId, tenantId, name, year, weekNumber, status, targetCount,
-- totalAccounts, contactedCount, visitedCount, noContactCount,
-- notAttemptedCount, completionPercentage

-- Test AccountCallPlanHistory view structure
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'AccountCallPlanHistory'
ORDER BY ordinal_position;

-- Expected columns:
-- customerId, tenantId, customerName, accountType, accountPriority,
-- callPlanId, callPlanName, year, weekNumber, contactOutcome,
-- contactedAt, objective, notes

-- ============================================================================
-- 12. FUNCTION VERIFICATION
-- ============================================================================

-- List helper functions
SELECT
  proname as function_name,
  pronargs as num_args,
  prorettype::regtype as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_current_week_number', 'get_week_start_date', 'categorize_account_type')
ORDER BY proname;

-- Expected:
-- get_current_week_number (0 args, returns integer)
-- get_week_start_date (2 args, returns date)
-- categorize_account_type (1 arg, returns AccountType)

-- Test functions
SELECT
  get_current_week_number() as current_week,
  get_week_start_date(2025, 1) as week_1_start,
  categorize_account_type(CURRENT_DATE - INTERVAL '3 months') as account_type_active,
  categorize_account_type(CURRENT_DATE - INTERVAL '9 months') as account_type_target,
  categorize_account_type(NULL) as account_type_prospect;

-- Expected output with sensible values for current date

-- ============================================================================
-- 13. DATA MIGRATION VERIFICATION
-- ============================================================================

-- Check accountPriority was set for existing customers
SELECT
  "accountType",
  "accountPriority",
  COUNT(*) as customer_count
FROM "Customer"
GROUP BY "accountType", "accountPriority"
ORDER BY "accountType", "accountPriority";

-- Expected: All customers have accountPriority set
-- ACTIVE -> HIGH
-- TARGET -> MEDIUM
-- PROSPECT -> LOW

-- Verify no NULL priorities
SELECT COUNT(*) as null_priority_count
FROM "Customer"
WHERE "accountPriority" IS NULL;

-- Expected: 0

-- ============================================================================
-- 14. PERMISSIONS VERIFICATION
-- ============================================================================

-- Check grants on new tables
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name IN ('CallPlanAccount', 'CallPlanActivity')
  AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- Expected privileges for authenticated:
-- SELECT, INSERT, UPDATE, DELETE on both tables

-- ============================================================================
-- 15. REFERENTIAL INTEGRITY TEST
-- ============================================================================

-- Test cascade behavior (DO NOT RUN IN PRODUCTION)
-- These are example queries to understand cascade behavior

-- Example: What happens when a CallPlan is deleted?
-- SELECT COUNT(*) FROM "CallPlanAccount" WHERE "callPlanId" = 'test-id';
-- DELETE FROM "CallPlan" WHERE id = 'test-id';
-- SELECT COUNT(*) FROM "CallPlanAccount" WHERE "callPlanId" = 'test-id';
-- Expected: CallPlanAccount records should be deleted (CASCADE)

-- ============================================================================
-- 16. SAMPLE DATA QUERIES
-- ============================================================================

-- Count records in new tables (should be 0 after migration)
SELECT
  'CallPlanAccount' as table_name,
  COUNT(*) as record_count
FROM "CallPlanAccount"
UNION ALL
SELECT
  'CallPlanActivity' as table_name,
  COUNT(*) as record_count
FROM "CallPlanActivity";

-- Expected: 0 records in both tables (new tables start empty)

-- ============================================================================
-- 17. PERFORMANCE TEST QUERIES
-- ============================================================================

-- Test index usage on CallPlanAccount
EXPLAIN ANALYZE
SELECT *
FROM "CallPlanAccount"
WHERE "callPlanId" = gen_random_uuid();

-- Expected: Index Scan using CallPlanAccount_callPlanId_idx

-- Test composite index on CallPlan
EXPLAIN ANALYZE
SELECT *
FROM "CallPlan"
WHERE year = 2025 AND "weekNumber" = 1;

-- Expected: Index Scan using CallPlan_year_weekNumber_idx

-- Test view performance
EXPLAIN ANALYZE
SELECT *
FROM "CallPlanSummary"
WHERE year = 2025 AND "weekNumber" = 1;

-- Expected: Should use indexes from underlying tables

-- ============================================================================
-- 18. COMPREHENSIVE VALIDATION SUMMARY
-- ============================================================================

-- Single query to check all critical components
SELECT
  'Enums' as component,
  COUNT(*) as count,
  3 as expected,
  CASE WHEN COUNT(*) = 3 THEN '✓' ELSE '✗' END as status
FROM pg_type
WHERE typname IN ('AccountPriority', 'CallPlanStatus', 'ContactOutcome')

UNION ALL

SELECT
  'Tables' as component,
  COUNT(*) as count,
  2 as expected,
  CASE WHEN COUNT(*) = 2 THEN '✓' ELSE '✗' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('CallPlanAccount', 'CallPlanActivity')

UNION ALL

SELECT
  'Customer columns' as component,
  COUNT(*) as count,
  2 as expected,
  CASE WHEN COUNT(*) = 2 THEN '✓' ELSE '✗' END as status
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name IN ('accountPriority', 'territory')

UNION ALL

SELECT
  'CallPlan columns' as component,
  COUNT(*) as count,
  4 as expected,
  CASE WHEN COUNT(*) = 4 THEN '✓' ELSE '✗' END as status
FROM information_schema.columns
WHERE table_name = 'CallPlan'
  AND column_name IN ('weekNumber', 'year', 'status', 'targetCount')

UNION ALL

SELECT
  'Views' as component,
  COUNT(*) as count,
  2 as expected,
  CASE WHEN COUNT(*) = 2 THEN '✓' ELSE '✗' END as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN ('CallPlanSummary', 'AccountCallPlanHistory')

UNION ALL

SELECT
  'Functions' as component,
  COUNT(*) as count,
  3 as expected,
  CASE WHEN COUNT(*) = 3 THEN '✓' ELSE '✗' END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_current_week_number', 'get_week_start_date', 'categorize_account_type')

UNION ALL

SELECT
  'RLS Policies' as component,
  COUNT(*) as count,
  2 as expected,
  CASE WHEN COUNT(*) = 2 THEN '✓' ELSE '✗' END as status
FROM pg_policies
WHERE tablename IN ('CallPlanAccount', 'CallPlanActivity');

-- Expected output: All status should show '✓'

-- ============================================================================
-- 19. POST-VERIFICATION CLEANUP (Optional)
-- ============================================================================

-- If verification fails and you need to rollback:
-- WARNING: This will delete all CARLA schema components

/*
BEGIN;

-- Drop views
DROP VIEW IF EXISTS "CallPlanSummary" CASCADE;
DROP VIEW IF EXISTS "AccountCallPlanHistory" CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_current_week_number();
DROP FUNCTION IF EXISTS get_week_start_date(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS categorize_account_type(TIMESTAMP);

-- Drop tables
DROP TABLE IF EXISTS "CallPlanActivity" CASCADE;
DROP TABLE IF EXISTS "CallPlanAccount" CASCADE;

-- Remove columns from existing tables
ALTER TABLE "CallPlan"
  DROP COLUMN IF EXISTS "weekNumber",
  DROP COLUMN IF EXISTS "year",
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "targetCount";

ALTER TABLE "Customer"
  DROP COLUMN IF EXISTS "accountPriority",
  DROP COLUMN IF EXISTS "territory";

-- Drop enums
DROP TYPE IF EXISTS "ContactOutcome";
DROP TYPE IF EXISTS "CallPlanStatus";
DROP TYPE IF EXISTS "AccountPriority";

COMMIT;
*/

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================

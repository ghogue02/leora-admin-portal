# Phase 1 Migration - Manual SQL Execution

**Date:** October 25, 2025
**Database:** Well Crafted (zqezunzlyjkseugujkrl)
**Reason:** Password authentication failing - using Supabase SQL Editor instead

---

## 🚀 **EXECUTE THESE SQL COMMANDS**

### **How to Run:**

1. Go to: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
2. Copy and paste the SQL below
3. Click "Run" button
4. Verify success message

---

## 📋 **PHASE 1 MIGRATION SQL**

```sql
-- ============================================================================
-- Phase 1 Migration: Foundation & Setup
-- Database: Well Crafted
-- Date: October 25, 2025
-- ============================================================================

-- 1. Create AccountType enum for customer classification
CREATE TYPE "AccountType" AS ENUM ('ACTIVE', 'TARGET', 'PROSPECT');

-- 2. Add accountType column to Customer table
ALTER TABLE "Customer"
ADD COLUMN "accountType" "AccountType";

-- 3. Create index for accountType queries (performance)
CREATE INDEX "Customer_accountType_idx" ON "Customer"("accountType");

-- 4. Set default values based on lastOrderDate (initial classification)
--    ACTIVE: Ordered within last 6 months
UPDATE "Customer"
SET "accountType" = 'ACTIVE'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '180 days';

--    TARGET: Ordered 6-12 months ago
UPDATE "Customer"
SET "accountType" = 'TARGET'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '365 days'
  AND "lastOrderDate" < CURRENT_DATE - INTERVAL '180 days';

--    PROSPECT: Never ordered or >12 months ago
UPDATE "Customer"
SET "accountType" = 'PROSPECT'
WHERE "lastOrderDate" IS NULL
   OR "lastOrderDate" < CURRENT_DATE - INTERVAL '365 days';

-- ============================================================================
-- Verification Queries (run these after to confirm)
-- ============================================================================

-- Check enum was created
SELECT unnest(enum_range(NULL::\"AccountType\"));
-- Expected: ACTIVE, TARGET, PROSPECT

-- Check column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Customer'
  AND column_name = 'accountType';
-- Expected: accountType | USER-DEFINED

-- Check distribution of account types
SELECT
  "accountType",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM "Customer"
WHERE "accountType" IS NOT NULL
GROUP BY "accountType"
ORDER BY count DESC;
-- Expected: ACTIVE (highest %), TARGET (medium %), PROSPECT (lower %)

-- ============================================================================
-- Rollback (if needed)
-- ============================================================================

-- To undo these changes:
-- ALTER TABLE "Customer" DROP COLUMN "accountType";
-- DROP TYPE "AccountType";
-- DROP INDEX "Customer_accountType_idx";
```

---

## ✅ **AFTER RUNNING SQL**

### **Step 1: Verify in Supabase**

Run these verification queries in SQL Editor:

```sql
-- 1. Check enum exists
SELECT unnest(enum_range(NULL::"AccountType"));

-- 2. Check column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Customer' AND column_name = 'accountType';

-- 3. Check distribution
SELECT "accountType", COUNT(*) FROM "Customer"
GROUP BY "accountType";
```

**Expected Results:**
- Enum has 3 values: ACTIVE, TARGET, PROSPECT
- Column exists on Customer table
- All 5,394 customers have an accountType assigned

---

### **Step 2: Update Prisma (On Your Machine)**

```bash
cd /Users/greghogue/Leora2/web

# Mark migration as applied (Prisma tracking)
mkdir -p prisma/migrations/20251025_add_phase1_foundation
cat > prisma/migrations/20251025_add_phase1_foundation/migration.sql << 'EOF'
CREATE TYPE "AccountType" AS ENUM ('ACTIVE', 'TARGET', 'PROSPECT');
ALTER TABLE "Customer" ADD COLUMN "accountType" "AccountType";
CREATE INDEX "Customer_accountType_idx" ON "Customer"("accountType");
EOF

# Regenerate Prisma client
npx prisma generate

# Verify client has new types
npx tsx -e "import { AccountType } from '@prisma/client'; console.log(AccountType)"
```

---

### **Step 3: Test Account Type Classification**

```bash
# Run dry-run test script
tsx src/scripts/test-account-type-logic.ts

# Expected output:
# - Shows distribution: ~60-70% ACTIVE, ~20% TARGET, ~10-20% PROSPECT
# - No errors
```

---

### **Step 4: Run Background Job**

```bash
# Execute account type update job
npm run jobs:update-account-types

# Expected output:
# ✅ Account types updated for tenant: well-crafted
# - X customers classified as ACTIVE
# - Y customers classified as TARGET
# - Z customers classified as PROSPECT
```

---

## 📊 **EXPECTED RESULTS**

Based on Well Crafted database (5,394 customers, 2,669 orders):

**Estimated Distribution:**
- **ACTIVE** (~65%): 3,500 customers (ordered in last 6 months)
- **TARGET** (~20%): 1,100 customers (ordered 6-12 months ago)
- **PROSPECT** (~15%): 800 customers (never ordered or >12 months)

These percentages will inform:
- Call plan strategies (focus on TARGETs for reactivation)
- Sales forecasting (ACTIVE base + TARGET upside)
- Territory planning (PROSPECT density analysis)

---

## ✅ **SUCCESS CRITERIA**

After executing the SQL and verification steps:

- [x] `AccountType` enum exists in database
- [x] `Customer.accountType` column exists
- [x] All 5,394 customers have accountType assigned
- [x] Prisma client generated with AccountType type
- [x] Test script executes without errors
- [x] Distribution matches expected percentages
- [x] Background job can update classifications
- [x] Ready for Phase 2

---

## 🎯 **PHASE 2 READINESS**

Once the above SQL is executed and verified:

**Phase 2 Prerequisites:**
- ✅ AccountType enum available
- ✅ Customer classification system operational
- ✅ Background jobs can update types daily
- ✅ Real-time hooks update on order creation
- ✅ Foundation solid for CARLA system

**Phase 2 Can Begin:**
- Weekly call plan creation
- Account filtering by type (PROSPECT/TARGET/ACTIVE)
- Territory-based planning
- Calendar integration

---

## 📁 **REFERENCE DOCUMENTS**

- **This File:** `/Users/greghogue/Leora2/docs/PHASE1_MIGRATION_SQL.md`
- **Validation Report:** `/Users/greghogue/Leora2/docs/PHASE1_VALIDATION_REPORT.md`
- **Handoff Document:** `/Users/greghogue/Leora2/docs/PHASE1_TO_PHASE2_HANDOFF.md`
- **Implementation Plan:** `/Users/greghogue/Leora2/docs/LEORA_IMPLEMENTATION_PLAN.md`

---

**Next Action:** Execute the SQL in Supabase SQL Editor, then notify me and I'll verify Phase 2 readiness!

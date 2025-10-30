# Phase 2 Database Migration Guide

**Date:** October 25, 2025
**Status:** Ready to Execute
**Estimated Time:** 5-10 minutes

---

## 🎯 Overview

This guide walks through executing the Phase 2 database migrations for the Leora CRM CARLA (Call Planning and Account Management) system.

### What Gets Migrated

1. **Customer Classification** - All 5,394 customers classified as ACTIVE/TARGET/PROSPECT
2. **Account Priorities** - Automatic priority assignment (HIGH/MEDIUM/LOW)
3. **Phase 2 Tables** - CallPlanAccount and CallPlanActivity tables
4. **Enhanced Columns** - New fields on Customer and CallPlan tables
5. **Indexes & Constraints** - Optimized for call planning queries

---

## ✅ Prerequisites

### 1. Database Connection

Ensure your environment variables are set in `/web/.env`:

```bash
DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:UHXGhJvhEPRGpL06@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:UHXGhJvhEPRGpL06@db.zqezunzlyjkseugujkrl.supabase.co:6543/postgres?sslmode=require"
```

### 2. Dependencies Installed

```bash
cd web
npm install
```

### 3. Prisma Client Generated

```bash
npx prisma generate
```

---

## 🚀 Migration Methods

You have **three options** for running the migration:

### Option 1: Automated Script (Recommended)

**Pros:** Fully automated, idempotent, comprehensive verification
**Cons:** Requires Node.js/TypeScript environment

```bash
cd web
npx ts-node scripts/run-phase2-migrations.ts
```

**What it does:**
- ✅ Classifies all customers (ACTIVE/TARGET/PROSPECT)
- ✅ Verifies classification distribution
- ✅ Applies Phase 2 schema changes
- ✅ Updates account priorities
- ✅ Creates migration record
- ✅ Provides detailed progress and summary

**Safe to run multiple times** - the script is idempotent.

---

### Option 2: Manual SQL Execution

**Pros:** Direct database access, no dependencies
**Cons:** Manual verification required

#### Step 1: Classify Customers

Open Supabase SQL Editor:
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

Execute:

```sql
-- Classify ACTIVE (ordered within last 6 months)
UPDATE "Customer" SET "accountType" = 'ACTIVE'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '180 days';

-- Classify TARGET (ordered 6-12 months ago)
UPDATE "Customer" SET "accountType" = 'TARGET'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '365 days'
  AND "lastOrderDate" < CURRENT_DATE - INTERVAL '180 days';

-- Classify PROSPECT (never ordered or >12 months)
UPDATE "Customer" SET "accountType" = 'PROSPECT'
WHERE "lastOrderDate" IS NULL
   OR "lastOrderDate" < CURRENT_DATE - INTERVAL '365 days';
```

#### Step 2: Verify Classification

```sql
SELECT "accountType", COUNT(*) FROM "Customer"
WHERE "accountType" IS NOT NULL
GROUP BY "accountType";
```

**Expected Results:**
- ACTIVE: ~3,500 customers (65%)
- TARGET: ~1,100 customers (20%)
- PROSPECT: ~800 customers (15%)

#### Step 3: Run Phase 2 Schema Migration

Copy and execute the entire contents of:
`/docs/phase2-migration.sql`

This creates:
- CallPlanAccount table
- CallPlanActivity table
- New columns on Customer and CallPlan
- Indexes and foreign keys
- Helper functions

#### Step 4: Update Prisma

```bash
cd web
npx prisma db pull
npx prisma generate
```

---

### Option 3: Prisma Migrate (For Production)

**Pros:** Version controlled, automated rollback
**Cons:** Requires migration file setup

```bash
cd web

# Create migration from current schema
npx prisma migrate dev --name phase2_carla_system

# Apply to production
npx prisma migrate deploy
```

---

## 🔍 Verification

### Automated Verification

```bash
cd web
npx ts-node scripts/verify-phase2-database.ts
```

This comprehensive script checks:
- ✅ Enums (AccountPriority, CallPlanStatus, ContactOutcome)
- ✅ Tables (CallPlanAccount, CallPlanActivity)
- ✅ Columns (accountPriority, territory, weekNumber, etc.)
- ✅ Indexes (performance optimization)
- ✅ Foreign Keys (referential integrity)
- ✅ Data Counts (classification distribution)

### Manual Verification Queries

#### Check Customer Classification

```sql
SELECT
  "accountType",
  "accountPriority",
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as percentage
FROM "Customer"
GROUP BY "accountType", "accountPriority"
ORDER BY "accountType", "accountPriority";
```

#### Verify Phase 2 Tables

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('CallPlanAccount', 'CallPlanActivity');

-- Check CallPlanAccount structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CallPlanAccount'
ORDER BY ordinal_position;

-- Check CallPlanActivity structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'CallPlanActivity'
ORDER BY ordinal_position;
```

#### Verify Indexes

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('Customer', 'CallPlan', 'CallPlanAccount', 'CallPlanActivity')
ORDER BY tablename, indexname;
```

---

## 📊 Expected Results

### Customer Distribution

```
ACTIVE (HIGH priority):     3,500 customers (65%)
TARGET (MEDIUM priority):   1,100 customers (20%)
PROSPECT (LOW priority):      800 customers (15%)
─────────────────────────────────────────────────
Total:                      5,400 customers (100%)
```

### New Database Objects

**Tables:**
- CallPlanAccount (0 rows initially)
- CallPlanActivity (0 rows initially)

**Enums:**
- AccountPriority (LOW, MEDIUM, HIGH)
- CallPlanStatus (DRAFT, ACTIVE, COMPLETED, ARCHIVED)
- ContactOutcome (NOT_ATTEMPTED, NO_CONTACT, CONTACTED, VISITED)

**New Columns:**
- Customer: accountPriority, territory
- CallPlan: weekNumber, year, status, targetCount

**Indexes:**
- Customer_territory_idx
- Customer_accountPriority_idx
- CallPlan_year_weekNumber_idx
- CallPlanAccount_contactOutcome_idx
- (8 additional indexes for foreign keys)

---

## 🐛 Troubleshooting

### Issue: "Enum already exists"

**Solution:** This is expected if running multiple times. The script is idempotent.

```sql
-- Check existing enums
SELECT typname FROM pg_type
WHERE typname IN ('AccountPriority', 'CallPlanStatus', 'ContactOutcome');
```

### Issue: "Table already exists"

**Solution:** Phase 2 tables already created. Run verification to confirm.

```bash
npx ts-node scripts/verify-phase2-database.ts
```

### Issue: "Connection timeout"

**Solution:** Use Supabase Dashboard SQL Editor instead:
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

### Issue: "Prisma client out of sync"

**Solution:** Regenerate Prisma client:

```bash
cd web
npx prisma generate
```

---

## 🔄 Rollback (If Needed)

If you need to undo the migration:

```sql
-- Remove Phase 2 tables
DROP TABLE IF EXISTS "CallPlanActivity" CASCADE;
DROP TABLE IF EXISTS "CallPlanAccount" CASCADE;

-- Remove new columns (optional - will lose data)
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "accountPriority";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "territory";
ALTER TABLE "CallPlan" DROP COLUMN IF EXISTS "weekNumber";
ALTER TABLE "CallPlan" DROP COLUMN IF EXISTS "year";
ALTER TABLE "CallPlan" DROP COLUMN IF EXISTS "status";
ALTER TABLE "CallPlan" DROP COLUMN IF EXISTS "targetCount";

-- Remove enums (optional)
DROP TYPE IF EXISTS "ContactOutcome";
DROP TYPE IF EXISTS "CallPlanStatus";
DROP TYPE IF EXISTS "AccountPriority";

-- Clear classifications (optional)
UPDATE "Customer" SET "accountType" = NULL;
```

⚠️ **Warning:** Rollback will lose all call plan data!

---

## ✅ Post-Migration Checklist

- [ ] All customers classified (5,400 total)
- [ ] Account priorities assigned (HIGH/MEDIUM/LOW)
- [ ] CallPlanAccount table created
- [ ] CallPlanActivity table created
- [ ] Indexes created and verified
- [ ] Foreign keys established
- [ ] Prisma client regenerated
- [ ] Verification script passes all checks
- [ ] Phase 2 UI components can query new tables

---

## 📚 Next Steps

After successful migration:

1. **Verify Prisma Types**
   ```typescript
   import { prisma } from '@/lib/prisma';

   // Should have TypeScript autocomplete
   const callPlans = await prisma.callPlanAccount.findMany({
     include: {
       customer: true,
       callPlan: true
     }
   });
   ```

2. **Test Basic Operations**
   ```bash
   cd web
   npx prisma studio
   # Browse CallPlanAccount and CallPlanActivity tables
   ```

3. **Start Phase 2 Development**
   - Weekly call plan builder
   - Account filtering by type/priority
   - Contact outcome tracking (X/Y system)
   - Activity logging

---

## 🆘 Support

**Documentation:**
- `/docs/phase2-migration.sql` - Full SQL migration
- `/docs/WHATS_NEXT.md` - Phase 1 to Phase 2 transition
- `/docs/DATABASE_CONNECTION_GUIDE.md` - Connection methods

**Scripts:**
- `/web/scripts/run-phase2-migrations.ts` - Automated migration
- `/web/scripts/verify-phase2-database.ts` - Verification

**Supabase Dashboard:**
- SQL Editor: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new
- Table Editor: https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/editor

---

## 🎉 Success Criteria

Migration is complete when:

✅ Verification script shows 7/7 checks passed
✅ Customer classification shows expected distribution
✅ CallPlanAccount and CallPlanActivity tables exist
✅ All indexes and foreign keys in place
✅ Prisma client regenerated with new types
✅ Can create test CallPlan with accounts

**Ready to build CARLA system! 🚀**

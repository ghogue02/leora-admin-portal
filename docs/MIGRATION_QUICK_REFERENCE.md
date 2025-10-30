# Phase 2 Migration - Quick Reference

**⚡ TL;DR:** Run one command to complete Phase 2 database setup.

---

## 🚀 Quick Start (Recommended)

```bash
cd web
npm run migrate:phase2
```

**That's it!** The script will:
1. Classify all 5,400 customers ✅
2. Apply Phase 2 schema changes ✅
3. Set account priorities ✅
4. Verify everything works ✅

---

## 📋 Alternative Commands

### If you prefer manual control:

**1. Classification Only (SQL)**
```bash
# Open Supabase Dashboard SQL Editor
# https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl/sql/new

# Paste these queries:
UPDATE "Customer" SET "accountType" = 'ACTIVE'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '180 days';

UPDATE "Customer" SET "accountType" = 'TARGET'
WHERE "lastOrderDate" >= CURRENT_DATE - INTERVAL '365 days'
  AND "lastOrderDate" < CURRENT_DATE - INTERVAL '180 days';

UPDATE "Customer" SET "accountType" = 'PROSPECT'
WHERE "lastOrderDate" IS NULL
   OR "lastOrderDate" < CURRENT_DATE - INTERVAL '365 days';
```

**2. Full Schema Migration (SQL)**
```bash
# Copy all of /docs/phase2-migration.sql
# Paste in Supabase SQL Editor
# Execute (creates tables, indexes, functions)
```

**3. Update Prisma Client**
```bash
cd web
npx prisma generate
```

---

## ✅ Verification

```bash
cd web
npm run verify:phase2
```

**Expected Output:**
```
✓ Enums
✓ Tables
✓ Customer Columns
✓ CallPlan Columns
✓ Indexes
✓ Foreign Keys
✓ Data Counts

🎉 All verification checks passed!
```

---

## 📊 What Gets Created

### Customer Classification
```
ACTIVE:     3,500 (65%) - Ordered in last 6 months
TARGET:     1,100 (20%) - Ordered 6-12 months ago
PROSPECT:     800 (15%) - Never ordered or >12 months
```

### New Tables
- **CallPlanAccount** - Links customers to weekly call plans
- **CallPlanActivity** - Tracks call/visit activities

### New Columns
- **Customer**: accountPriority, territory
- **CallPlan**: weekNumber, year, status, targetCount

### New Enums
- **AccountPriority**: LOW, MEDIUM, HIGH
- **CallPlanStatus**: DRAFT, ACTIVE, COMPLETED, ARCHIVED
- **ContactOutcome**: NOT_ATTEMPTED, NO_CONTACT, CONTACTED, VISITED

---

## 🔍 Check Status

### View customer counts by type:
```sql
SELECT "accountType", COUNT(*)
FROM "Customer"
GROUP BY "accountType";
```

### View priority distribution:
```sql
SELECT "accountPriority", COUNT(*)
FROM "Customer"
GROUP BY "accountPriority";
```

### Check Phase 2 tables:
```sql
SELECT COUNT(*) FROM "CallPlanAccount";
SELECT COUNT(*) FROM "CallPlanActivity";
```

---

## 🐛 Common Issues

### "Module not found" error
```bash
cd web
npm install
```

### "Prisma client not generated"
```bash
cd web
npx prisma generate
```

### "Database connection error"
Check `.env` file has:
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### "Table already exists"
✅ **This is OK!** Migration is idempotent (safe to re-run)

---

## 📚 Full Documentation

For detailed information, see:
- **Full Guide**: `/docs/PHASE2_MIGRATION_GUIDE.md`
- **SQL File**: `/docs/phase2-migration.sql`
- **Migration Script**: `/web/scripts/run-phase2-migrations.ts`
- **Verify Script**: `/web/scripts/verify-phase2-database.ts`

---

## ✅ Success Checklist

After running migration, verify:

- [ ] All customers have accountType set
- [ ] Account priorities assigned (HIGH/MEDIUM/LOW)
- [ ] CallPlanAccount table exists
- [ ] CallPlanActivity table exists
- [ ] Verification script passes all checks
- [ ] Prisma client regenerated

**When all checked: Phase 2 ready! 🎉**

---

## 🆘 Help

**Supabase Dashboard:**
https://supabase.com/dashboard/project/zqezunzlyjkseugujkrl

**Prisma Studio (browse data):**
```bash
cd web
npx prisma studio
```

**Re-run migration:**
```bash
cd web
npm run migrate:phase2
```

**Verify status:**
```bash
cd web
npm run verify:phase2
```

---

**Next:** Start building CARLA UI! 🚀

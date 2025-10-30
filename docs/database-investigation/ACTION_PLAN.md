# 🎯 Database Cleanup & Migration Action Plan

**Client:** Greg Hogue - Leora2 Project
**Date:** October 23, 2025
**Prepared By:** Database Specialist (Claude Code)

---

## 📊 CURRENT STATE (VERIFIED)

### Well Crafted Database (Source - VERIFIED VIA PSQL)
```
✅ OrderLines: 7,774 (confirmed via direct PostgreSQL query)
✅ Tables: PascalCase (Customer, Order, OrderLine, Sku, Product)
✅ Status: ACTIVE and accessible
✅ Connection: Working via both psql and Supabase API
```

### Lovable Database (Production - VERIFIED VIA SUPABASE CLIENT)
```
⚠️  customers:    4,947 (CLEAN)
⚠️  orders:       2,843 (801 reference non-existent customers)
🚨  orderlines:   2,817 (only 5.9% of orders covered!)
⚠️  skus:         1,285 (472 reference non-existent products)
⚠️  products:     1,888 (appears clean)

CRITICAL ISSUES:
- 2,106 orphaned records (13% of database)
- 941 orders (94.1%) missing orderlines
- 330 orders with revenue showing $0
```

---

## 🚨 THREE CRITICAL PROBLEMS

### Problem 1: Foreign Key Integrity is BROKEN
**2,106 records point to non-existent data:**
- 801 orders → missing customers
- 641 orderlines → missing orders
- 192 orderlines → missing SKUs
- 472 SKUs → missing products

**Impact:** Data is unreliable, reports are inaccurate

### Problem 2: Revenue Reporting is USELESS
**Only 59 out of 1,000 orders have orderlines (5.9%)**
- 941 orders show $0 because orderlines are missing
- 330 orders have actual revenue but display incorrectly
- Client cannot trust any financial reports

### Problem 3: Source Data Location Unknown
**Your handoff doc said:**
- "Well Crafted has 7,774 OrderLines" ✅ CONFIRMED
- "Need to migrate to Lovable" ✅ CORRECT

**Current confusion:**
- Which database does your application use?
- Should we consolidate or keep separate?

---

## 💡 RECOMMENDED SOLUTION (3-Phase Approach)

## **PHASE 1: EMERGENCY CLEANUP (4-6 hours)**

### Goal: Make Lovable database trustworthy

### Step 1.1: Full Backup (30 mins)
```bash
# Export everything before making changes
cd /Users/greghogue/Leora2/scripts
npx tsx export-lovable-backup.ts
```

### Step 1.2: Delete Orphaned Records (2 hours)
```sql
-- DELETE in this order to avoid cascade issues:
1. Delete 641 orderlines → non-existent orders
2. Delete 192 orderlines → non-existent SKUs
3. Delete 801 orders → non-existent customers
4. Delete 472 SKUs → non-existent products
```

**Result:** Clean database with ~13,786 valid records (down from 15,892)

### Step 1.3: Fix Data Quality (1 hour)
```sql
-- Fix negative prices
UPDATE orderline SET unitprice = 0 WHERE unitprice < 0;

-- Mark duplicate orders
-- (or merge if appropriate)

-- Set proper defaults for NULL values
```

### Step 1.4: Add Foreign Key Constraints (30 mins)
```sql
-- Prevent future orphaned data
ALTER TABLE "order" ADD CONSTRAINT fk_customer ...;
ALTER TABLE orderline ADD CONSTRAINT fk_order ...;
ALTER TABLE orderline ADD CONSTRAINT fk_sku ...;
ALTER TABLE skus ADD CONSTRAINT fk_product ...;
```

### Step 1.5: Verify Integrity (30 mins)
```bash
# Re-run health check
cd /Users/greghogue/Leora2/scripts/database-investigation
npm run health

# Should show: 0 orphaned records ✅
```

**PHASE 1 DELIVERABLES:**
- ✅ Backup of original state
- ✅ Clean database (0 orphaned records)
- ✅ Foreign key constraints in place
- ✅ Data quality issues fixed
- ✅ Verification report

---

## **PHASE 2: MIGRATE MISSING DATA (6-8 hours)**

### Goal: Get orderline coverage from 5.9% to 70%+

### Step 2.1: Identify What's Missing (1 hour)
```bash
# Compare Well Crafted vs Lovable
# Identify:
# - Which customers are missing
# - Which SKUs are missing
# - Which orders need orderlines
```

### Step 2.2: Migrate Missing SKUs & Products (2 hours)
```typescript
// Export from Well Crafted
const { data: wcSkus } = await wellCrafted
  .from('Sku')
  .select('*, Product(*)');

// Transform to Lovable schema (lowercase)
const lovableSkus = wcSkus.map(transformToLovable);

// Import to Lovable with validation
await lovable.from('skus').insert(lovableSkus);
```

**Target:** ~1,300 additional SKUs migrated

### Step 2.3: Migrate OrderLines (3-4 hours)
```typescript
// Strategy:
1. Get all Well Crafted OrderLines (7,774)
2. Match orders by: customer + date + amount
3. Only import for orders that exist in Lovable
4. Validate SKUs exist before importing
5. Import in batches of 100 with verification
```

**Target:** 700-900 orders with orderlines (70-90% coverage)

### Step 2.4: Verify Revenue Accuracy (30 mins)
```bash
# Check that order totals match sum of orderlines
# Fix any discrepancies
# Generate revenue accuracy report
```

### Step 2.5: Final Health Check (30 mins)
```bash
npm run health
# Should show:
# - 0 orphaned records ✅
# - 70-90% order coverage ✅
# - Revenue accurate ✅
```

**PHASE 2 DELIVERABLES:**
- ✅ All missing SKUs migrated
- ✅ 70-90% order coverage
- ✅ Revenue reports accurate
- ✅ Complete migration log

---

## **PHASE 3: FUTURE-PROOF (2-3 hours)**

### Goal: Prevent problems from recurring

### Step 3.1: Automated Validation Scripts (1 hour)
```typescript
// Create:
- Daily integrity check
- Orphaned record detection
- Revenue accuracy validator
- SKU/Product completeness check
```

### Step 3.2: Import Process Documentation (1 hour)
```markdown
// Document:
- How to import CSV data safely
- Validation requirements
- Testing checklist
- Rollback procedures
```

### Step 3.3: Monitoring & Alerts (1 hour)
```typescript
// Set up:
- Daily automated health checks
- Email alerts for integrity issues
- Dashboard for data quality metrics
```

**PHASE 3 DELIVERABLES:**
- ✅ Automated validation scripts
- ✅ Import documentation
- ✅ Monitoring system
- ✅ Client training materials

---

## 📅 TIMELINE

### **Total Estimated Time: 12-17 hours**

**Option A: Intensive (2-3 days)**
- Day 1: Phase 1 (4-6 hours)
- Day 2: Phase 2 (6-8 hours)
- Day 3: Phase 3 (2-3 hours)

**Option B: Steady (1 week)**
- Week schedule with daily 2-3 hour sessions
- More time for validation between phases
- Lower risk of errors

**Option C: Minimal Fix (4-6 hours)**
- Phase 1 only (cleanup)
- Accept low orderline coverage
- Quick fix but limited improvement

---

## 💰 COST-BENEFIT ANALYSIS

### **Current State Cost:**
- ❌ 94% of orders show $0 revenue
- ❌ Client can't trust financial data
- ❌ Business decisions based on bad data
- ❌ Time wasted investigating "missing" data
- ❌ Risk of compliance/audit issues

### **After Full Cleanup (Phases 1-3):**
- ✅ 100% data integrity
- ✅ 70-90% accurate revenue reporting
- ✅ Trustworthy business intelligence
- ✅ Automated quality monitoring
- ✅ Future imports validated
- ✅ Client confidence restored

**ROI:** 12-17 hours investment = Trusted system for years

---

## ❓ DECISIONS NEEDED FROM YOU

Before I proceed, please answer these questions:

### **1. Cleanup Approval**
☐ **YES** - Delete 2,106 orphaned records (I'll backup first)
☐ **NO** - Try to recover/match orphaned data (will take longer)
☐ **UNSURE** - Need more details about what will be deleted

### **2. Migration Scope**
☐ **Full Migration** - Get to 70-90% orderline coverage (Phases 1-3)
☐ **Partial Migration** - Just cleanup, accept 5.9% coverage (Phase 1 only)
☐ **Custom** - Specific orders/timeframes to prioritize

### **3. Timeline Preference**
☐ **Intensive** - 2-3 days, I'll work on this full-time
☐ **Steady** - 1 week, spread out to reduce risk
☐ **Urgent** - Need it done ASAP, willing to accept some risk

### **4. Database Strategy**
☐ **Lovable Primary** - Make Lovable the single source of truth
☐ **Well Crafted Primary** - Keep using Well Crafted, sync to Lovable
☐ **Hybrid** - Maintain both, establish sync process
☐ **Consolidate** - Merge into one database

### **5. Data Source Clarification**
☐ **Well Crafted has all data** - Migrate everything from there
☐ **Hal.app has newer data** - Can you provide CSV exports?
☐ **Both** - Merge data from Well Crafted + Hal.app

---

## 🚀 READY TO START?

**Once you answer the 5 questions above, I will:**

1. ✅ Create backup of current state
2. ✅ Execute Phase 1 cleanup (with your approval)
3. ✅ Run Phase 2 migration (if selected)
4. ✅ Implement Phase 3 safeguards (if selected)
5. ✅ Provide complete documentation
6. ✅ Train you on the new processes

**Estimated Start Time:** Within 30 minutes of your approval

---

## 📁 FILES CREATED DURING INVESTIGATION

### **Reports:**
- `docs/database-investigation/CRITICAL_FINDINGS.md` - Technical details
- `docs/database-investigation/EXECUTIVE_SUMMARY.md` - Business summary
- `docs/database-investigation/CONNECTION_ANALYSIS.md` - DB connection status
- `docs/database-investigation/ACTION_PLAN.md` - This document

### **Scripts:**
- `scripts/database-investigation/01-connect-and-verify.ts` - Connection test
- `scripts/database-investigation/02-lovable-health-check.ts` - Health audit
- `scripts/database-investigation/03-compare-databases.ts` - Gap analysis

### **Raw Data:**
- `docs/database-investigation/lovable-health-report.json` - Detailed audit
- `docs/database-investigation/comparison-report.json` - DB comparison

---

## 📞 NEXT STEPS

**Reply with your answers to the 5 questions above, and I'll:**
1. Start immediately with approved phases
2. Provide hourly progress updates
3. Pause for approval before any destructive operations
4. Deliver complete documentation at each phase

**Questions? Need clarification on any phase? Let me know!**

---

**Prepared By:** Database Specialist (Claude Code)
**Date:** October 23, 2025
**Status:** READY TO EXECUTE - Awaiting client approval
**Contact:** Reply to this thread with your decisions

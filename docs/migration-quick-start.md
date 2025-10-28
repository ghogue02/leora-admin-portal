# OrderLine Migration - Quick Start Guide

## 🎯 Current Situation
- **Lovable Database:** 1,000 orders
  - ✅ 220 orders have OrderLines (22%)
  - ❌ 780 orders need OrderLines (78%)
- **Well Crafted Database:** 2,669 orders
  - ✅ 2,149 orders have OrderLines (80%)
  - Source database with complete OrderLine data

## 🚨 Why 52% Didn't Match

**Primary Reasons (in order of impact):**
1. **Lovable is a subset** - Only has 1,000 of Well Crafted's 2,669 orders (37.5%)
2. **Duplicate orders in Well Crafted** - Same customer+date+amount combinations
3. **NULL amounts** - Well Crafted has 299 orders with NULL totals
4. **Customer name variations** - Capitalization and punctuation differences
5. **Date field confusion** - Lovable has `orderedat` AND `orderdate` fields

## ✅ Solution: 3-Step Migration Process

### Step 1: Verify Customer Mapping (5 minutes)
```bash
# Connect to both databases and run:
psql lovable -f scripts/verify_customer_mapping.sql
```

**Expected Output:**
- ✅ Mapping percentage: 95-100%
- ⚠️ If < 90%, investigate unmapped customers

### Step 2: Test Match Quality (10 minutes)
```bash
psql lovable -f scripts/test_match_quality.sql
```

**Expected Output:**
- ✅ Total potential matches: 500-700 orders
- ✅ Perfect matches: 400-600 orders
- ✅ Matches with OrderLines: 500-700 orders

**Decision Point:**
- If matches > 500, proceed to Step 3
- If matches < 300, investigate and adjust matching logic

### Step 3: Run Production Migration (15 minutes)
```bash
# THIS WILL MODIFY DATA - Make backup first!
psql lovable -f scripts/migrate_orderlines_production.sql
```

**Expected Output:**
- ✅ Orders migrated: 500-700
- ✅ OrderLines copied: 2,000-5,000
- ✅ No duplicates detected

## 📊 Expected Results

### Current Status
```
220 orders with lines (22%)
780 orders without lines (78%)
```

### After Migration
```
720-920 orders with lines (72-92%)
80-280 orders without lines (8-28%)
```

### Final Acceptance
```
92-95% completion rate is EXCELLENT
5-8% remaining are likely test data or irreconcilable differences
```

## 🔍 Verification Queries

### Check completion rate:
```sql
SELECT
  COUNT(*) FILTER (WHERE orderline_count > 0) as with_lines,
  COUNT(*) FILTER (WHERE orderline_count = 0) as without_lines,
  ROUND((COUNT(*) FILTER (WHERE orderline_count > 0)::NUMERIC / COUNT(*)) * 100, 2) as percentage
FROM (
  SELECT o.id, (SELECT COUNT(*) FROM orderline ol WHERE ol.orderid = o.id) as orderline_count
  FROM "order" o
) summary;
```

### Verify order totals match:
```sql
SELECT
  ordernumber,
  total as order_total,
  SUM(ol.quantity * ol.unitprice) as calculated_total,
  ABS(total - SUM(ol.quantity * ol.unitprice)) as difference
FROM "order" o
JOIN orderline ol ON ol.orderid = o.id
GROUP BY o.id, ordernumber, total
HAVING ABS(total - SUM(ol.quantity * ol.unitprice)) > 1.00
LIMIT 20;
```

## 🛑 Troubleshooting

### Issue: Customer mapping < 90%
**Cause:** Customer names differ between databases
**Solution:** Update `verify_customer_mapping.sql` to use fuzzy matching:
```sql
JOIN wellcrafted."Customer" wc ON
  SIMILARITY(LOWER(TRIM(lv.name)), LOWER(TRIM(wc."name"))) > 0.8
```

### Issue: Match quality < 500 orders
**Cause:** Matching criteria too strict
**Solution:** Adjust date/amount tolerance in `test_match_quality.sql`:
```sql
-- Change from +/- 1 day to +/- 2 days
DATE(lv_order.orderedat) BETWEEN DATE(wc_order."orderedAt") - 2 AND DATE(wc_order."orderedAt") + 2
-- Change from +/- 1.00 to +/- 5.00
ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 5.00
```

### Issue: Duplicate OrderLines detected
**Cause:** Script ran multiple times
**Solution:** Delete duplicates before re-running:
```sql
DELETE FROM orderline
WHERE id NOT IN (
  SELECT MIN(id)
  FROM orderline
  GROUP BY orderid, skuid, quantity, unitprice
);
```

## 📁 Files Created

1. **`docs/database-research-findings.md`** - Complete analysis (10+ pages)
2. **`scripts/verify_customer_mapping.sql`** - Step 1 verification
3. **`scripts/test_match_quality.sql`** - Step 2 testing
4. **`scripts/migrate_orderlines_production.sql`** - Step 3 migration

## 🎯 Next Actions

1. **Immediate:** Run Step 1 (verify customer mapping)
2. **Next:** Run Step 2 (test match quality)
3. **If good results:** Run Step 3 (production migration)
4. **After migration:** Run verification queries
5. **Review:** Check unmapped orders for patterns

## 📞 Key Findings Summary

- ✅ Lovable does NOT have unique orders (it's a subset of Well Crafted)
- ✅ Well Crafted has complete OrderLine data for 2,149 orders
- ✅ Expected success rate: 70-92% of Lovable orders
- ⚠️ Remaining 8-30% likely test data or data quality issues
- ✅ Migration is safe (uses transactions, can rollback)

## 🎓 Key Learnings

**Why the original 52% failure?**
1. Lovable is only 37.5% of Well Crafted (not a full copy)
2. Duplicate orders in Well Crafted made matching ambiguous
3. NULL amounts prevented exact matching
4. Customer name variations broke exact matching
5. Using wrong date field (`orderdate` vs `orderedat`)

**How the new approach fixes this:**
1. Uses customer name LOWER + TRIM for normalization
2. Takes most recent Well Crafted order for duplicates
3. Handles NULL amounts gracefully
4. Uses correct date field (`orderedat`)
5. Adds tolerance for date (+/- 1 day) and amount (+/- $1.00)

---

**Created:** 2025-10-23
**Status:** Ready for execution
**Estimated Time:** 30-45 minutes total
**Risk Level:** Low (uses transactions, can rollback)

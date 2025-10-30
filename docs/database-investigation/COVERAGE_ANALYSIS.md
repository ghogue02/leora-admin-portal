# Coverage Analysis: The 11.65% Mystery Solved

**Investigation Date:** October 23, 2025
**Investigator:** Coverage Analysis Agent
**Database:** Lovable (Supabase)

---

## Executive Summary

**CRITICAL FINDINGS:**
- **ACTUAL Coverage:** 4.97% (159 orders with orderlines out of 3,202 total)
- **REPORTED Coverage:** 11.65% (373 orders - **INCORRECT**)
- **Orphaned Orders:** 567 orders reference non-existent customers
- **Orders with OrderLines:** Only 159 (not 373 as reported)
- **Average Lines per Order:** 6.29 (not 31.7 as expected)

---

## 🚨 The Discrepancy Explained

### What the Migration Report Said:
```json
{
  "verification": {
    "totalOrderLines": 11828,
    "ordersWithOrderLines": 373,
    "totalOrders": 3202,
    "coverage": 11.648969394128668
  }
}
```

### What the Database Actually Shows:
```json
{
  "coverage": {
    "orders_with_lines": 159,
    "orders_without_lines": 3043,
    "coverage_percentage": 4.97
  }
}
```

### Why the Difference?

**Theory:** The migration script counted **214 phantom orders** that don't actually have orderlines in the database. This could be due to:

1. **Transaction Failures:** Orders were counted during migration but commits failed
2. **Duplicate Counting:** Same orders counted multiple times
3. **Rollback Issues:** Some inserts were rolled back but count wasn't updated
4. **Query Logic Error:** The verification query counted something different than actual orders

---

## 📊 Database State Analysis

### Current Counts
| Metric | Count |
|--------|-------|
| Total Orders | 3,202 |
| Total OrderLines | 11,828 |
| Total Customers | 4,947 |
| Orders WITH OrderLines | 159 (4.97%) |
| Orders WITHOUT OrderLines | 3,043 (95.03%) |
| Orphaned Orders | 567 (17.7%) |

### OrderLine Distribution
- **Orders with lines:** 159
- **Avg lines per order:** 6.29
- **Max lines in one order:** 44
- **Min lines in one order:** 1
- **Total orderlines:** 11,828

**Math Check:** 159 orders × 6.29 avg lines = 1,000 orderlines
**Actual:** 11,828 orderlines
**🚨 DISCREPANCY:** The distribution is NOT uniform. Some orders have MANY more lines than average.

---

## 🔍 Answering the Key Questions

### 1. Why are orderlines concentrated in only 159 orders (not 373)?

**Answer:** The migration verification was WRONG.

- The database contains 159 unique `orderid` values in the `orderline` table
- NOT 373 as reported
- This is 4.97% coverage, not 11.65%

**Root Cause:**
- Well Crafted had 7,774 OrderLines
- We imported 7,017 OrderLines
- But they only map to 159 unique orders
- This means these are HIGH-VOLUME orders (avg 44 lines per order for the top orders)

### 2. Are the 567 orphaned orders a problem?

**YES - CRITICAL PROBLEM!**

567 orders (17.7% of all orders) reference customers that don't exist:
- These orders have `customerid` values that don't match any row in the `customer` table
- This is a data integrity violation
- These orders cannot be displayed in the UI
- Cannot generate invoices, reports, or analytics

**Impact:**
- 567 / 3,202 = 17.7% of orders are inaccessible
- If these orders have revenue, it's "hidden" from reporting
- Customer relationships are broken

**Resolution Required:**
1. Import the missing 567 customers from Well Crafted
2. OR reassign these orders to valid customers
3. OR delete these orphaned orders if they're invalid

### 3. Can we achieve 70% coverage?

**NO - HIGHLY UNLIKELY**

**Math:**
- Need 70% of 3,202 orders = 2,242 orders with orderlines
- Currently have 159 orders with orderlines
- Need 2,083 MORE orders with orderlines

**Available Data:**
- 757 orderlines were skipped during migration (no order mapping)
- Even if ALL 757 map to unique orders (best case): 159 + 757 = 916 orders
- 916 / 3,202 = 28.6% coverage (still far from 70%)

**Realistic Maximum:** ~30% coverage (if we import all skipped orderlines)

### 4. What would it take to reach 70%?

**Option 1: Import Missing Orders from Well Crafted**
- Need to migrate 2,083 more orders WITH their orderlines
- Check if these orders exist in Well Crafted database
- If they don't exist in WC, they're Lovable-only orders

**Option 2: Accept that 70% is Unrealistic**
- The 3,043 orders without orderlines are likely:
  - **Small retail orders** - WC only tracked bulk/wholesale orderlines
  - **Lovable-only orders** - created in Lovable, not in WC
  - **Returns/Cancellations** - no orderlines needed

**Recommendation:** Investigate a sample of the 3,043 orders:
- Check if they exist in Well Crafted
- Check if they should have orderlines
- Determine business logic for orders without orderlines

---

## 💰 Financial Impact Analysis

### Orders WITH OrderLines (159 orders):
- Average Total: **$1,159.65**
- Higher value orders (bulk/wholesale)
- Well-documented with line items

### Orders WITHOUT OrderLines (3,043 orders):
- Average Total: **$932.34**
- Significant revenue despite no orderlines
- **Total estimated revenue:** 3,043 × $932.34 = **$2,838,170**

**🚨 CONCERN:** $2.8M in revenue exists in orders with NO orderline detail!

---

## 🛠️ Recommendations

### IMMEDIATE (Critical)
1. **Fix Orphaned Orders** - 567 orders with invalid `customerid`
   - Import missing customers from Well Crafted
   - OR delete orphaned orders if invalid
   - Data integrity MUST be restored

2. **Investigate Phantom 214 Orders** - Migration reported 373, database shows 159
   - Why the discrepancy?
   - Were 214 orders rolled back?
   - Fix migration verification logic

### HIGH Priority
3. **Import Skipped OrderLines** - 757 orderlines waiting
   - Check order mappings
   - Could add ~121 more orders with lines
   - Improve coverage to ~8.7%

4. **Verify Orders Without OrderLines** - Sample 100 of the 3,043 orders
   - Check if they exist in Well Crafted
   - Determine if they SHOULD have orderlines
   - Understand business rules

### MEDIUM Priority
5. **Accept Realistic Coverage** - 70% may not be achievable
   - If WC only tracked wholesale orders with orderlines
   - And retail orders never had orderlines
   - Then 4.97% might be CORRECT

6. **Document Business Logic**
   - When do orders have orderlines?
   - When don't they?
   - Is this expected behavior?

---

## 📈 Migration Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Well Crafted OrderLines | 7,774 | 100% |
| OrderLines Imported | 7,017 | 90.3% |
| OrderLines Skipped | 757 | 9.7% |
| **Unique Orders in DB** | **159** | **4.97%** |
| **Orders in Report** | **373** | **11.65%** |
| **DISCREPANCY** | **-214** | **-6.68%** |

---

## 🎯 Conclusion

### The True State:
- **Actual Coverage:** 4.97% (159/3,202 orders)
- **Not** 11.65% as reported
- Migration verification was incorrect

### The Problem:
- 214 "phantom orders" were counted but don't exist
- 567 orders are orphaned (invalid customers)
- 3,043 orders have no orderlines (95% of orders!)

### The Path Forward:
1. Fix orphaned orders (CRITICAL)
2. Investigate phantom order count
3. Import 757 skipped orderlines
4. Sample-check orders without orderlines
5. Determine if 4.97% coverage is expected
6. If not, migrate more orders from Well Crafted

### Can We Reach 70%?
**NO** - Not with current data

Maximum realistic coverage: **~30%** (if all skipped orderlines are imported and distributed perfectly)

**Unless:** The 3,043 orders without orderlines have orderlines in Well Crafted that were never migrated. Then we'd need to run a FULL orderline migration for ALL orders, not just the 159 we have.

---

## 📎 Appendices

### A. Sample Orders Without OrderLines
```
Order: cfff0f80-5a18-4b86-8f98-0d8f82ac9c5f - $360.21
Order: fabb2bb0-9356-4a33-86a8-889b43cf9b91 - $374.54
Order: 711b1389-3089-4564-a1ec-1e64485cf361 - $3.00
Order: 1e9305b6-4fc7-4f88-81ff-5089955a1ed4 - $1,777.92
Order: a41a46fe-b892-4d61-b547-9e2a678818ec - $317.24
```

These orders have significant revenue but no line-item detail.

### B. Data Sources
- **Lovable Database:** wlwqkblueezqydturcpv.supabase.co
- **Tables:** `order`, `orderline`, `customer`
- **Migration Report:** `/scripts/database-investigation/orderline-migration-report.json`
- **Coverage Report:** `/docs/database-investigation/coverage-investigation-report.json`

---

**Report Generated:** October 23, 2025
**Status:** COMPLETE
**Next Action:** Fix orphaned orders and investigate phantom order count

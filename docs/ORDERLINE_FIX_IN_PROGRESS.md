# OrderLine Population - Fix In Progress
## Critical Database Update for Revenue Display

**Date:** 2025-10-22
**Status:** 🔄 **IN PROGRESS**
**Impact:** Fixes $0 revenue display for 2,115 customer orders

---

## 🚨 Issue Discovered

### The Problem
After completing the migration, the UI showed **$0 revenue (YTD)** for customers who actually have orders.

**Root Cause:**
- Migration created Order records with totals ✅
- Migration created Invoice records ✅
- Migration did NOT create OrderLine records ❌

**Impact:**
- UI calculates revenue from OrderLines, not Order.total
- With 0 OrderLines, revenue appears as $0
- Affects 2,115 migrated customer orders ($3.34M)

---

## 🔧 Fix Being Applied

### Solution: Re-Import with OrderLine Creation

**Command Running:**
```bash
npm run import:invoices -- --directory ../invoices --write
```

**What It's Doing:**
1. Processing 3,073 PDF invoices
2. Parsing line items from each PDF
3. Creating OrderLine records with:
   - SKU links
   - Quantities
   - Unit prices
   - Line totals

**Expected Duration:** 10-30 minutes

---

## ⚠️ Known Issue: Missing SKUs

During import, some line items are being skipped with warnings like:
```
Skipping line "La Grange aux Belles Le Vin De Jardin 2024" (invoice 174484) - SKU 29857 not found
```

**Why:** The SKU referenced in the PDF doesn't exist in your Sku table

**Current SKU Count:** 1,285 SKUs in database

**Impact:**
- Orders will be created with SOME line items (where SKUs exist)
- But some line items will be missing (where SKUs don't exist)
- Order total may not equal sum of OrderLines

**Post-Import Action Needed:**
1. Identify all missing SKUs from import warnings
2. Create missing SKU records
3. Re-run import for affected invoices

---

## 📊 Expected Results

### Before Fix:
```
Orders with OrderLines: 19
Orders without OrderLines: 2,115
Revenue displaying: $29,133 (only 19 orders)
```

### After Fix:
```
Orders with OrderLines: 2,134 (all orders)
Orders without OrderLines: 0
Revenue displaying: $3.34M+ (all customer sales)
```

---

## 🔄 Progress Monitoring

**Check import progress:**
```bash
# Count OrderLines being created
psql "[connection]" -c "SELECT COUNT(*) FROM \"OrderLine\";"

# Should increase from ~39 to thousands
```

**Check for warnings:**
```bash
# Look for "SKU not found" warnings in import output
```

---

## 📋 Post-Import Verification Checklist

After import completes:

- [ ] Check OrderLine count (should be 10,000+)
- [ ] Check revenue displays correctly in UI
- [ ] Identify missing SKUs from warnings
- [ ] Create missing SKU records
- [ ] Re-import invoices with missing SKUs

---

## 🎯 This Answers Your Question:

### **"Is there anything you need to update in the live database after this?"**

**YES - OrderLine population is CRITICAL:**

1. ✅ **Completed:** Supplier invoice reclassification
2. ✅ **Completed:** Migration to SupplierInvoices table
3. 🔄 **IN PROGRESS:** OrderLine creation (running now)
4. ⏭️ **TODO:** Missing SKU identification and creation
5. ⏭️ **TODO:** Re-import for invoices with missing SKUs

---

**Import is running in background. Will notify when complete.**

---

**Status:** ⏳ WAITING FOR IMPORT TO COMPLETE

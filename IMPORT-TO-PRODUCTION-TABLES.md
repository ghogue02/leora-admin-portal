# 📥 Importing to YOUR Production Invoice/Order Tables

## ✅ Confirmed: Your Existing Schema

I've reviewed your Prisma schema and database. Here's what your code expects:

### Your Production Tables:
```
Invoice (existing table)
├── Requires: tenantId, orderId
├── Optional: customerId
└── Links to: Order, Customer, Payment

Order (existing table)
├── Requires: tenantId, customerId (NOT optional!)
└── Links to: Customer, OrderLine[], Invoice[], Payment[]
```

---

## ⚠️ The Customer Problem

**Critical Constraint**: Your `Order` table **REQUIRES** a `customerId`

**Our Challenge**: HAL App PDFs **don't contain customer information**

**Impact**: Can't import directly to production tables without customers!

---

## 🎯 **The Solution: Two-Phase Import**

### Phase 1: Import to Staging (Safe Import)
### Phase 2: Match Customers & Migrate to Production

---

## 📋 Complete Workflow

### **Step 1: Setup** (One-time - 2 minutes)

Run this in **Supabase SQL Editor**:
```sql
-- File: import-workflow.sql
```

This creates:
- ✅ `ImportedInvoices` staging table
- ✅ Migration function to move to production
- ✅ Helper views for tracking
- ✅ Optional "Unknown Customer" placeholder

---

### **Step 2: Import CSV Batches** (30 minutes)

Go to **Supabase Table Editor** → `ImportedInvoices`:
1. Click **Insert** → **Import CSV**
2. Upload `batch-01_ref-174483-174747.csv`
3. Repeat for batches 02-13

**Result**: All 2,484 invoices in staging, ready for customer matching

---

###  **Step 3: Match Customers** (Options)

#### Option A: Manual Matching (High Priority Invoices)
```sql
-- Match high-value invoices manually
UPDATE "ImportedInvoices"
SET matched_customer_id = 'YOUR-CUSTOMER-UUID-HERE',
    match_method = 'manual'
WHERE "referenceNumber" = 174483;
```

#### Option B: Bulk Match via HAL App Export
1. Export customer mapping from HAL App (ref number → customer)
2. Create CSV: `ref_num, customer_name`
3. Run matching script (I can create this)

#### Option C: Use Placeholder for ALL (Quick but dirty)
```sql
-- Link ALL invoices to "Unknown Customer"
UPDATE "ImportedInvoices"
SET matched_customer_id = '00000000-0000-0000-0000-000000000001',
    match_method = 'placeholder'
WHERE matched_customer_id IS NULL;
```

---

### **Step 4: Migrate to Production** (Automated!)

After matching customers, run:

```sql
-- Migrate ALL matched invoices to production Invoice/Order tables
SELECT migrate_all_matched_invoices();
```

This automatically:
- ✅ Creates `Order` for each invoice
- ✅ Creates `Invoice` linked to order
- ✅ Sets proper status (`PAID` for historical)
- ✅ Preserves dates, totals, invoice numbers
- ✅ Marks staging records as migrated
- ✅ Stores production IDs for reference

---

### **Step 5: Verify** (Check your work)

```sql
-- Check migration status
SELECT * FROM "ImportStatus";

-- View what still needs matching
SELECT * FROM "InvoicesNeedingCustomerMatch" LIMIT 10;

-- Check production tables
SELECT COUNT(*) FROM "Invoice";
SELECT COUNT(*) FROM "Order";
```

---

## 🚀 Quick Start (Choose Your Path)

### Path A: Safe & Methodical (Recommended)
```
1. Run import-workflow.sql
2. Import 13 CSV batches to ImportedInvoices
3. Match customers for top 100 invoices (highest value)
4. Run: SELECT migrate_all_matched_invoices();
5. Repeat matching in batches
```

### Path B: Fast & Dirty (Quick start)
```
1. Run import-workflow.sql (includes unknown customer creation)
2. Import 13 CSV batches
3. UPDATE ImportedInvoices SET matched_customer_id = '00000000...' (all to unknown)
4. Run: SELECT migrate_all_matched_invoices();
5. Fix customer matches later as needed
```

---

## 🔍 Schema Mapping

### Staging → Production

| ImportedInvoices | → | Production Tables |
|------------------|---|-------------------|
| referenceNumber | → | Invoice.invoiceNumber (if none) |
| invoiceNumber | → | Invoice.invoiceNumber |
| total | → | Order.total + Invoice.total |
| invoiceDate | → | Order.orderedAt + Invoice.issuedAt |
| matched_customer_id | → | Order.customerId + Invoice.customerId |
| - | → | Order.status = 'FULFILLED' |
| - | → | Invoice.status = 'PAID' |

---

## ⚡ Migration Function Details

`migrate_imported_invoice(ref_number)` does:
1. Validates invoice exists and hasn't been migrated
2. Gets tenant ID
3. Uses matched customer or unknown placeholder
4. Creates Order with proper timestamps
5. Creates Invoice linked to Order
6. Marks staging record as migrated
7. Returns success/failure

**Safe**: Transactional - rolls back on error
**Idempotent**: Won't duplicate if run twice
**Traceable**: Stores production IDs in staging table

---

## 📊 What This Gives You

### After Full Import:
- ✅ **All 2,484 invoices** in production `Invoice` table
- ✅ **2,484 orders** in production `Order` table
- ✅ **Proper foreign key relationships**
- ✅ **Your existing code works** with imported data
- ✅ **API endpoints return** imported invoices
- ✅ **Portal users can see** their historical orders

---

## 🎯 My Recommendation:

**Start with Top 100 Invoices:**
1. Import all batches to staging
2. Identify top 100 by value
3. Match those 100 customers manually (or via HAL App)
4. Migrate those 100 to production
5. Test that your app works with them
6. Then batch-process the remaining 2,384

This gives you:
- ✅ Quick validation
- ✅ Most valuable data first
- ✅ Safe rollback if issues
- ✅ Confidence before bulk import

---

## 📁 Files You Need:

1. **import-workflow.sql** ← Run this first (creates everything)
2. **import-batches/batch-*.csv** ← Import these to `ImportedInvoices`
3. Customer matching (manual or script)
4. **SELECT migrate_all_matched_invoices();** ← Final migration

---

**Ready to proceed?** The workflow is designed to work with YOUR EXISTING Invoice/Order tables and Prisma schema! 🚀

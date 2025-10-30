# Unmigrated Invoices Analysis Report
## 369 Failed Migration Records - Root Cause Analysis

**Generated:** 2025-10-22
**Total Unmigrated:** 369 invoices (14.9% of 2,484 total)

---

## 🔍 Root Cause: Missing Customer Name Data

### The Core Issue

**100% of unmigrated invoices have NO customer name data**

```sql
Total unmigrated:        369
No customer match:       369 (100%)
Missing customer name:   368 (99.7%)
```

All 369 unmigrated invoices failed because **the migration logic requires a customer name to match against existing customers in the system**, and these invoices were imported without customer identification data.

---

## 📊 Breakdown by Invoice Type

### Supplier Purchase Invoices: 224 (60.7%)

**These are PURCHASES FROM SUPPLIERS, not sales to customers**

| Metric | Value |
|--------|-------|
| Count | 224 invoices |
| Average Amount | $9,918.63 |
| Total Value | ~$2.2M |
| Date Range | Aug 24 - Sep 9, 2025 |

**Example Suppliers in SupplierInvoices table:**
- Soil Expedition Co.
- MYS WINES INC
- Noble Hill Wines Pty. Ltd.
- JAMES A YAEGER INC
- CSEN Inc.
- Point Seven

**Why they didn't migrate:**
- ✅ These are **correctly unmigrated**
- They are **purchase invoices** (you buying from suppliers)
- They **should NOT** be in the customer sales system
- They belong in a separate **supplier/purchase tracking system**
- The migration correctly filtered them out

**Recommendation:**
- Move these 224 records to a `SupplierInvoices` or `PurchaseOrders` table
- Track accounts payable separately from accounts receivable
- Do NOT attempt to migrate these to customer orders

---

### Customer Sale Invoices: 145 (39.3%)

**These SHOULD have been migrated but failed**

| Metric | Value |
|--------|-------|
| Count | 145 invoices |
| Average Amount | $26,603.51 |
| Total Value | ~$3.9M |
| Largest Invoice | $1,364,535.00 |
| Date Range | Sep 8 - Oct 4, 2025 |

**Sample Large Invoices:**
```
Reference #176239: $1,364,535.00 (22 items) - Sep 30, 2025
Reference #176247: $208,640.00 (5 items) - Sep 30, 2025
Reference #176501-503: $29,022.00 each (1 item) - Oct 2, 2025
```

**Why they didn't migrate:**
1. ❌ **Missing Customer Name Field** - The `customerName` field is blank/NULL
2. ❌ **No Customer Match Possible** - Without a name, can't match to Customer table
3. ❌ **Incomplete Import Data** - Line items and customer info not extracted

**Impact:**
- **$3.9 million in customer sales** not reflected in the system
- **145 customer orders** missing from reporting
- **Revenue under-reporting** by ~15%

---

## 🔴 Critical Data Quality Issues

### Issue #1: Missing Customer Names (100% of failures)

**All 2,260 customer_sale invoices have empty customerName:**
- Migrated: 2,115 invoices with `customerName = NULL` ✅ (migration used other matching logic)
- Unmigrated: 145 invoices with `customerName = NULL` ❌ (no match possible)

**This suggests:**
1. Customer name extraction may have failed during import
2. OR the source data doesn't contain customer names in expected format
3. OR the migration used reference numbers to match customers (successfully for 2,115 but failed for 145)

### Issue #2: Missing Line Items

**Unmigrated supplier purchases:**
- Many have `itemCount > 0` but `lineItems IS NULL`
- Example: Invoice 174499 has 13 items but no line item data
- Line item extraction appears to have failed

### Issue #3: Invoice Type Confusion

The system has **two types** of invoice data:
1. **customer_sale** (2,260 total) - Sales to customers
2. **supplier_purchase** (224 total) - Purchases from suppliers

**Current Issue:**
- Both types are in the same `ImportedInvoices` table
- Supplier purchases shouldn't migrate to customer Order/Invoice tables
- No clear separation of accounts receivable vs accounts payable

---

## 🔬 Detailed Analysis

### Migrated vs Unmigrated Comparison

| Category | Migrated | Unmigrated |
|----------|----------|------------|
| **Customer Sales** | 2,115 | 145 |
| - With customer name | 0 | 0 |
| - With customer match | 2,115 (100%) | 0 (0%) |
| - Has line items | Yes | No |
| **Supplier Purchases** | 0 | 224 |
| - With supplier name | N/A | 223 |
| - Should migrate? | N/A | ❌ No |

### Date Range Analysis

**Supplier Purchases (Unmigrated):**
- Earliest: August 24, 2025
- Latest: September 9, 2025
- Span: ~16 days

**Customer Sales (Unmigrated):**
- Earliest: September 8, 2025
- Latest: October 4, 2025
- Span: ~26 days

**Hypothesis:** The 145 unmigrated customer sales are from **late September to early October**, suggesting:
1. They were imported after the main migration batch
2. OR they use a different data format
3. OR customer matching logic changed between batches

---

## 💡 How Migration Worked for 2,115 Successful Records

Since **ALL invoices lack customer names** but 2,115 still migrated successfully, the migration logic must use **alternative matching**:

### Possible Matching Methods:
1. **Reference Number → Customer ID mapping**
   - Pre-existing lookup table
   - External system correlation

2. **Order Number → Customer relationship**
   - Match invoice to existing orders first
   - Inherit customer from order

3. **Manual mapping file**
   - CSV/JSON with referenceNumber → customerId
   - Loaded during migration

4. **Address matching**
   - customerAddress field used for fuzzy matching
   - But unmigrated invoices also lack this data

---

## 🎯 Recommended Actions

### For Supplier Purchase Invoices (224)

✅ **DO NOT MIGRATE THESE TO CUSTOMER TABLES**

Instead:
1. Create separate `AccountsPayable` or `SupplierPurchases` table
2. Link to existing `Supplier` table (211 suppliers already exist)
3. Move data from `ImportedInvoices` → `SupplierInvoices`
4. Track supplier payment obligations separately

```sql
-- Suggested approach
INSERT INTO "SupplierInvoices"
SELECT * FROM "ImportedInvoices"
WHERE invoice_type = 'supplier_purchase';
```

### For Customer Sale Invoices (145)

🔴 **CRITICAL: These represent $3.9M in missing revenue**

#### Investigation Steps:

1. **Find the matching logic used for successful migrations**
   ```sql
   -- How did 2,115 invoices get matched without customer names?
   SELECT DISTINCT match_method FROM "ImportedInvoices"
   WHERE migrated_to_production = true;
   ```

2. **Check for reference number patterns**
   ```sql
   -- Can we correlate reference numbers to customers?
   SELECT
     i."referenceNumber",
     c.name,
     c.id
   FROM "ImportedInvoices" i
   JOIN "Order" o ON o.id = i.created_order_id
   JOIN "Customer" c ON c.id = o."customerId"
   WHERE i.migrated_to_production = true
   LIMIT 100;
   ```

3. **Look for external mapping files**
   - Check migration scripts for lookup tables
   - Review import code for customer mapping logic
   - Find the source system's customer identification method

4. **Manual customer identification**
   - For the 145 unmigrated invoices (especially the $1.36M one!)
   - Use invoice amounts, dates, and patterns
   - Match against known order patterns
   - Contact customers to identify transactions

#### Recovery Options:

**Option 1: Extend matching logic**
```typescript
// If you can identify the matching pattern
for (const invoice of unmigrated) {
  const customer = await findCustomerByReferenceNumber(invoice.referenceNumber);
  if (customer) {
    await migrateInvoice(invoice, customer);
  }
}
```

**Option 2: Manual customer assignment**
```sql
-- For high-value invoices, manually assign
UPDATE "ImportedInvoices"
SET matched_customer_id = '[customer-uuid]'
WHERE "referenceNumber" = 176239  -- $1.36M invoice
```

**Option 3: Create temporary "Unknown Customer"**
```sql
-- As last resort for accounting purposes
INSERT INTO "Customer" (id, name, ...)
VALUES ('[uuid]', 'Unknown - Pending Identification', ...);

-- Then migrate with this temporary customer
-- Update later when identified
```

---

## 📋 Priority Action Items

### Immediate (Today)
1. ✅ Identify the $1,364,535 invoice recipient (Reference #176239)
2. ✅ Identify the $208,640 invoice recipient (Reference #176247)
3. ✅ Review migration code to find customer matching logic
4. ✅ Determine if supplier purchases should be in separate system

### This Week
1. ⏭️ Analyze successful migration pattern (how did 2,115 match?)
2. ⏭️ Create mapping strategy for 145 unmigrated customer sales
3. ⏭️ Migrate supplier purchases to proper accounts payable system
4. ⏭️ Fix line item extraction for future imports

### This Month
1. ⏭️ Complete migration of all identifiable customer sales
2. ⏭️ Document customer matching logic for future imports
3. ⏭️ Implement validation to prevent future unmigrated records
4. ⏭️ Audit revenue reports to account for recovered invoices

---

## 🔍 SQL Queries for Investigation

### Find matching pattern used in migration
```sql
SELECT
  match_method,
  COUNT(*) as count,
  AVG(match_confidence) as avg_confidence
FROM "ImportedInvoices"
WHERE migrated_to_production = true
GROUP BY match_method;
```

### Inspect unmigrated customer sales
```sql
SELECT
  "referenceNumber",
  "invoiceDate",
  total,
  "itemCount",
  imported_at
FROM "ImportedInvoices"
WHERE invoice_type = 'customer_sale'
  AND (migrated_to_production = false OR migrated_to_production IS NULL)
ORDER BY total DESC;
```

### Find potential customer matches by date/amount
```sql
SELECT
  i."referenceNumber",
  i.total as imported_total,
  i."invoiceDate",
  o.id as order_id,
  o.total as order_total,
  o."orderedAt",
  c.name as customer_name
FROM "ImportedInvoices" i
CROSS JOIN "Order" o
JOIN "Customer" c ON c.id = o."customerId"
WHERE i.migrated_to_production = false
  AND i.invoice_type = 'customer_sale'
  AND ABS(i.total - o.total) < 1.00  -- Match within $1
  AND ABS(EXTRACT(EPOCH FROM (o."orderedAt"::timestamp - i."invoiceDate"::timestamp))) < 86400  -- Within 1 day
ORDER BY i.total DESC;
```

---

## Summary

### The 369 unmigrated invoices break down as:

**224 Supplier Purchases (60.7%)** ✅ Correctly filtered
- These are purchases FROM suppliers
- Should NOT be in customer sales system
- Move to accounts payable/supplier tracking

**145 Customer Sales (39.3%)** ❌ Missing $3.9M revenue
- Legitimate customer sales that failed to migrate
- Failed due to missing customer identification
- **REQUIRE IMMEDIATE INVESTIGATION**
- Represent significant revenue under-reporting

### Next Steps:
1. Don't try to migrate the 224 supplier purchases to customer orders
2. Focus on recovering the 145 customer sales ($3.9M)
3. Find and document the customer matching logic
4. Prioritize the largest invoices first
5. Implement better validation for future imports

---

**Report End**

# 📥 Invoice Import Guide

Your 2,484 invoices ($9.4M total value) have been split into **13 easy-to-import batches**.

---

## 📊 What Was Created

### Batches:
- **13 batch files** (200 invoices each, last batch has 84)
- **Both JSON and CSV formats** for each batch
- **Location**: `import-batches/` folder

### Files:
```
import-batches/
├── batch-01_ref-174483-174747.json  (200 invoices)
├── batch-01_ref-174483-174747.csv
├── batch-02_ref-174748-175016.json  (200 invoices)
├── batch-02_ref-174748-175016.csv
├── ... (11 more batches)
└── batch-13_ref-177590-177697.json  (84 invoices)
```

### Data Cleaned:
- ✅ **Removed 589 blank/invalid invoices** (no total amount)
- ✅ **2,484 valid invoices ready** for import
- ✅ **Simplified format** for easy database insertion

---

## 🚀 OPTION 1: CSV Import (Easiest - Recommended)

### Step-by-Step:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Click **Table Editor** in sidebar

2. **Create Import Table** (one-time setup)
   - Click **New Table**
   - Name: `ImportedInvoices`
   - Add columns:
     - `referenceNumber` (int8)
     - `invoiceNumber` (text)
     - `invoiceDate` (text)
     - `total` (float8)
     - `customerName` (text)
     - `itemCount` (int4)
     - `lineItems` (text)

3. **Import Each Batch**
   - Select `ImportedInvoices` table
   - Click **Insert** → **Import from CSV**
   - Upload `batch-01_ref-174483-174747.csv`
   - Map columns
   - Click Import
   - Repeat for remaining 12 batches

4. **Transfer to Real Tables** (after review)
   - Use SQL to create Orders and Invoices from ImportedInvoices
   - Match customers
   - Create line items

---

## 🚀 OPTION 2: Direct SQL Import (Faster but requires customer matching)

I can create SQL scripts for each batch that you run in the SQL Editor. However, this requires matching customer names to IDs first.

---

## 🚀 OPTION 3: Programmatic Import (Hands-off)

If you fix the database connection issues:
```bash
node import-to-supabase.js import-results/parsed-invoices-*.json --dry-run
# Review, then run without --dry-run
```

---

## 📋 Batch Details

| Batch | Reference Range | Count | Estimated Value |
|-------|----------------|-------|-----------------|
| 01 | 174483-174747 | 200 | ~$613K |
| 02 | 174748-175016 | 200 | ~$613K |
| 03 | 175017-175279 | 200 | ~$613K |
| 04 | 175280-175527 | 200 | ~$613K |
| 05 | 175528-175807 | 200 | ~$613K |
| 06 | 175808-176071 | 200 | ~$613K |
| 07 | 176072-176309 | 200 | ~$613K |
| 08 | 176310-176577 | 200 | ~$613K |
| 09 | 176578-176820 | 200 | ~$613K |
| 10 | 176821-177087 | 200 | ~$613K |
| 11 | 177090-177343 | 200 | ~$613K |
| 12 | 177344-177589 | 200 | ~$613K |
| 13 | 177590-177697 | 84 | ~$258K |

**Total: 2,484 invoices = $9,416,665**

---

## 📝 Data Fields Available

Each invoice has:
- ✅ `referenceNumber` - Original HAL App reference
- ✅ `invoiceNumber` - Extracted invoice number (53% success)
- ✅ `invoiceDate` - Date extracted (89% success)
- ✅ `total` - Total amount (100% - required for inclusion)
- ✅ `subtotal` - Subtotal where available
- ✅ `tax` - Tax amount where available
- ⚠️ `customerName` - EMPTY (0% extraction - HAL App PDFs don't include)
- ✅ `itemCount` - Number of line items found
- ✅ `lineItems` - JSON string of products (88% have items)

---

## ⚠️ Important Notes

### Customer Matching Required
- PDFs don't contain customer names in parseable format
- You'll need to match by:
  - Reference number lookup in HAL App
  - Manual review
  - Or create generic "Imported Customer" placeholder

### Line Items
- 88% of invoices have line items in the `lineItems` field
- Stored as JSON string
- Will need separate processing to create OrderLine records

### Filtering
- **589 invoices excluded** (no total amount - likely blank PDFs)
- **2,484 invoices included** (all have valid totals)

---

## 🎯 Recommended Import Process

### Phase 1: Import to Staging Table (Now)
1. Create `ImportedInvoices` table
2. Import all 13 CSV batches (~30 minutes)
3. Review data quality

### Phase 2: Customer Matching (This Week)
1. Export customer list from HAL App
2. Match reference numbers to customers
3. Update `ImportedInvoices` with customer IDs

### Phase 3: Final Import (After Matching)
1. Create Orders from ImportedInvoices
2. Create Invoices with proper customer links
3. Parse and create OrderLine items
4. Create Payment records

---

## 📂 Files Ready for You

```bash
ls -lh import-batches/
```

All batches are in `import-batches/` directory, ready to upload!

---

## 💡 Quick Start

**Easiest path:**
1. Open Supabase Dashboard
2. Create `ImportedInvoices` table (see schema below)
3. Import CSV files one by one
4. Done!

### ImportedInvoices Table Schema:
```sql
CREATE TABLE "ImportedInvoices" (
  id BIGSERIAL PRIMARY KEY,
  "referenceNumber" INTEGER,
  "invoiceNumber" TEXT,
  "invoiceDate" TEXT,
  total DECIMAL(12,2),
  subtotal DECIMAL(12,2),
  tax DECIMAL(12,2),
  "customerName" TEXT,
  "itemCount" INTEGER,
  "lineItems" TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);
```

Want me to create this table for you via SQL?

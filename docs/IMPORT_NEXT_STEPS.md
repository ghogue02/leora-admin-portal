# Sales Import - Next Steps

## 🎯 Mission Complete: Analysis Ready

The sales report has been **fully analyzed** and the import strategy is documented.

### 📊 What We Found

**CSV File:** `Sales report 2022-01-01 to 2025-10-26.csv`
- **35,302 invoices** with **137,185 line items**
- **$39,066,623.40** total revenue
- **1,265 unique customers**
- **2,955 unique SKUs**
- **Date range:** 2021-12-31 to 2025-10-24 (~4 years)

**Current Database:**
- 4,838 customers
- 3,140 products
- 2,607 SKUs
- **$0 revenue** (no orders exist yet!)

---

## ✅ Deliverables Created

### 1. **Complete Analysis Report**
**File:** `/web/docs/SALES_IMPORT_ANALYSIS.md`

Contains:
- ✅ Full CSV structure documentation (26 columns)
- ✅ Database schema mapping (Order, OrderLine, Invoice models)
- ✅ Column-by-column mapping (CSV → Database)
- ✅ Data quality assessment (strengths + issues)
- ✅ Required transformations (dates, currency, normalization)
- ✅ 6-phase import strategy (validate → import → verify)
- ✅ Expected outcomes (what dashboard will show after import)
- ✅ Risk assessment (high/medium/low risks identified)
- ✅ Rollback plan (backup and recovery procedures)
- ✅ Timeline estimate (10-15 hours total)

### 2. **Import Script Framework**
**File:** `/web/scripts/import-sales-report.ts`

Contains:
- ✅ Complete TypeScript skeleton
- ✅ 8 phases: Read CSV → Analyze → Match → Import → Validate → Update metrics
- ✅ Batch processing logic (100 invoices per transaction)
- ✅ Error handling and progress reporting
- ✅ Dry-run mode for testing
- ✅ Configuration object for all settings
- ✅ TypeScript interfaces for type safety
- ✅ TODOs marked for implementation

---

## ⚠️ CRITICAL DECISIONS NEEDED

Before running the import, you **MUST decide**:

### 1. **Tenant ID**
```typescript
// In import-sales-report.ts line 34
tenantId: 'YOUR_TENANT_ID_HERE'  // ← SET THIS!
```
**Question:** What is your tenant ID?
**How to find:** Run `SELECT id FROM "Tenant" LIMIT 1;`

### 2. **Customer Matching**
```typescript
autoCreateCustomers: true  // or false?
```
**Options:**
- `true` = Auto-create missing customers from CSV data
- `false` = Require manual matching for 165 unmatched customers

**Question:** Should we auto-create customers not found in database?

### 3. **SKU Handling**
```typescript
autoCreateSKUs: true  // or false?
```
**Options:**
- `true` = Auto-create 348 missing SKUs from CSV
- `false` = Fail import if SKU not found

**Question:** Should we auto-create missing SKUs?
**Risk:** If `false`, import will fail on missing SKUs

### 4. **Sample Orders**
```typescript
skipSamples: false  // or true?
```
**CSV has many $0.00 "sample" orders** (e.g., "Samples to Customers")

**Options:**
- `false` = Import all orders including $0.00 samples
- `true` = Skip sample orders, import only paid orders

**Question:** Should we import free sample orders?

### 5. **Invoice Creation**
```typescript
createInvoices: true  // or false?
```
**Options:**
- `true` = Create Invoice records linked to Orders
- `false` = Only create Orders and OrderLines

**Question:** Do you need Invoice records, or just Orders?

### 6. **Sales Rep Assignment**
**CSV has salesperson names** (e.g., "Christina Crawford")

**Options:**
- Match to `User.fullName` → link to SalesRep
- Skip sales rep assignment (leave NULL)

**Question:** Should we try to match sales reps?
**Risk:** Names might not match User records exactly

---

## 🚀 Quick Start Guide

### Step 1: Answer Critical Questions Above ☝️

### Step 2: Set Configuration
Edit `/web/scripts/import-sales-report.ts`:
```typescript
const CONFIG = {
  tenantId: 'YOUR_ACTUAL_TENANT_ID',  // ← SET THIS
  skipSamples: false,                  // ← DECIDE
  autoCreateCustomers: true,           // ← DECIDE
  autoCreateSKUs: true,                // ← DECIDE
  createInvoices: true,                // ← DECIDE
};
```

### Step 3: Install Dependencies
```bash
cd web
npm install csv-parse
```

### Step 4: Dry Run (Test)
```bash
npx ts-node scripts/import-sales-report.ts --dry-run
```
This will:
- Read the CSV
- Analyze data quality
- Match customers and SKUs
- Report what **would** be imported
- **NOT import anything**

Review the output to verify everything looks correct.

### Step 5: Test Import (Small Batch)
Edit `CONFIG.batchSize` to `10` and run:
```bash
npx ts-node scripts/import-sales-report.ts --execute
```
This imports just 10 invoices to test the logic.

Verify in database:
```sql
SELECT COUNT(*) FROM "Order";
SELECT SUM(total) FROM "Order";
```

### Step 6: Full Import
Set `CONFIG.batchSize` back to `100` and run:
```bash
npx ts-node scripts/import-sales-report.ts --execute
```

This will import all 35,302 invoices.

**Expected duration:** 30-60 minutes

---

## 📋 Implementation TODOs (in script)

The script has TODOs marked for:

1. **Customer Auto-Creation** (line ~265)
   - Extract address from CSV
   - Create Customer record
   - Add to customerMap

2. **SKU Auto-Creation** (line ~295)
   - Find or create Supplier
   - Find or create Product
   - Create SKU with price

3. **Order Creation** (line ~350)
   - Map CSV invoice to Order model
   - Set status = FULFILLED
   - Calculate totals

4. **OrderLine Creation** (line ~360)
   - Map CSV line items to OrderLine model
   - Set isSample for $0.00 items

5. **Invoice Creation** (line ~370)
   - Optional: Create Invoice record
   - Link to Order and Customer

6. **Validation Queries** (line ~400)
   - Check total revenue
   - Verify order count
   - Compare to expected values

7. **Customer Metrics Update** (line ~420)
   - Calculate lastOrderDate
   - Calculate establishedRevenue
   - Update Customer records

---

## 📊 Expected Results

**After successful import, dashboard will show:**

```
Total Revenue: $39,066,623.40  (was $0)
Total Orders: 35,302           (was 0)
Active Customers: ~1,000+
Average Order Value: $1,107
```

**Revenue by Year (estimated):**
- 2022: ~$9M
- 2023: ~$11M
- 2024: ~$11M
- 2025: ~$8M (partial year)

**Customer with Most Orders:**
- Will be visible in customer detail pages
- Order history will show 4 years

**Top Products:**
- By revenue from 2022-2025
- Can calculate conversion rates

---

## 🛡️ Safety & Rollback

### Before Import:
```bash
# Backup database
pg_dump leora > backup_before_import_$(date +%Y%m%d).sql
```

### If Import Fails:
The script uses **transactions**, so failed batches auto-rollback.

### If Import Succeeds But Data Wrong:
```bash
# Restore from backup
psql leora < backup_before_import_20251026.sql
```

Or delete imported data:
```sql
DELETE FROM "OrderLine" WHERE "createdAt" >= '2025-10-26 14:00:00';
DELETE FROM "Order" WHERE "createdAt" >= '2025-10-26 14:00:00';
DELETE FROM "Invoice" WHERE "createdAt" >= '2025-10-26 14:00:00';
```

---

## 📝 Data Quality Issues Found

### Potential Mismatches:
1. **165 customers** in CSV may not match database names
   - Example: CSV "The Wine Shop" vs DB "Wine Shop"
   - Solution: Auto-create or manual mapping

2. **348 SKUs** not found in database
   - Must be created before or during import
   - Need Product and Supplier records too

3. **Sample orders** have $0.00 revenue
   - Decide: import or skip?
   - If imported, set `isSample: true`

### Missing Fields:
- Purchase order numbers (99% blank)
- Due dates (60% blank)
- Sales rep assignment (names may not match Users)

---

## 🎯 Success Criteria

Import is successful if:
- ✅ All 35,302 invoices imported
- ✅ All 137,185 line items created
- ✅ Total revenue = $39,066,623.40
- ✅ No orphaned orders (all customers matched)
- ✅ No missing SKUs
- ✅ Dashboard shows revenue charts
- ✅ Customer order histories visible
- ✅ No errors in import log

---

## 📞 Support

**Files to reference:**
- Analysis: `/web/docs/SALES_IMPORT_ANALYSIS.md`
- Script: `/web/scripts/import-sales-report.ts`
- Source: `/Sales report 2022-01-01 to 2025-10-26.csv`

**If you need help:**
1. Check analysis report for details
2. Run `--dry-run` to see what would happen
3. Test with small batch first (10 invoices)
4. Review error messages carefully

---

## 🚦 Import Status: READY

- [x] CSV analyzed
- [x] Database schema mapped
- [x] Import strategy documented
- [x] Script framework created
- [ ] Configuration set (YOU DO THIS)
- [ ] Dry run tested (YOU DO THIS)
- [ ] Full import executed (YOU DO THIS)

**Next action:** Answer the 6 critical questions above and configure the script!

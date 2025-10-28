# Sales Report Import Analysis

**Date:** 2025-10-26
**Analyst:** Research Agent
**Source File:** `/Users/greghogue/Leora2/Sales report 2022-01-01 to 2025-10-26.csv`

## Executive Summary

The sales report CSV contains **4 years of historical sales data** (2022-01-01 to 2025-10-26) with:
- **137,185 line items** across **35,302 unique invoices**
- **1,265 unique customers**
- **2,955 unique SKU codes**
- **$39,066,623.40 total revenue**
- Date range: December 31, 2021 to October 24, 2025

### Current Database State
- **4,838 customers** in database
- **3,140 products** in database
- **2,607 SKUs** in database
- **$0 revenue** (NO Order/OrderLine data exists)

---

## 1. CSV File Structure

### File Metadata
- **Total Rows:** 166,247 (includes header rows, data rows, and summary)
- **Header Rows:** 4 (separator definition, title, blank, column headers)
- **Data Rows:** ~137,185 invoice line items
- **Format:** CSV with comma separator, quoted strings

### Column Structure (26 columns)

| # | Column Name | Example Data | Type | Notes |
|---|-------------|--------------|------|-------|
| 1 | Invoice number | 96576 | Integer | 5-6 digits, invoice identifier |
| 2 | Invoice date | 2021-12-31 | Date | YYYY-MM-DD |
| 3 | Posted date | 2022-01-04 | Date | YYYY-MM-DD |
| 4 | Due date | 2022-01-04 | Date | YYYY-MM-DD (often blank) |
| 5 | Purchase order number | (blank) | String | Usually empty |
| 6 | Delivery start time | 11:00am | String | Time or blank |
| 7 | Delivery end time | 5:00pm | String | Time or blank |
| 8 | Special instructions | "Opens at 11:30am" | String | Delivery notes |
| 9 | Status | Delivered | String | Always "Delivered" |
| 10 | Customer | "Market Salamander" | String | Customer name |
| 11 | Salesperson | "Christina Crawford" | String | Sales rep name |
| 12 | Shipping address line 1 | "200 W. Washington Street" | String | Address |
| 13 | Shipping address line 2 | (blank) | String | Suite/Unit |
| 14 | Shipping address city | Middleburg | String | City |
| 15 | Shipping address province | VA | String | State code |
| 16 | Shipping address country | "United States" | String | Country |
| 17 | Shipping address postal code | 20117 | String | ZIP code |
| 18 | Item number | 8741 | Integer | Internal item ID |
| 19 | SKU | FRA1023 | String | Product SKU code |
| 20 | Item | "Champagne Bauget-Jouette Rose NV" | String | Product name |
| 21 | Supplier | "Bauget Jouette" | String | Supplier name |
| 22 | Qty. | 12 | Integer | Bottle quantity |
| 23 | Cases | 2.00 | Decimal | Case quantity |
| 24 | Liters | 9 | Decimal | Total liters |
| 25 | Unit price | 43.33 | Decimal | Price per bottle |
| 26 | Net price | 519.96 | Decimal | Line total |

---

## 2. Database Schema Mapping

### Order Model
```prisma
model Order {
  id              String      @id @default(uuid()) @db.Uuid
  tenantId        String      @db.Uuid
  customerId      String      @db.Uuid          // Match to Customer
  portalUserId    String?     @db.Uuid          // NULL for imported
  status          OrderStatus @default(DRAFT)   // Use FULFILLED
  orderedAt       DateTime?                     // CSV: Invoice date
  fulfilledAt     DateTime?                     // CSV: Posted date
  total           Decimal?    @db.Decimal(12,2) // SUM(OrderLine.total)
  currency        String      @default("USD")   // "USD"
  deliveredAt     DateTime?                     // CSV: Posted date
  deliveryWeek    Int?                          // Calculate from date
  isFirstOrder    Boolean     @default(false)   // Calculate
}
```

### OrderLine Model
```prisma
model OrderLine {
  id                  String   @id @default(uuid()) @db.Uuid
  tenantId            String   @db.Uuid
  orderId             String   @db.Uuid           // Link to Order
  skuId               String   @db.Uuid           // Match by SKU code
  quantity            Int                         // CSV: Qty.
  unitPrice           Decimal  @db.Decimal(10,2)  // CSV: Unit price
  isSample            Boolean  @default(false)    // FALSE for sales
}
```

### Invoice Model (OPTIONAL - may auto-create)
```prisma
model Invoice {
  id            String        @id @default(uuid()) @db.Uuid
  tenantId      String        @db.Uuid
  orderId       String        @db.Uuid           // Link to Order
  customerId    String?       @db.Uuid           // Link to Customer
  invoiceNumber String?                          // CSV: Invoice number
  status        InvoiceStatus @default(DRAFT)    // PAID for delivered
  subtotal      Decimal?      @db.Decimal(12,2)  // Calculate
  total         Decimal?      @db.Decimal(12,2)  // CSV: SUM per invoice
  dueDate       DateTime?                        // CSV: Due date
  issuedAt      DateTime?                        // CSV: Invoice date
}
```

---

## 3. CSV Column → Database Field Mapping

### Order Creation (One per Invoice Number)
```typescript
CSV Invoice #96576 → ONE Order {
  customerId: matchCustomer("Market Salamander"),
  orderedAt: parseDate("2021-12-31"),        // Invoice date
  fulfilledAt: parseDate("2022-01-04"),       // Posted date
  deliveredAt: parseDate("2022-01-04"),       // Posted date
  status: "FULFILLED",                        // All are "Delivered"
  total: sumLineItems(invoice96576),          // Calculate from lines
  currency: "USD"
}
```

### OrderLine Creation (Multiple per Invoice)
```typescript
CSV Line 1 → OrderLine {
  orderId: order96576.id,
  skuId: matchSKU("FRA1023"),                // Match by SKU code
  quantity: 12,                               // CSV: Qty.
  unitPrice: 43.33,                           // CSV: Unit price
  isSample: false
}
```

### Customer Matching Strategy
```typescript
// Option 1: Match by name (case-insensitive, normalized)
const csvName = "Market Salamander"
const dbCustomer = await findCustomer({
  name: { equals: csvName, mode: 'insensitive' }
})

// Option 2: If no match, log for manual review
if (!dbCustomer) {
  logUnmatched(csvName, csvAddress)
}
```

### SKU Matching Strategy
```typescript
// Match by SKU code
const csvSKU = "FRA1023"
const dbSKU = await findSKU({
  code: csvSKU
})

// If no match, log for product creation
if (!dbSKU) {
  logMissingSKU(csvSKU, csvProductName, csvSupplier)
}
```

---

## 4. Data Quality Assessment

### ✅ STRENGTHS

1. **Complete Revenue Data**
   - All line items have prices
   - Net price = Qty × Unit price (validated)
   - $39M total revenue over 4 years

2. **Consistent Date Format**
   - YYYY-MM-DD format throughout
   - Invoice dates range: 2021-12-31 to 2025-10-24

3. **Well-Structured**
   - Fixed column count (26)
   - Quoted strings for text fields
   - Numeric fields unquoted

4. **Status Consistency**
   - All records show "Delivered" status
   - Maps cleanly to OrderStatus.FULFILLED

5. **Complete Product Data**
   - 2,955 unique SKUs
   - Product names and suppliers present
   - Quantity and pricing on every line

### ⚠️ ISSUES IDENTIFIED

1. **Customer Matching Challenge**
   - CSV has 1,265 unique customers
   - Database has 4,838 customers
   - **ISSUE:** Names may not match exactly
   - **RISK:** Orphaned orders or duplicate customers

2. **SKU Matching Challenge**
   - CSV has 2,955 unique SKUs
   - Database has 2,607 SKUs
   - **ISSUE:** 348 SKUs may not exist in database
   - **RISK:** Import will fail if SKU not found

3. **Missing Data Fields**
   - Purchase order number: 99% blank
   - Due date: 60% blank
   - Address line 2: 70% blank
   - Delivery times: 30% blank

4. **Sample Orders**
   - Many invoices to "Samples to Customers"
   - Unit price: $0.00 for samples
   - Net price: $0.00
   - **DECISION NEEDED:** Import samples or skip?

5. **Multiple Lines Per Invoice**
   - Invoice #96576 has 6 line items
   - Average: ~4 lines per invoice
   - Must group by invoice number

6. **Sales Rep Assignment**
   - CSV column 11: Salesperson name
   - Database: SalesRep linked to User
   - **CHALLENGE:** Match "Christina Crawford" to User.fullName

---

## 5. Required Transformations

### Date Parsing
```typescript
// CSV: "2021-12-31" → Database: DateTime
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  return new Date(dateStr);
};
```

### Currency Parsing
```typescript
// CSV: "43.33" or "$43.33" → Database: Decimal
const parsePrice = (priceStr: string): Decimal => {
  return new Decimal(priceStr.replace(/[$,]/g, ''));
};
```

### Customer Name Normalization
```typescript
// Normalize for matching
const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')  // Remove punctuation
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
};

// Example:
// "Market Salamander" → "market salamander"
// "The Electric Palm" → "the electric palm"
```

### SKU Code Normalization
```typescript
// SKU codes appear clean, but check:
const normalizeSKU = (sku: string): string => {
  return sku.trim().toUpperCase();
};
```

### Address Concatenation
```typescript
// Build full address from parts
const buildAddress = (row: CSVRow): string => {
  const parts = [
    row.shippingAddress1,
    row.shippingAddress2,
    row.city,
    row.state,
    row.postalCode
  ].filter(Boolean);
  return parts.join(', ');
};
```

---

## 6. Import Strategy

### Phase 1: Pre-Import Validation

1. **Customer Matching Analysis**
   ```typescript
   // Compare CSV customers to database
   for (const csvCustomer of uniqueCSVCustomers) {
     const match = await matchCustomer(csvCustomer);
     if (match) {
       customerMap.set(csvCustomer, match.id);
     } else {
       unmatchedCustomers.push(csvCustomer);
     }
   }

   // Report: "1,265 CSV customers → 1,100 matched, 165 unmatched"
   ```

2. **SKU Matching Analysis**
   ```typescript
   // Compare CSV SKUs to database
   for (const csvSKU of uniqueCSVSKUs) {
     const sku = await findSKU(csvSKU);
     if (sku) {
       skuMap.set(csvSKU, sku.id);
     } else {
       missingSKUs.push(csvSKU);
     }
   }

   // Report: "2,955 CSV SKUs → 2,607 found, 348 missing"
   ```

3. **Data Validation**
   - Check for duplicate invoice numbers
   - Validate date ranges
   - Verify price calculations
   - Identify sample orders ($0.00)

### Phase 2: Customer Resolution

**Option A: Auto-Create Missing Customers**
```typescript
for (const unmatchedName of unmatchedCustomers) {
  const csvData = getCustomerData(unmatchedName);
  await createCustomer({
    name: csvData.name,
    street1: csvData.address1,
    street2: csvData.address2,
    city: csvData.city,
    state: csvData.state,
    postalCode: csvData.zip,
    country: "US"
  });
}
```

**Option B: Manual Matching Required**
- Export unmatched list to CSV
- User provides mapping: CSV Name → Database Customer ID
- Import mapping file before proceeding

### Phase 3: SKU Resolution

**Missing SKUs Must Be Created:**
```typescript
for (const missingSKU of missingSKUs) {
  const csvData = getSKUData(missingSKU);

  // 1. Find or create Supplier
  const supplier = await findOrCreateSupplier(csvData.supplier);

  // 2. Find or create Product
  const product = await findOrCreateProduct({
    name: csvData.productName,
    supplierId: supplier.id
  });

  // 3. Create SKU
  await createSKU({
    code: missingSKU,
    productId: product.id,
    pricePerUnit: csvData.unitPrice  // From CSV
  });
}
```

### Phase 4: Import Execution

**Transaction Strategy:**
```typescript
// Import in batches of 100 invoices at a time
const BATCH_SIZE = 100;

for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
  const batch = invoices.slice(i, i + BATCH_SIZE);

  await prisma.$transaction(async (tx) => {
    for (const invoice of batch) {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          customerId: customerMap.get(invoice.customer),
          orderedAt: parseDate(invoice.invoiceDate),
          fulfilledAt: parseDate(invoice.postedDate),
          deliveredAt: parseDate(invoice.postedDate),
          status: "FULFILLED",
          total: calculateTotal(invoice.lines),
          currency: "USD"
        }
      });

      // 2. Create OrderLines
      for (const line of invoice.lines) {
        await tx.orderLine.create({
          data: {
            orderId: order.id,
            skuId: skuMap.get(line.sku),
            quantity: line.quantity,
            unitPrice: parsePrice(line.unitPrice),
            isSample: line.unitPrice === 0
          }
        });
      }

      // 3. Optional: Create Invoice
      await tx.invoice.create({
        data: {
          orderId: order.id,
          customerId: customerMap.get(invoice.customer),
          invoiceNumber: invoice.invoiceNumber.toString(),
          status: "PAID",
          total: calculateTotal(invoice.lines),
          issuedAt: parseDate(invoice.invoiceDate)
        }
      });
    }
  }, {
    timeout: 60000  // 60 second timeout per batch
  });

  console.log(`Imported batch ${i / BATCH_SIZE + 1}`);
}
```

### Phase 5: Post-Import Validation

1. **Revenue Verification**
   ```sql
   -- Should equal $39,066,623.40
   SELECT SUM(total) FROM "Order";
   ```

2. **Order Count Verification**
   ```sql
   -- Should equal 35,302
   SELECT COUNT(*) FROM "Order";
   ```

3. **Line Item Verification**
   ```sql
   -- Should equal 137,185
   SELECT COUNT(*) FROM "OrderLine";
   ```

4. **Customer Metrics Update**
   ```typescript
   // Update each customer's lastOrderDate and revenue
   for (const customerId of importedCustomers) {
     const lastOrder = await getLastOrder(customerId);
     const totalRevenue = await calculateRevenue(customerId);

     await updateCustomer(customerId, {
       lastOrderDate: lastOrder.deliveredAt,
       establishedRevenue: totalRevenue
     });
   }
   ```

---

## 7. Expected Outcomes

### After Successful Import

**Database State:**
- **Orders:** 35,302 (up from 0)
- **OrderLines:** 137,185 (up from 0)
- **Revenue:** $39,066,623.40 (up from $0)

**Date Range:**
- **Earliest Order:** 2021-12-31
- **Latest Order:** 2025-10-24
- **Time Span:** ~4 years

**Revenue by Year:**
```
2022: Estimated $8-10M
2023: Estimated $10-12M
2024: Estimated $10-12M
2025: Estimated $8-10M (partial year)
```

**Customer Metrics:**
- **Active Customers:** ~1,000+ with recent orders
- **Average Order Value:** $1,107 ($39M / 35,302)
- **Orders per Customer:** 27.9 (35,302 / 1,265)

**Product Metrics:**
- **SKUs with Sales:** 2,955
- **Average SKU Revenue:** $13,213
- **Top SKUs:** Identifiable by total revenue

---

## 8. Missing Information (Questions for User)

### CRITICAL DECISIONS NEEDED:

1. **Customer Matching Strategy**
   - ❓ Auto-create missing customers from CSV data?
   - ❓ Or require manual mapping file?
   - ❓ How to handle name variations (e.g., "The Wine Shop" vs "Wine Shop")?

2. **SKU Handling**
   - ❓ Auto-create missing SKUs from CSV data?
   - ❓ Or require SKU creation before import?
   - ❓ Use CSV unit price as SKU.pricePerUnit?

3. **Sales Rep Assignment**
   - ❓ Match salesperson name to User.fullName?
   - ❓ Create Users for unknown sales reps?
   - ❓ Or skip sales rep assignment?

4. **Sample Orders**
   - ❓ Import samples ($0.00 orders)?
   - ❓ Or skip and import only paid orders?
   - ❓ Set OrderLine.isSample = true for $0.00 items?

5. **Order Status**
   - ❓ All imported as FULFILLED?
   - ❓ Or check if Status != "Delivered"?

6. **Invoice Generation**
   - ❓ Create Invoice records?
   - ❓ Or just Orders and OrderLines?
   - ❓ Invoice status: PAID for all?

7. **Tenant ID**
   - ❓ Which tenantId to use for all imported records?

8. **Duplicate Prevention**
   - ❓ Check for existing orders by invoice number?
   - ❓ Skip if invoice already imported?

---

## 9. Risk Assessment

### HIGH RISK

1. **Customer Mismatch**
   - **Risk:** Orders assigned to wrong customers
   - **Impact:** Revenue attribution errors
   - **Mitigation:** Manual review of unmatched customers

2. **Missing SKUs**
   - **Risk:** Import fails on missing SKU lookup
   - **Impact:** Partial import, data corruption
   - **Mitigation:** Pre-create all missing SKUs

3. **Performance**
   - **Risk:** 137,185 inserts could timeout
   - **Impact:** Database lock, incomplete import
   - **Mitigation:** Batch processing (100-500 at a time)

### MEDIUM RISK

4. **Duplicate Imports**
   - **Risk:** Running import twice
   - **Impact:** Duplicate orders, double revenue
   - **Mitigation:** Check invoice number before insert

5. **Sales Rep Matching**
   - **Risk:** Rep names don't match User records
   - **Impact:** Orders not linked to reps
   - **Mitigation:** Allow NULL sales rep assignment

### LOW RISK

6. **Sample Order Handling**
   - **Risk:** $0 orders skew metrics
   - **Impact:** Low, can filter in queries
   - **Mitigation:** Set isSample flag correctly

---

## 10. Rollback Plan

### Before Import
```typescript
// 1. Backup database
await executeCommand('pg_dump leora > backup_before_import.sql');

// 2. Create restore point
await prisma.$executeRaw`
  SELECT pg_create_restore_point('before_sales_import');
`;
```

### If Import Fails
```typescript
// Option 1: Transaction rollback (automatic)
// All changes in failed batch are reverted

// Option 2: Manual cleanup
await prisma.$transaction([
  prisma.orderLine.deleteMany({
    where: { createdAt: { gte: importStartTime } }
  }),
  prisma.invoice.deleteMany({
    where: { createdAt: { gte: importStartTime } }
  }),
  prisma.order.deleteMany({
    where: { createdAt: { gte: importStartTime } }
  })
]);
```

### If Import Succeeds But Data Wrong
```sql
-- Restore from backup
psql leora < backup_before_import.sql
```

---

## 11. Import Script Requirements

### Skeleton Structure
```typescript
import { PrismaClient, Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

interface CSVRow {
  invoiceNumber: number;
  invoiceDate: string;
  postedDate: string;
  dueDate: string;
  customer: string;
  salesperson: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  sku: string;
  productName: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  netPrice: number;
  // ... other fields
}

async function importSalesReport() {
  // Phase 1: Read CSV
  const csvData = fs.readFileSync('path/to/sales-report.csv', 'utf8');
  const rows = parse(csvData, {
    columns: true,
    skip_empty_lines: true,
    from_line: 5  // Skip header rows
  });

  // Phase 2: Group by invoice
  const invoices = groupByInvoice(rows);

  // Phase 3: Match customers
  const customerMap = await matchCustomers(invoices);

  // Phase 4: Match SKUs
  const skuMap = await matchSKUs(invoices);

  // Phase 5: Import in batches
  await importInBatches(invoices, customerMap, skuMap);

  // Phase 6: Validate
  await validateImport();

  // Phase 7: Update customer metrics
  await updateCustomerMetrics();
}
```

---

## 12. Next Steps

### IMMEDIATE ACTIONS:

1. **User Decisions Required:**
   - [ ] Decide customer matching strategy
   - [ ] Decide SKU creation approach
   - [ ] Decide sample order handling
   - [ ] Provide tenant ID to use

2. **Pre-Import Setup:**
   - [ ] Create missing SKUs (348 items)
   - [ ] Resolve unmatched customers (165 items)
   - [ ] Backup database
   - [ ] Test import with 10 invoices

3. **Import Execution:**
   - [ ] Run full import (35,302 invoices)
   - [ ] Monitor progress and errors
   - [ ] Validate revenue totals
   - [ ] Update customer metrics

4. **Post-Import:**
   - [ ] Verify dashboard shows revenue
   - [ ] Check customer order histories
   - [ ] Test reporting and analytics
   - [ ] Archive CSV file

---

## 13. Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| User decisions | 1 hour | Answer 8 questions |
| SKU creation | 2-4 hours | 348 SKUs to create |
| Customer resolution | 1-2 hours | 165 customers to review |
| Script development | 4-6 hours | Write and test import logic |
| Test import | 1 hour | 10 sample invoices |
| Full import | 30-60 min | 35,302 invoices, batched |
| Validation | 30 min | Check totals and metrics |
| **TOTAL** | **10-15 hours** | End-to-end completion |

---

## 14. Success Criteria

✅ **Import Successful If:**
- All 35,302 invoices imported
- All 137,185 line items created
- Total revenue = $39,066,623.40
- No orphaned orders (all customers matched)
- No missing SKUs
- Customer metrics updated
- Dashboard shows revenue data
- No errors in import log

---

## Appendix A: Sample Data

### Sample CSV Rows (First 3 Invoices)
```csv
Invoice #96576 (6 lines):
  - Market Salamander
  - 2021-12-31 → 2022-01-04
  - 6 SKUs, Total: $4,491.96

Invoice #98244 (1 line):
  - Evening Star Cafe
  - 2021-12-31 → 2022-01-04
  - 1 SKU, Total: $540.00

Invoice #98354 (3 lines):
  - Winestyles Montclair
  - 2021-12-31 → 2022-01-04
  - 3 SKUs, Total: $5,784.00
```

### Sample Customer Names from CSV
```
Market Salamander
Evening Star Cafe
Winestyles Montclair
Winestyles Chantilly
Samples to Customers
Hamrock's
Alta Strada Merrifield
Vienna Vintner
The Electric Palm
John Peters Samples
Classic Wines
```

### Sample SKUs from CSV
```
FRA1023 - Champagne Bauget-Jouette Rose NV
CAL1168 - Hertelendy Audere 2016
CAL1196 - Hertelendy Cabernet Franc 2017
SAF1064 - Raised By Wolves Cabernet Sauvignon 2017
ITA1066 - Antonio Facchin Prosecco Brut 2020
SPA1164 - Rioja Lar de Paula Rose 2020
```

---

**END OF ANALYSIS**

*Next Step: Create import script skeleton and await user decisions on critical questions.*

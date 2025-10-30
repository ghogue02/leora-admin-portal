# VA ABC Invoice System - Testing Guide
## Complete Testing Checklist for Travis Review
## Date: October 30, 2025

---

## Pre-Testing Setup

### Step 1: Populate Wholesaler Information

Run the data population script:

```bash
npx tsx scripts/populate-va-invoice-data.ts
```

This will:
- ✅ Add wholesaler license number (013293496)
- ✅ Add wholesaler phone (571-359-6227)
- ✅ Add sample ABC codes to SKUs
- ✅ Create VA tax rules
- ✅ Add sample license numbers to VA customers

---

## Test Scenario 1: VA ABC In-State Invoice (Total Wine Format)

### Customer Requirements:
- **Customer**: Total Wine McLean (or any VA customer)
- **Location**: McLean, VA (in-state)
- **Expected Format**: VA_ABC_INSTATE

### Test Steps:

1. **Create Test Order**:
   - Go to Sales → Orders → Create Order
   - Select: Total Wine McLean (VA customer)
   - Add products:
     - Barcelona Lolea Red Sangria (24 bottles, 750ml)
     - Or any wine products
   - Submit order

2. **Create Invoice**:
   - Open order details
   - Click "Create Invoice"
   - Format should auto-select: **VA ABC In-State**
   - Fill in fields:
     - PO Number: (optional)
     - Special Instructions: (optional)
     - Shipping Method: Hand deliver
     - Due Date: (defaults to 30 days)
   - Click "Create Invoice"

3. **Download & Review PDF**:
   - Click "Download PDF"
   - Open PDF file
   - **Verify the following**:

#### Header Section ✓
- [ ] Company name: "Well Crafted Wine & Beverage Co."
- [ ] Subtitle: "(formerly The Spanish Wine Importers LLC)"
- [ ] Address: "6781 Kennedy Road Suite 8, Warrenton, VA 20187"
- [ ] Wholesaler's #: 013293496
- [ ] Voice: 571-359-6227

#### Three-Column Section ✓
- [ ] **Bill To** (left column):
  - Customer name
  - Street address
  - City, State, Zip
  - Phone
  - Email

- [ ] **Customer ID** (middle column):
  - Large ID number displayed

- [ ] **Ship To** (right column):
  - Same as Bill To (or shipping address if different)

#### Order Details ✓
- [ ] Invoice Number (format: INV-YYYYMM-XXXX)
- [ ] Invoice Date
- [ ] Special instructions (if entered)
- [ ] Customer P.O. number (if entered)
- [ ] Payment terms
- [ ] Salesperson name
- [ ] Shipping method
- [ ] Ship date
- [ ] Due date

#### Line Items Table ✓
Columns:
- [ ] No. bottles
- [ ] Size (750 ml)
- [ ] Code (ABC code like "81394 - 14-A")
- [ ] SKU
- [ ] Brand & type
- [ ] Liters (calculated, 3 decimals)
- [ ] Unit price
- [ ] Amount

#### Totals ✓
- [ ] Total Liters: (sum of all line items)
- [ ] Total Amount: (grand total with currency)

#### Footer ✓
- [ ] "(TO BE FILLED IN BY RETAIL LICENSEE)" header
- [ ] Date: field
- [ ] "Goods as listed above..." text
- [ ] "Name of Transportation Company: Well Crafted Wine & Beverage Co."
- [ ] Signed: field
- [ ] By: field

#### Compliance ✓
- [ ] Compliance notice (all caps, centered box)
- [ ] Finance charges text: "...3.0% finance charges"

---

## Test Scenario 2: VA ABC Tax-Exempt Invoice (Cask & Cork Format)

### Customer Requirements:
- **Customer**: Cask and Cork (or any out-of-state customer)
- **Location**: Des Moines, IA (out-of-state)
- **Expected Format**: VA_ABC_TAX_EXEMPT

### Test Steps:

1. **Create Test Order**:
   - Select out-of-state customer (IA, MD, DC, etc.)
   - Add products with varying quantities
   - Include at least one with fractional cases (e.g., 106 bottles)
   - Submit order

2. **Create Invoice**:
   - Format should auto-select: **VA ABC Tax-Exempt**
   - Enter PO Number (important for this format)
   - Create invoice

3. **Download & Review PDF**:
   - Should be **2 PAGES**

#### PAGE 1 ✓

**Header**:
- [ ] "Well Crafted Wine & Beverage Co."
- [ ] Address
- [ ] Title: "Distributor's Wine Invoice" (underlined)

**Invoice Info**:
- [ ] Invoice Number
- [ ] Date
- [ ] Payment Terms (e.g., "30 days")

**Licensee Section** (bordered box):
- [ ] Licensee: (customer name)
- [ ] Licensee/License #: (if available)
- [ ] Street Address
- [ ] City/State/Zip
- [ ] Salesperson
- [ ] PO #: (displayed)
- [ ] Special Instructions (if entered)

**Line Items Table** (DIFFERENT columns):
- [ ] **TOTAL CASES** (fractional: e.g., 8.83)
- [ ] **TOTAL BOTTLES**
- [ ] SIZE IN LITERS
- [ ] CODE NUMBER
- [ ] SKU
- [ ] BRAND AND TYPE
- [ ] LITERS
- [ ] BOTTLE PRICE
- [ ] TOTAL COST

**Totals**:
- [ ] Total Liters
- [ ] Grand Total

**Signature**:
- [ ] DATE RECEIVED: field

**Payment Terms Box**:
- [ ] Collection terms text with 3.0% interest mention

#### PAGE 2 ✓

**Header**:
- [ ] "Distributor's Wine Invoice - Page 2"
- [ ] Invoice Number reference
- [ ] Customer name reference

**Transportation Section**:
- [ ] Transportation Company: field
- [ ] Company Name: signature line
- [ ] Signed: field
- [ ] Date: field

**Compliance**:
- [ ] Extended compliance notice (all caps, centered)
- [ ] "TAX-EXEMPT INVOICES ARE TO BE FORWARDED TO DEPARTMENT OF A.B.C."

**Additional Legal**:
- [ ] "This invoice represents a tax-exempt sale..."
- [ ] "Excise taxes are not applicable..."

---

## Test Scenario 3: Standard Invoice

### Customer Requirements:
- **Customer**: Any non-VA or general customer
- **Expected Format**: STANDARD

### Test Steps:

1. Create order for non-VA customer
2. Create invoice
3. Download PDF

#### Verify ✓
- [ ] Simple clean layout
- [ ] Company header
- [ ] Invoice number and dates
- [ ] Customer bill-to
- [ ] Simple product table (Qty, SKU, Description, Price, Amount)
- [ ] Subtotal, Tax (if any), Total
- [ ] Collection terms (if applicable)
- [ ] Single page

---

## Calculation Validation

### Liter Calculations ✓

Test with these examples from sample invoices:

| Bottles | Size | Expected Liters |
|---------|------|-----------------|
| 24 | 750ml | 18.000 |
| 180 | 750ml | 135.000 |
| 60 | 375ml | 22.500 |
| 106 | 750ml | 79.500 |

**Verify**:
- [ ] Per-line liters calculated correctly
- [ ] Invoice total liters = sum of all lines
- [ ] 3 decimal places displayed

### Case Calculations ✓

| Bottles | Bottles/Case | Expected Cases |
|---------|--------------|----------------|
| 84 | 12 | 7.00 |
| 180 | 12 | 15.00 |
| 106 | 12 | 8.83 |
| 24 | 12 | 2.00 |

**Verify**:
- [ ] Cases calculated correctly
- [ ] Fractional cases supported (8.83)
- [ ] 2 decimal places displayed

### Tax Calculations ✓

**VA In-State** (excise tax):
- [ ] 18 liters × $0.40 = $7.20 excise tax
- [ ] Tax applied to VA → VA sales only

**Tax-Exempt** (no excise tax):
- [ ] No excise tax on out-of-state sales
- [ ] $0.00 tax

---

## Comparison to Sample Invoices

### Total Wine Invoice Checklist:
- [ ] Layout matches sample exactly
- [ ] All fields in correct positions
- [ ] Three-column header present
- [ ] Wholesaler license visible
- [ ] Signature section matches
- [ ] Compliance text word-for-word accurate

### Cask & Cork Invoice Checklist:
- [ ] Title is "Distributor's Wine Invoice"
- [ ] Two pages generated
- [ ] Cases column shows fractional (8.83)
- [ ] CODE NUMBER field present
- [ ] Page 2 has transportation section
- [ ] Extended compliance notice present

---

## API Testing

### Test PDF Generation Endpoint:

```bash
# Get invoice ID from database or creation response
INVOICE_ID="your-invoice-uuid"

# Test PDF download
curl -O http://localhost:3000/api/invoices/$INVOICE_ID/pdf

# Should download PDF file
# Verify filename format: invoice-va-instate-INV-202510-XXXX.pdf
```

---

## Performance Testing

### PDF Generation Speed:

Expected times:
- VA ABC In-State: < 200ms
- VA ABC Tax-Exempt: < 300ms (2 pages)
- Standard: < 150ms

**Test**:
1. Create invoice
2. Click "Download PDF"
3. Measure time to download
4. Verify: Should feel instant (< 1 second)

---

## Error Handling Tests

### Test Missing Data:

1. **Missing Wholesaler License**:
   - Clear wholesaler license from Tenant
   - Try to create VA ABC invoice
   - Should: Still work, show "N/A" for license

2. **Missing ABC Code**:
   - Create invoice with SKU that has no ABC code
   - Should: Still work, show "N/A" for code

3. **Missing Customer License**:
   - VA customer without license number
   - Should: Still work, show "N/A" for license

---

## Travis Review Checklist

### Critical Items for Approval:

- [ ] **Format Accuracy**: PDFs match sample invoices
- [ ] **Field Completeness**: All required fields present
- [ ] **Calculations**: Liters, cases, taxes all correct
- [ ] **Compliance Text**: Word-for-word match to samples
- [ ] **Signature Areas**: Adequate space for signatures
- [ ] **Professional Appearance**: Clean, readable layout
- [ ] **Two-Page Layout**: Tax-exempt format is 2 pages

### VA ABC Submission Requirements:

- [ ] All invoices have sequential invoice numbers
- [ ] Total liters displayed prominently
- [ ] Compliance notice present
- [ ] Retailer signature section included
- [ ] Transportation company field present

---

## Known Issues & Limitations

### Current Limitations:
- ⚠️ Signature fields are blank boxes (not fillable PDF forms)
- ⚠️ No company logo/branding images
- ⚠️ ABC codes need manual population
- ⚠️ Customer licenses need manual entry

### Future Enhancements:
- Fillable PDF forms
- Logo upload
- Bulk ABC code import
- Email integration
- PDF storage/archiving

---

## Success Criteria

Before sending to Travis, verify:

- [ ] All 3 PDF formats generate without errors
- [ ] Calculations are accurate
- [ ] Layout matches sample invoices
- [ ] All required VA ABC fields present
- [ ] Professional appearance
- [ ] Fast generation (< 1 second)
- [ ] No missing/broken fields

---

## Test Data Setup Script

```sql
-- Populate wholesaler info
UPDATE "Tenant"
SET "wholesalerLicenseNumber" = '013293496',
    "wholesalerPhone" = '571-359-6227'
WHERE id = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Add sample ABC codes
UPDATE "Sku"
SET "abcCodeNumber" = '81394 - 14-A'
WHERE "code" LIKE 'SPA%' AND "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Add license to Total Wine McLean
UPDATE "Customer"
SET "licenseNumber" = 'VA-ABC-RETAIL-4216',
    "licenseType" = 'RETAILER'
WHERE "name" LIKE '%Total Wine%'
  AND "city" = 'McLean'
  AND "state" = 'VA'
  AND "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
```

---

**Testing Status**: Ready for manual validation
**Next**: Run populate script, create test invoices, review PDFs

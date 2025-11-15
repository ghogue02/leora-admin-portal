# HAL Data Validation Guide

## Overview

The HAL Data Validation script (`validate-hal-data.ts`) is a comprehensive tool for validating HAL inventory exports against the Wellcrafted database **before** any import operations.

## ⚠️ CRITICAL WARNING

**NEVER import SKU codes from HAL inventory exports!**

- HAL SKU codes **DO NOT** align with Wellcrafted's internal SKU system
- Importing HAL SKUs will **corrupt the product catalog**
- Only use HAL data for **inventory quantity updates** on existing SKUs
- All SKU codes must already exist in the database

## What the Script Does

### 1. Data Loading
- Loads HAL products from `scripts/hal-scraper/output/products-final.json`
- Connects to database and loads all SKUs, Products, and Suppliers
- Validates database connection before processing

### 2. Validation Checks

#### SKU Matching
- ✅ Matches HAL SKUs to existing database SKUs
- ⚠️ Identifies SKUs in HAL that don't exist in database
- ❌ Reports SKUs that cannot be updated

#### Duplicate Vintages
- Detects same SKU code with multiple vintage years
- Example: `SPA1072` has vintages 2022, 2023, 2024
- Reports all variants for manual resolution

#### Data Type Validation
- **ABV (Alcohol By Volume)**: Checks for mismatches > 0.5%
- **Items Per Case**: Validates case pack quantities
- **Inventory Quantities**: Ensures all quantities >= 0
- **Supplier Names**: Verifies suppliers exist in database

#### Inventory Analysis
- Compares HAL inventory to current database inventory
- Calculates deltas (increases/decreases)
- Reports by warehouse location
- Identifies significant discrepancies

### 3. Reporting

The script generates a comprehensive report with:

```typescript
{
  summary: {
    totalHalProducts: 1904,        // Total products in HAL export
    matchedSkus: 1650,             // SKUs found in database
    missingSkus: 254,              // SKUs NOT in database
    duplicateVintages: 89,         // SKUs with multiple vintages
    validationErrors: 12,          // Data quality issues
    totalInventoryItems: 2156,     // Individual inventory records
    suppliersFound: 45,            // Suppliers matched
    suppliersMissing: 8            // Suppliers not found
  },
  matchedSkus: [...],              // Details of matched SKUs
  missingSkus: [...],              // SKUs to skip during import
  duplicateVintages: [...],        // Vintages requiring manual review
  validationErrors: [...],         // Issues to fix before import
  dataTransformations: [...],      // Proposed changes
  inventoryUpdates: [...],         // Inventory adjustments needed
  suppliers: {
    matched: [...],                // Supplier names found
    missing: [...]                 // Supplier names to create
  }
}
```

## Usage

### Basic Validation

```bash
cd /Users/greghogue/Leora2/web
tsx --env-file=.env src/scripts/validate-hal-data.ts
```

### Verbose Output

```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --verbose
```

### Save Report to File

```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --output validation-report.json
```

### Both Verbose and Save

```bash
tsx --env-file=.env src/scripts/validate-hal-data.ts --verbose --output report.json
```

> **Note**: The `--env-file=.env` flag loads environment variables (including DATABASE_URL) from the `.env` file.

## Understanding the Output

### Console Summary

```
================================================================================
VALIDATION SUMMARY
================================================================================

Overall Statistics:
  Total HAL Products:        1904
  Total Inventory Items:     2156
  Matched SKUs:              1650
  Missing SKUs:              254
  Duplicate Vintages:        89
  Validation Errors:         12

Supplier Statistics:
  Suppliers Found:           45
  Suppliers Missing:         8

Inventory Changes:
  Total Updates Needed:      892
  Increasing Inventory:      654
  Decreasing Inventory:      238

⚠ TOP 10 MISSING SKUs:
  1. SPA1234 - Example Wine 2023
     Supplier: Wine Imports LLC, Quantity: 500

⚠ TOP 10 DUPLICATE VINTAGES:
  1. SPA1072 (3 vintages):
     - 2022: Abadia de Acon Joven 2022 (1 units)
     - 2023: Abadia de Acon Joven 2023 (660 units)
     - 2024: Abadia de Acon Joven 2024 (0 units)

⚠ TOP 10 VALIDATION ERRORS:
  1. SPA9876 - Problem Product
     Negative inventory quantity: -50 at Warrenton
```

### Color Coding

- 🟢 **Green**: Successful matches, no issues
- 🟡 **Yellow**: Warnings, requires attention
- 🔴 **Red**: Errors, must be fixed before import

## Next Steps After Validation

### 1. Review Missing SKUs

Check `missingSkus` array in the report:

```json
{
  "sku": "SPA1234",
  "halName": "New Wine 2023",
  "supplier": "Wine Imports LLC",
  "totalQuantity": 500
}
```

**Actions:**
- Verify if SKU should exist in database
- Create SKU manually if needed (via admin interface)
- Skip during import if SKU is obsolete

### 2. Resolve Duplicate Vintages

For each duplicate vintage group:

```json
{
  "sku": "SPA1072",
  "count": 3,
  "vintages": [
    { "year": 2022, "name": "Abadia de Acon Joven 2022", "quantity": 1 },
    { "year": 2023, "name": "Abadia de Acon Joven 2023", "quantity": 660 },
    { "year": 2024, "name": "Abadia de Acon Joven 2024", "quantity": 0 }
  ]
}
```

**Actions:**
- Determine which vintage is current (usually highest year with inventory)
- Update database to match current vintage
- Archive or remove old vintages
- Aggregate quantities if needed

### 3. Fix Validation Errors

Review each error and take appropriate action:

**ABV Mismatch:**
```json
{
  "sku": "SPA5678",
  "error": "ABV mismatch: DB=14.5, HAL=15.0",
  "severity": "warning"
}
```
→ Verify correct ABV from product label, update database if needed

**Negative Inventory:**
```json
{
  "sku": "SPA9999",
  "error": "Negative inventory quantity: -50 at Warrenton",
  "severity": "error"
}
```
→ **CRITICAL**: Fix in HAL before import (likely data entry error)

### 4. Create Missing Suppliers

If suppliers are missing:

```json
{
  "matched": ["Wine Imports LLC", "Smith Distributors"],
  "missing": ["New Supplier Co", "ABC Wines"]
}
```

**Actions:**
- Create missing suppliers in database
- Verify supplier names match exactly (case-sensitive)
- Re-run validation after creating suppliers

### 5. Review Inventory Updates

Large inventory changes should be verified:

```json
{
  "sku": "SPA1111",
  "location": "Warrenton",
  "currentQuantity": 100,
  "halQuantity": 500,
  "delta": 400
}
```

**Actions:**
- Verify physical count if delta is significant (>50 units)
- Check for recent sales/receipts that might explain difference
- Document reason for large adjustments

## Safe Import Workflow

After validation passes:

1. **Review the report thoroughly**
   - Check all validation errors are resolved
   - Verify missing SKUs are accounted for
   - Confirm supplier list is complete

2. **Create import script** (if needed)
   ```typescript
   // Only update inventory on EXISTING SKUs
   // Never create new SKUs from HAL data
   ```

3. **Test on staging database first**
   - Run import on test environment
   - Verify results
   - Check for unexpected changes

4. **Run production import**
   - Backup database first
   - Run during off-hours
   - Monitor for errors
   - Verify results immediately

5. **Post-import validation**
   - Re-run validation script
   - Check inventory accuracy
   - Verify no data corruption

## Common Issues

### Issue: "SKU not found in database"

**Cause**: HAL has SKU that doesn't exist in Wellcrafted system

**Solution**:
- Check if SKU should exist (is it a real product?)
- If yes: Create SKU manually via admin interface
- If no: Skip during import (note in comments)

### Issue: "Duplicate vintages detected"

**Cause**: Same SKU code used for different vintage years

**Solution**:
- Wellcrafted typically uses one SKU per product (all vintages)
- Update database product to current vintage
- Aggregate inventory from all vintages
- Archive old vintage records

### Issue: "Supplier not found"

**Cause**: HAL supplier name doesn't match database exactly

**Solution**:
- Check for typos or case differences
- Create supplier if it's genuinely new
- Map HAL supplier names to database names

### Issue: "Negative inventory"

**Cause**: Data entry error in HAL

**Solution**:
- **DO NOT IMPORT** negative quantities
- Fix in HAL system first
- Re-export and validate again

## Technical Notes

### Database Schema

The script uses these Prisma models:

- `Sku`: Product variants (code, abv, itemsPerCase, etc.)
- `Product`: Product master data (name, brand, description, vintage)
- `Supplier`: Supplier information
- `Inventory`: Stock levels by location

### Field Mappings

HAL → Database:
- `sku` → `Sku.code`
- `labelAlcohol` → `Sku.abv`
- `itemsPerCase` → `Sku.itemsPerCase`
- `inventory[].quantity` → `Inventory.onHand`
- `inventory[].warehouse` → `Inventory.location`

### Performance

- Processes ~2000 products in < 10 seconds
- Uses efficient Map lookups for SKU/supplier matching
- Progress indicator shows real-time status
- Memory-efficient streaming for large datasets

## Exit Codes

- `0`: Validation successful (warnings allowed)
- `1`: Validation failed (errors detected)

## Support

For questions or issues:

1. Check this README first
2. Review validation report details
3. Consult database administrator
4. Test on staging environment before production

---

**Remember**: The validation script is your first line of defense against data corruption. Always run it before any HAL import operation!

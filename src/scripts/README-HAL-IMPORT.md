# HAL Data Import Guide

This directory contains scripts for safely importing HAL product data into the Wellcrafted database with full transaction safety and rollback capability.

## 🔐 Safety Features

- **Transaction-based**: All changes in atomic batches with automatic rollback on error
- **Checkpoint Resume**: Automatically saves progress and can resume from interruption
- **Dry-Run Mode**: Preview all changes before applying them
- **Rollback Script**: Undo imports if needed
- **Validation**: Skips invalid data and reports errors
- **Vintage Detection**: Automatically creates variant SKUs for different vintages

## 📋 Prerequisites

1. **Database Backup** (CRITICAL)
   ```bash
   # Create backup before import
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Verify HAL Data File**
   ```bash
   # Default location:
   /Users/greghogue/Leora2/scripts/hal-scraper/output/products-progress-*.json
   ```

3. **Install Dependencies**
   ```bash
   cd /Users/greghogue/Leora2/web
   npm install
   ```

## 🚀 Usage

### Step 1: Dry Run (ALWAYS DO THIS FIRST)

```bash
npx tsx src/scripts/import-hal-data.ts --dry-run
```

This will:
- Show exactly what would be changed
- Identify potential errors
- Display statistics without modifying data

Example output:
```
📂 Loaded 1904 products from products-progress-2025-11-15T02-19-05-574Z.json

🚀 Processing 1904 products in 20 batches
📦 Batch size: 100
🔍 Mode: DRY RUN

📦 Batch 1/20 (products 1-100)
  [DRY RUN] Would update product: SPA1072
  [DRY RUN] Would create variant SKU: SPA1072-2023 (vintage 2023)
  [DRY RUN] Would create inventory Warrenton: 660 units
  ✅ Batch completed: 100 processed, 0 errors
```

### Step 2: Review Dry Run Results

Check for:
- ✅ Products being updated correctly
- ✅ Variant SKUs being created for vintages
- ✅ Inventory quantities look reasonable
- ❌ Any errors or warnings

### Step 3: Run Actual Import

```bash
npx tsx src/scripts/import-hal-data.ts --confirm --output import-report.json
```

**Options:**
- `--confirm` - Required flag to run actual import
- `--output <file>` - Save detailed report to JSON (recommended)
- `--batch-size <n>` - Override batch size (default: 100)
- `--skip-inventory` - Import product data only
- `--input <file>` - Override input file location

### Step 4: Monitor Progress

The script will:
- Process products in batches (default: 100 per batch)
- Save checkpoint after each batch
- Show real-time progress
- Report errors immediately

Example output:
```
📦 Batch 1/20 (products 1-100)
  ✅ Batch completed: 100 processed, 0 errors
  📊 Overall progress: 5.3%

📦 Batch 2/20 (products 101-200)
  ✅ Batch completed: 200 processed, 0 errors
  📊 Overall progress: 10.5%
```

### Step 5: Review Summary

```
================================================================================
📊 IMPORT SUMMARY
================================================================================

✅ Successfully Processed: 1904
   Products Updated:       523
   SKUs Updated:           1234
   Variant SKUs Created:   45
   Suppliers Created:      12
   Inventory Created:      1876
   Inventory Updated:      28

⚠️  Skipped:                0
❌ Errors:                 0
📦 Batches Completed:      20

⏱️  Total time: 125.34s

💾 Detailed report saved to: import-report.json
================================================================================
```

## 🔄 Resume Interrupted Import

If the import is interrupted (network issue, crash, etc.):

```bash
npx tsx src/scripts/import-hal-data.ts --confirm --resume
```

This will:
- Load the last checkpoint
- Resume from where it left off
- Preserve previous statistics

## 🔙 Rollback Changes

If you need to undo the import:

### Step 1: Dry Run Rollback

```bash
npx tsx src/scripts/rollback-hal-import.ts --report import-report.json --dry-run
```

### Step 2: Actual Rollback

```bash
npx tsx src/scripts/rollback-hal-import.ts --report import-report.json --confirm
```

**What gets rolled back:**
- ✅ Variant SKUs created during import
- ✅ Suppliers created during import (if unused)
- ✅ Inventory records created during import
- ❌ Product/SKU updates (no snapshot, can't restore)

**Limitations:**
- Cannot restore previous values for updated fields
- Cannot unlink suppliers (no previous state stored)
- For full restoration, use database backup

## 📊 Import Report Structure

The `--output` JSON file contains:

```json
{
  "summary": {
    "totalProcessed": 1904,
    "productsUpdated": 523,
    "skusUpdated": 1234,
    "variantsCreated": 45,
    "suppliersCreated": 12,
    "inventoryCreated": 1876,
    "inventoryUpdated": 28,
    "errors": 0,
    "skipped": 0
  },
  "updates": [
    {
      "sku": "SPA1072-2023",
      "action": "variant_created",
      "details": {
        "vintage": 2023,
        "baseSku": "SPA1072",
        "productId": "..."
      }
    }
  ],
  "errors": [],
  "skipped": []
}
```

## 🎯 What the Import Does

### 1. Product Updates
- Updates `description` if changed
- Updates `manufacturer` if provided
- Updates `abcCode` from Virginia ABC Code

### 2. SKU Updates
- Updates `abv` from labelAlcohol
- Updates `itemsPerCase`
- Updates `bottleBarcode` (cleaned)
- Updates `abcCodeNumber`

### 3. Vintage Handling

**Example:** "Abadia de Acon Joven 2023" with SKU "SPA1072"

- Extracts vintage: 2023
- Checks if product vintage matches
- If different: Creates variant SKU "SPA1072-2023"
- Links to new or existing product for that vintage

### 4. Supplier Management
- Finds or creates supplier by name
- Links supplier to product

### 5. Inventory Creation
- Parses warehouse location (e.g., "11-H1 / 11-H3")
- Extracts aisle, row, shelf components
- Creates or updates inventory records

## 🛡️ Safety Rules

The import script follows these safety rules:

1. **Never Imports SKUs from HAL** - Only updates existing SKUs
2. **Never Creates Products for Unknown SKUs** - Skips if not in database
3. **Transaction-Based** - Each batch is atomic (all or nothing)
4. **Checkpoint Resume** - Can recover from interruptions
5. **Validation** - Skips invalid data with error reporting
6. **Dry-Run First** - Always preview changes before applying

## 📁 File Locations

```
web/
├── src/
│   └── scripts/
│       ├── import-hal-data.ts          # Main import script
│       ├── rollback-hal-import.ts      # Rollback script
│       └── README-HAL-IMPORT.md        # This file
├── data/
│   └── import-checkpoint.json          # Auto-created checkpoint
└── prisma/
    └── schema.prisma                   # Database schema reference
```

## 🔍 Troubleshooting

### Import Fails with "SKU not found"

**Issue:** HAL data contains SKUs not in database

**Solution:** This is expected and safe. The script will:
- Skip these SKUs with a warning
- Continue processing other SKUs
- Report all skipped SKUs in summary

### Transaction Timeout

**Issue:** Batch takes longer than 60 seconds

**Solution:** Reduce batch size:
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --batch-size 50
```

### Checkpoint Not Loading

**Issue:** `--resume` doesn't find checkpoint

**Solution:**
1. Check if `web/data/import-checkpoint.json` exists
2. If corrupted, delete and start fresh
3. Checkpoint is auto-deleted after successful import

### Variant SKUs Not Created

**Issue:** Expected vintage variants but none created

**Solution:**
- Check product names match pattern "Product Name YYYY"
- Vintage must be 4-digit year at end of name
- Database product must have different vintage

## 📞 Support

If you encounter issues:

1. **Check the dry-run output** - Shows exactly what will happen
2. **Review error messages** - Often indicate the fix needed
3. **Check database schema** - Verify field names in `prisma/schema.prisma`
4. **Use rollback script** - Can undo variant/supplier/inventory creation
5. **Restore from backup** - Nuclear option for complete restoration

## 🎓 Examples

### Basic Import
```bash
# 1. Dry run first
npx tsx src/scripts/import-hal-data.ts --dry-run

# 2. Actual import with report
npx tsx src/scripts/import-hal-data.ts --confirm --output report.json
```

### Custom Batch Size
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --batch-size 50
```

### Skip Inventory
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --skip-inventory
```

### Custom Input File
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --input /path/to/products.json
```

### Resume After Interruption
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --resume
```

### Rollback
```bash
# Preview rollback
npx tsx src/scripts/rollback-hal-import.ts --report report.json --dry-run

# Execute rollback
npx tsx src/scripts/rollback-hal-import.ts --report report.json --confirm
```

## ✅ Best Practices

1. **Always start with --dry-run**
2. **Create database backup before import**
3. **Use --output to save report** (needed for rollback)
4. **Review dry-run results carefully**
5. **Monitor progress during import**
6. **Keep checkpoint file** (auto-deleted on success)
7. **Save import report** (for rollback or audit)
8. **Test rollback on dev/staging first**

## 🔮 Future Enhancements

Potential improvements for v2:

- [ ] Store "before" snapshots for full rollback capability
- [ ] Support for delta imports (only changed products)
- [ ] Parallel batch processing (multiple transactions)
- [ ] Integration with database backup/restore
- [ ] Email notifications on completion/error
- [ ] Web UI for monitoring progress
- [ ] Automatic scheduling via cron
- [ ] Multi-tenant support

# HAL Import Quick Start Guide

## 🚀 One-Minute Quick Start

```bash
# Step 1: Validate setup (30 seconds)
npx tsx src/scripts/test-import-setup.ts

# Step 2: Dry run preview (2 minutes)
npx tsx src/scripts/import-hal-data.ts --dry-run

# Step 3: Actual import with report (5-10 minutes)
npx tsx src/scripts/import-hal-data.ts --confirm --output import-report.json
```

## 📋 Complete Workflow

### Before Import

```bash
# 1. Create database backup (CRITICAL!)
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Validate setup
npx tsx src/scripts/test-import-setup.ts
```

### Run Import

```bash
# 3. Preview changes (always do this first)
npx tsx src/scripts/import-hal-data.ts --dry-run

# 4. Execute import
npx tsx src/scripts/import-hal-data.ts --confirm --output report.json
```

### If Something Goes Wrong

```bash
# Option 1: Resume from checkpoint
npx tsx src/scripts/import-hal-data.ts --confirm --resume

# Option 2: Rollback changes
npx tsx src/scripts/rollback-hal-import.ts --report report.json --confirm

# Option 3: Restore from backup
psql $DATABASE_URL < backup-YYYYMMDD-HHMMSS.sql
```

## 🎯 Common Use Cases

### Import with Custom Batch Size
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --batch-size 50
```

### Import Product Data Only (Skip Inventory)
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --skip-inventory
```

### Import from Different File
```bash
npx tsx src/scripts/import-hal-data.ts --confirm --input /path/to/products.json
```

### Preview Rollback
```bash
npx tsx src/scripts/rollback-hal-import.ts --report report.json --dry-run
```

## 📊 What to Expect

### Dry Run Output
```
📂 Loaded 1904 products from products-progress-*.json

🚀 Processing 1904 products in 20 batches
📦 Batch size: 100
🔍 Mode: DRY RUN

  [DRY RUN] Would update product: SPA1072
  [DRY RUN] Would create variant SKU: SPA1072-2023 (vintage 2023)
  [DRY RUN] Would create inventory Warrenton: 660 units
```

### Import Summary
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

⚠️  Skipped:                0
❌ Errors:                 0
📦 Batches Completed:      20

⏱️  Total time: 125.34s
================================================================================
```

## ⚠️ Important Notes

1. **Always run --dry-run first** - This shows you exactly what will happen
2. **Create a database backup** - Critical for disaster recovery
3. **Save the import report** - Needed for rollback functionality
4. **Monitor progress** - Watch for errors during import
5. **Review summary** - Check statistics make sense

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| "SKU not found" warnings | Expected - HAL has SKUs not in database |
| Transaction timeout | Use `--batch-size 50` to reduce batch size |
| Checkpoint not loading | Delete `web/data/import-checkpoint.json` |
| Import interrupted | Use `--resume` to continue from checkpoint |
| Need to undo changes | Use rollback script with saved report |

## 📁 Files Created

- `web/data/import-checkpoint.json` - Auto-created checkpoint (temporary)
- `import-report.json` - Import report (if --output specified)
- `backup-*.sql` - Database backup (you create this)

## 🔐 Safety Guarantees

The import script is designed to be safe:

- ✅ **Never creates new SKUs** - Only updates existing
- ✅ **Transaction-based** - Changes are atomic (all or nothing)
- ✅ **Checkpoint resume** - Can recover from interruptions
- ✅ **Dry-run mode** - Preview changes before applying
- ✅ **Rollback capability** - Can undo variant/supplier/inventory creation
- ✅ **Validation** - Skips invalid data with error reporting

## 📞 Getting Help

1. Read detailed guide: `README-HAL-IMPORT.md`
2. Run validation: `npx tsx src/scripts/test-import-setup.ts`
3. Check dry-run output: `npx tsx src/scripts/import-hal-data.ts --dry-run`
4. Review import report: Check JSON output file
5. Use rollback if needed: `npx tsx src/scripts/rollback-hal-import.ts`

## 🎓 Learning by Example

### First Time Import
```bash
# Validate everything first
npx tsx src/scripts/test-import-setup.ts

# See what would happen
npx tsx src/scripts/import-hal-data.ts --dry-run | less

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Run actual import
npx tsx src/scripts/import-hal-data.ts --confirm --output report.json

# Review results
cat report.json | jq '.summary'
```

### Resume After Interruption
```bash
# Import was interrupted at batch 15/20
# Resume from last checkpoint
npx tsx src/scripts/import-hal-data.ts --confirm --resume

# Import will continue from batch 16
```

### Rollback Unwanted Changes
```bash
# Preview what would be rolled back
npx tsx src/scripts/rollback-hal-import.ts --report report.json --dry-run

# Execute rollback
npx tsx src/scripts/rollback-hal-import.ts --report report.json --confirm
```

---

**Ready to import?** Start with the validation script! 🚀

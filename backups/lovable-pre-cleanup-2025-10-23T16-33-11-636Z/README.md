# Lovable Database Backup

## Backup Information

- **Created:** 2025-10-23T16:33:11.637Z
- **Total Records:** 15,892
- **Total Size:** 12.92 MB
- **Purpose:** Pre-cleanup backup before database investigation and cleanup operations

## Contents

### Data Files
- `customer.json` - 4,947 customer records (4.84 MB)
- `order.json` - 2,843 order records (2.11 MB)
- `orderline.json` - 2,817 order line records (978.59 KB)
- `skus.json` - 1,285 SKU records (579.98 KB)
- `product.json` - 1,888 product records (3.42 MB)
- `invoice.json` - 2,112 invoice records (1.02 MB)

### Metadata
- `backup-metadata.json` - Complete backup metadata with checksums and verification data

## Verification Status

✅ **All checksums verified** - Dry-run restore completed successfully

## Database Connection

- **URL:** https://wlwqkblueezqydturcpv.supabase.co
- **Project:** Lovable (wlwqkblueezqydturcpv)

## How to Restore

### Dry Run (Recommended First)
Test the restore process without making any changes:

```bash
cd /Users/greghogue/Leora2/scripts/database-investigation
npx tsx restore-lovable.ts /Users/greghogue/Leora2/backups/lovable-pre-cleanup-2025-10-23T16-33-11-636Z --dry-run
```

### Full Restore
⚠️ **WARNING: This will insert records into the database**

```bash
cd /Users/greghogue/Leora2/scripts/database-investigation
npx tsx restore-lovable.ts /Users/greghogue/Leora2/backups/lovable-pre-cleanup-2025-10-23T16-33-11-636Z
```

## Data Integrity

Each backup file includes:
- Table name
- Export timestamp
- Record count
- Expected record count
- Complete records array

The backup system:
- ✅ Fetches ALL records (not samples)
- ✅ Generates SHA256 checksums for verification
- ✅ Saves metadata for restore validation
- ✅ Supports batch processing for large tables
- ✅ Includes comprehensive error handling

## File Format

Each `.json` file contains:

```json
{
  "table": "table_name",
  "exportedAt": "2025-10-23T16:33:11.637Z",
  "recordCount": 1234,
  "expectedCount": 1234,
  "records": [
    // Complete array of all records
  ]
}
```

## Backup Scripts

### Location
- Backup script: `/Users/greghogue/Leora2/scripts/database-investigation/backup-lovable.ts`
- Restore script: `/Users/greghogue/Leora2/scripts/database-investigation/restore-lovable.ts`

### Features
- **Batch Processing:** Handles large datasets efficiently
- **Checksum Verification:** SHA256 checksums for data integrity
- **Progress Tracking:** Real-time feedback during operations
- **Error Handling:** Comprehensive error reporting
- **Dry Run Mode:** Safe testing before actual restore

## Notes

- All record counts match expected values ✅
- No errors or warnings during backup ✅
- All checksums verified during dry-run ✅
- Backup completed in under 60 seconds ✅

## Next Steps

This backup should be used as a safety measure before:
1. Analyzing duplicate records
2. Cleaning up inconsistent data
3. Performing data migrations
4. Testing database modifications

**Always verify the backup with a dry-run before performing cleanup operations!**

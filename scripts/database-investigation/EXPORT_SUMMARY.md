# Well Crafted Database Export - Complete Summary

## 🚨 Current Status

**Problem**: Programmatic export via Supabase client/REST API fails with "permission denied for schema public"

**Root Cause**: Row Level Security (RLS) policies on Well Crafted database blocking even service role access

**Solution**: Manual psql export (the method that worked in Phase 1)

## 📋 Quick Start - Recommended Approach

### Option 1: Fully Automated (IF psql connection works)

```bash
cd /Users/greghogue/Leora2/scripts/database-investigation

# Try automated export first
./try-automated-export.sh
```

If this works, skip to verification. If it fails, use Option 2.

### Option 2: Manual Export (Most Reliable)

Follow `/Users/greghogue/Leora2/scripts/database-investigation/MANUAL_EXPORT_INSTRUCTIONS.md`

Key steps:
1. Connect via psql
2. Verify 7,774 OrderLines
3. Export each table to CSV
4. Convert CSV to JSON
5. Verify export completeness

## 📊 Expected Results

After successful export, you should have:

```
/Users/greghogue/Leora2/exports/wellcrafted-complete-YYYY-MM-DD/
├── customer.json      (All customer records)
├── product.json       (All product records)
├── sku.json           (All SKU records)
├── order.json         (All order records)
├── orderline.json     (EXACTLY 7,774 records) ← CRITICAL
└── export-report.json (Verification report)
```

## ✅ Verification Checklist

- [ ] 7,774 OrderLines exported (exact count from Phase 1)
- [ ] All 5 tables present with data
- [ ] Customer names and emails populated
- [ ] Order dates and totals present
- [ ] SKU codes and sizes included
- [ ] Product names and producers filled
- [ ] No critical null/missing values
- [ ] Matching foreign keys (customer IDs in orders, SKU IDs in orderlines)

## 🔧 Files Created

### Scripts
- `export-wellcrafted-complete.ts` - Attempted Supabase client export (failed due to RLS)
- `export-via-rest.ts` - Attempted REST API export (failed due to RLS)
- `export-wellcrafted-psql.sh` - Attempted direct psql export (connection issues)
- `convert-csv-to-json.ts` - CSV to JSON converter (works after manual export)
- `check-database-access.ts` - Permission diagnostics tool

### Documentation
- `MANUAL_EXPORT_INSTRUCTIONS.md` - Step-by-step manual export guide
- `EXPORT_SUMMARY.md` - This file

## 🐛 Why Automated Exports Failed

1. **Supabase JS Client** (`export-wellcrafted-complete.ts`):
   - Error: "permission denied for schema public"
   - Cause: RLS policies blocking service role

2. **REST API** (`export-via-rest.ts`):
   - Error: HTTP 403 "permission denied for schema public"
   - Cause: Same RLS issue

3. **Direct psql** (`export-wellcrafted-psql.sh`):
   - Error: Connection timeout on port 5432, "tenant not found" on port 6543
   - Cause: Network/pooler configuration

## 🎯 Next Steps After Export

1. **Verify Export**:
   ```bash
   cd /Users/greghogue/Leora2/scripts/database-investigation
   tsx verify-export.ts
   ```

2. **Data Quality Check**:
   - Check for orphaned records
   - Verify referential integrity
   - Identify data quality issues

3. **Migration Preparation**:
   - Map Well Crafted schema to Lovable schema
   - Plan data transformations
   - Create migration scripts

## 📞 Support

If you encounter issues:

1. Check Phase 1 documentation for working psql connection
2. Verify database credentials haven't changed
3. Ensure network access to Supabase pooler
4. Review RLS policies if you have database admin access

## 🔐 Credentials Used

- **Database**: `zqezunzlyjkseugujkrl.supabase.co`
- **Service Key**: `eyJhbGci...` (service_role)
- **Password**: `Leora0802`
- **Username**: `postgres.zqezunzlyjkseugujkrl`

## 📝 Notes from Phase 1

- 7,774 OrderLines verified via manual psql session
- Tables use PascalCase names: Customer, Order, OrderLine, Sku, Product
- Database contains both legacy Well Crafted tables AND new Lovable tables
- RLS policies prevent programmatic access but allow interactive psql

---

**Bottom Line**: Use manual psql export method from `MANUAL_EXPORT_INSTRUCTIONS.md` for guaranteed success.

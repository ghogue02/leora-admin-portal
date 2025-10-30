# Well Crafted Database Manual Export Instructions

## Summary

Due to permission restrictions on the Well Crafted database (RLS policies blocking programmatic access), the export must be done using the **psql** connection method that worked in Phase 1.

## Critical Facts

- **Expected OrderLines**: 7,774 (verified via psql in Phase 1)
- **Tables to Export**: Customer, Order, OrderLine, Sku, Product (PascalCase names)
- **Database**: `zqezunzlyjkseugujkrl.supabase.co`
- **Issue**: Service role key has "permission denied for schema public" via REST API/Supabase client
- **Solution**: Direct psql export (bypasses RLS)

## Export Method 1: Interactive psql Session

### Step 1: Connect to Database

```bash
# Set password to avoid prompts
export PGPASSWORD=Leora0802

# Connect using session mode (the method that worked in Phase 1)
psql "postgresql://postgres.zqezunzlyjkseugujkrl:Leora0802@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**Note**: If this connection string doesn't work, try the direct connection:
```bash
psql "postgresql://postgres.zqezunzlyjkseugujkrl:Leora0802@zqezunzlyjkseugujkrl.supabase.co:6543/postgres"
```

### Step 2: Verify Data

Once connected, verify the exact count:

```sql
SELECT COUNT(*) FROM "OrderLine";
-- Should return 7774

-- Check other tables
SELECT COUNT(*) FROM "Customer";
SELECT COUNT(*) FROM "Order";
SELECT COUNT(*) FROM "Sku";
SELECT COUNT(*) FROM "Product";
```

### Step 3: Export Each Table to CSV

```sql
-- Export Customer
\copy (SELECT * FROM "Customer") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/customer.csv' WITH CSV HEADER;

-- Export Product
\copy (SELECT * FROM "Product") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/product.csv' WITH CSV HEADER;

-- Export Sku
\copy (SELECT * FROM "Sku") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku.csv' WITH CSV HEADER;

-- Export Order
\copy (SELECT * FROM "Order") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/order.csv' WITH CSV HEADER;

-- Export OrderLine (CRITICAL - must be 7,774 records!)
\copy (SELECT * FROM "OrderLine") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/orderline.csv' WITH CSV HEADER;
```

### Step 4: Exit and Verify

```sql
\q  -- Exit psql
```

Then verify file sizes:
```bash
wc -l /Users/greghogue/Leora2/exports/wellcrafted-manual/*.csv
```

The `orderline.csv` should have **7,775 lines** (7,774 data rows + 1 header row).

## Export Method 2: One-Line Commands

If you prefer non-interactive export:

```bash
# Create export directory
mkdir -p /Users/greghogue/Leora2/exports/wellcrafted-manual

# Set connection info
export PGPASSWORD=Leora0802
DB_URL="postgresql://postgres.zqezunzlyjkseugujkrl@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Export each table
psql "$DB_URL" -c "\copy (SELECT * FROM \"Customer\") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/customer.csv' WITH CSV HEADER"

psql "$DB_URL" -c "\copy (SELECT * FROM \"Product\") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/product.csv' WITH CSV HEADER"

psql "$DB_URL" -c "\copy (SELECT * FROM \"Sku\") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku.csv' WITH CSV HEADER"

psql "$DB_URL" -c "\copy (SELECT * FROM \"Order\") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/order.csv' WITH CSV HEADER"

psql "$DB_URL" -c "\copy (SELECT * FROM \"OrderLine\") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/orderline.csv' WITH CSV HEADER"
```

## Export Method 3: CSV to JSON Conversion

After exporting to CSV, convert to JSON:

```bash
# Run the conversion script (to be created)
tsx /Users/greghogue/Leora2/scripts/database-investigation/convert-csv-to-json.ts
```

## Verification Checklist

After export, verify:

- [ ] `orderline.csv` has exactly **7,775 lines** (7,774 + header)
- [ ] All 5 CSV files created successfully
- [ ] Files contain matching data (customer IDs in orders, SKU IDs in orderlines, etc.)
- [ ] No null/missing critical fields (customer names, order dates, SKU codes, etc.)

## Next Steps

Once CSV files are exported and verified:

1. Convert CSV to JSON format for migration scripts
2. Run data quality checks
3. Proceed with migration to Lovable database

## Troubleshooting

### Connection Refused/Timeout
- Try alternative pooler hosts
- Check if direct port 5432 access is enabled
- Verify SSL mode requirements

### Permission Denied in psql
- Ensure using `postgres.zqezunzlyjkseugujkrl` username
- Verify password is `Leora0802`
- Check that PascalCase table names are quoted

### Wrong Record Count
- Verify you're connected to the correct database
- Check that no data was deleted/modified since Phase 1
- Confirm table names use PascalCase with quotes

## Why Automated Export Failed

The programmatic export attempts failed because:

1. **REST API**: Returns "permission denied for schema public" (RLS blocking service role)
2. **Supabase JS Client**: Same RLS permission issue
3. **psql direct connection**: Port 5432 timeout, port 6543 "tenant not found"
4. **Pooler connection**: May work interactively but fails in scripts

The manual psql method that worked in Phase 1 remains the most reliable approach.

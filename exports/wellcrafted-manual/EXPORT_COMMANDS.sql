-- Well Crafted Manual Export Commands
-- Copy and paste these commands ONE AT A TIME into psql
-- After connecting with the command below

-- ============================================================================
-- STEP 1: Export Customer table
-- ============================================================================
\copy (SELECT * FROM "Customer") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Customer.csv' WITH CSV HEADER;

-- ============================================================================
-- STEP 2: Export Order table
-- ============================================================================
\copy (SELECT * FROM "Order") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Order.csv' WITH CSV HEADER;

-- ============================================================================
-- STEP 3: Export OrderLine table (CRITICAL - Must be 7,774 records!)
-- ============================================================================
\copy (SELECT * FROM "OrderLine") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/OrderLine.csv' WITH CSV HEADER;

-- ============================================================================
-- STEP 4: Export Sku table
-- ============================================================================
\copy (SELECT * FROM "Sku") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Sku.csv' WITH CSV HEADER;

-- ============================================================================
-- STEP 5: Export Product table
-- ============================================================================
\copy (SELECT * FROM "Product") TO '/Users/greghogue/Leora2/exports/wellcrafted-manual/Product.csv' WITH CSV HEADER;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to check counts)
-- ============================================================================
SELECT 'Customer' as table_name, COUNT(*) as count FROM "Customer"
UNION ALL
SELECT 'Order', COUNT(*) FROM "Order"
UNION ALL
SELECT 'OrderLine', COUNT(*) FROM "OrderLine"
UNION ALL
SELECT 'Sku', COUNT(*) FROM "Sku"
UNION ALL
SELECT 'Product', COUNT(*) FROM "Product";

-- ============================================
-- VERIFY CUSTOMER MAPPING BETWEEN DATABASES
-- ============================================
-- Purpose: Check if Lovable customers can be mapped to Well Crafted customers
-- Run this FIRST before attempting OrderLine migration
--
-- Expected Output:
--   - total_lovable_customers: 1000
--   - mapped_to_wellcrafted: ~950-1000 (95-100%)
--   - unmapped: 0-50 (0-5%)
--
-- If unmapped > 50, investigate customer name differences
-- ============================================

-- Summary statistics
SELECT
  COUNT(*) as total_lovable_customers,
  COUNT(DISTINCT lv.name) as unique_customer_names,
  COUNT(wc.id) as mapped_to_wellcrafted,
  COUNT(*) - COUNT(wc.id) as unmapped_customers,
  ROUND((COUNT(wc.id)::NUMERIC / COUNT(*)) * 100, 2) as mapping_percentage
FROM lovable.customer lv
LEFT JOIN wellcrafted."Customer" wc ON LOWER(TRIM(lv.name)) = LOWER(TRIM(wc."name"));

-- Sample of successfully mapped customers
SELECT
  lv.id as lovable_id,
  lv.name as lovable_name,
  wc.id as wellcrafted_id,
  wc."name" as wellcrafted_name
FROM lovable.customer lv
JOIN wellcrafted."Customer" wc ON LOWER(TRIM(lv.name)) = LOWER(TRIM(wc."name"))
LIMIT 20;

-- Unmapped customers (need investigation)
SELECT
  lv.id as lovable_id,
  lv.name as lovable_name,
  COUNT(o.id) as order_count
FROM lovable.customer lv
LEFT JOIN wellcrafted."Customer" wc ON LOWER(TRIM(lv.name)) = LOWER(TRIM(wc."name"))
LEFT JOIN lovable.order o ON o.customerid = lv.id
WHERE wc.id IS NULL
GROUP BY lv.id, lv.name
ORDER BY order_count DESC
LIMIT 20;

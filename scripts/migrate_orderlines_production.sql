-- ============================================
-- PRODUCTION ORDERLINE MIGRATION SCRIPT
-- ============================================
-- Purpose: Copy OrderLines from Well Crafted to Lovable for matched orders
-- Run this THIRD after verifying customer mapping and match quality
--
-- IMPORTANT: This script modifies data - run in transaction
-- If any issues occur, the transaction will rollback automatically
--
-- Expected Results:
--   - 500-700 orders matched and migrated
--   - 2,000-5,000 OrderLines copied
--   - Migration log for auditing
-- ============================================

BEGIN;

-- Step 1: Create migration tracking table
CREATE TEMP TABLE IF NOT EXISTS migration_log (
  lovable_order_id UUID,
  lovable_order_number VARCHAR(50),
  wellcrafted_order_id UUID,
  customer_name TEXT,
  lovable_date TIMESTAMP,
  lovable_total NUMERIC,
  wellcrafted_total NUMERIC,
  lines_copied INT,
  match_method VARCHAR(50),
  match_quality VARCHAR(20),
  migrated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Match orders and copy OrderLines
WITH matched_orders AS (
  -- Use DISTINCT ON to handle duplicate matches (take most recent Well Crafted order)
  SELECT DISTINCT ON (lv_order.id)
    lv_order.id as lovable_order_id,
    lv_order.ordernumber as lovable_order_number,
    wc_order.id as wellcrafted_order_id,
    lv_cust.name as customer_name,
    lv_order.orderedat as lovable_date,
    lv_order.total as lovable_total,
    wc_order."total" as wellcrafted_total,
    CASE
      WHEN ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 0.01
           AND DATE(lv_order.orderedat) = DATE(wc_order."orderedAt")
      THEN 'PERFECT'
      WHEN ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 1.00
           AND DATE(lv_order.orderedat) = DATE(wc_order."orderedAt")
      THEN 'GOOD'
      ELSE 'ACCEPTABLE'
    END as match_quality
  FROM lovable.order lv_order
  JOIN lovable.customer lv_cust ON lv_order.customerid = lv_cust.id
  JOIN wellcrafted."Customer" wc_cust ON LOWER(TRIM(lv_cust.name)) = LOWER(TRIM(wc_cust."name"))
  JOIN wellcrafted."Order" wc_order ON wc_order."customerId" = wc_cust.id
  WHERE
    -- Match criteria
    DATE(lv_order.orderedat) BETWEEN DATE(wc_order."orderedAt") - 1 AND DATE(wc_order."orderedAt") + 1
    AND (
      ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 1.00
      OR wc_order."total" IS NULL
    )
    -- Only process orders without existing OrderLines
    AND NOT EXISTS (
      SELECT 1 FROM lovable.orderline WHERE orderid = lv_order.id
    )
    -- Ensure Well Crafted order HAS OrderLines to copy
    AND EXISTS (
      SELECT 1 FROM wellcrafted."OrderLine" WHERE "orderId" = wc_order.id
    )
  ORDER BY lv_order.id, wc_order."updatedAt" DESC  -- Take most recent if duplicates
),
inserted_lines AS (
  -- Copy OrderLines from Well Crafted to Lovable
  INSERT INTO lovable.orderline (
    id,
    orderid,
    skuid,
    quantity,
    unitprice,
    discount,
    issample,
    createdat,
    appliedpricingrules
  )
  SELECT
    gen_random_uuid(),
    mo.lovable_order_id,
    wc_line."skuId",
    wc_line."quantity",
    wc_line."unitPrice",
    0,  -- Default discount to 0 (adjust if needed)
    wc_line."isSample",
    NOW(),
    wc_line."appliedPricingRules"::jsonb
  FROM matched_orders mo
  JOIN wellcrafted."OrderLine" wc_line ON wc_line."orderId" = mo.wellcrafted_order_id
  RETURNING orderid
)
-- Track all migrated orders
INSERT INTO migration_log (
  lovable_order_id,
  lovable_order_number,
  wellcrafted_order_id,
  customer_name,
  lovable_date,
  lovable_total,
  wellcrafted_total,
  lines_copied,
  match_method,
  match_quality
)
SELECT
  mo.lovable_order_id,
  mo.lovable_order_number,
  mo.wellcrafted_order_id,
  mo.customer_name,
  mo.lovable_date,
  mo.lovable_total,
  mo.wellcrafted_total,
  (SELECT COUNT(*) FROM lovable.orderline WHERE orderid = mo.lovable_order_id),
  'customer_name_date_amount',
  mo.match_quality
FROM matched_orders mo;

-- Step 3: Display migration summary
DO $$
DECLARE
  v_orders_migrated INT;
  v_lines_copied INT;
  v_perfect_matches INT;
  v_good_matches INT;
BEGIN
  SELECT
    COUNT(*),
    SUM(lines_copied),
    COUNT(*) FILTER (WHERE match_quality = 'PERFECT'),
    COUNT(*) FILTER (WHERE match_quality = 'GOOD')
  INTO v_orders_migrated, v_lines_copied, v_perfect_matches, v_good_matches
  FROM migration_log;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Orders migrated: %', v_orders_migrated;
  RAISE NOTICE 'OrderLines copied: %', v_lines_copied;
  RAISE NOTICE 'Perfect matches: %', v_perfect_matches;
  RAISE NOTICE 'Good matches: %', v_good_matches;
  RAISE NOTICE '====================================';
END $$;

-- Step 4: Show detailed migration results
SELECT
  match_quality,
  COUNT(*) as order_count,
  SUM(lines_copied) as total_lines,
  ROUND(AVG(lines_copied), 2) as avg_lines_per_order,
  MIN(lovable_date::DATE) as earliest_order,
  MAX(lovable_date::DATE) as latest_order
FROM migration_log
GROUP BY match_quality
ORDER BY
  CASE match_quality
    WHEN 'PERFECT' THEN 1
    WHEN 'GOOD' THEN 2
    ELSE 3
  END;

-- Step 5: Sample migrated orders for verification
SELECT
  lovable_order_number,
  customer_name,
  lovable_date::DATE as order_date,
  lovable_total,
  wellcrafted_total,
  lines_copied,
  match_quality
FROM migration_log
ORDER BY migrated_at DESC
LIMIT 20;

-- Step 6: Verify no duplicate OrderLines were created
WITH duplicate_check AS (
  SELECT
    orderid,
    COUNT(*) as total_lines,
    COUNT(DISTINCT (skuid, quantity, unitprice)) as unique_line_signatures
  FROM lovable.orderline
  GROUP BY orderid
  HAVING COUNT(*) != COUNT(DISTINCT (skuid, quantity, unitprice))
)
SELECT
  CASE
    WHEN COUNT(*) = 0 THEN 'OK: No duplicates detected'
    ELSE 'WARNING: ' || COUNT(*) || ' orders have duplicate line items'
  END as duplicate_status
FROM duplicate_check;

-- Step 7: Final statistics
SELECT
  'BEFORE MIGRATION' as status,
  220 as orders_with_lines,
  780 as orders_without_lines,
  (220.0 / 1000.0 * 100)::NUMERIC(5,2) as completion_percentage
UNION ALL
SELECT
  'AFTER MIGRATION' as status,
  220 + (SELECT COUNT(*) FROM migration_log) as orders_with_lines,
  780 - (SELECT COUNT(*) FROM migration_log) as orders_without_lines,
  ((220.0 + (SELECT COUNT(*) FROM migration_log)) / 1000.0 * 100)::NUMERIC(5,2) as completion_percentage;

COMMIT;

-- ============================================
-- POST-MIGRATION VERIFICATION QUERIES
-- ============================================
-- Run these after COMMIT to verify migration success

-- Check total OrderLines
SELECT COUNT(*) as total_orderlines FROM lovable.orderline;

-- Check orders with vs without lines
SELECT
  COUNT(*) FILTER (WHERE orderline_count > 0) as orders_with_lines,
  COUNT(*) FILTER (WHERE orderline_count = 0) as orders_without_lines,
  ROUND((COUNT(*) FILTER (WHERE orderline_count > 0)::NUMERIC / COUNT(*)) * 100, 2) as completion_percentage
FROM (
  SELECT
    o.id,
    (SELECT COUNT(*) FROM lovable.orderline ol WHERE ol.orderid = o.id) as orderline_count
  FROM lovable.order o
) order_summary;

-- Sample orders to manually verify
SELECT
  o.ordernumber,
  c.name as customer,
  o.orderedat::DATE,
  o.total as order_total,
  COUNT(ol.id) as line_count,
  SUM(ol.quantity * ol.unitprice) as calculated_total,
  ABS(o.total - SUM(ol.quantity * ol.unitprice)) as total_difference
FROM lovable.order o
JOIN lovable.customer c ON o.customerid = c.id
LEFT JOIN lovable.orderline ol ON ol.orderid = o.id
WHERE EXISTS (SELECT 1 FROM lovable.orderline WHERE orderid = o.id)
GROUP BY o.id, o.ordernumber, c.name, o.orderedat, o.total
ORDER BY o.orderedat DESC
LIMIT 20;

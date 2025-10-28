-- ============================================
-- TEST ORDER MATCHING QUALITY
-- ============================================
-- Purpose: Preview order matching before bulk migration
-- Run this SECOND after verifying customer mapping
--
-- This script shows:
--   1. How many Lovable orders can be matched
--   2. Match quality (exact vs fuzzy)
--   3. Sample matched pairs for manual verification
--
-- DO NOT INSERT - This is read-only testing
-- ============================================

-- Matching statistics
WITH potential_matches AS (
  SELECT DISTINCT ON (lv_order.id)
    lv_order.id as lovable_order_id,
    wc_order.id as wellcrafted_order_id,
    CASE
      WHEN LOWER(TRIM(lv_cust.name)) = LOWER(TRIM(wc_cust."name")) THEN 1
      ELSE 0
    END as customer_exact_match,
    CASE
      WHEN DATE(lv_order.orderedat) = DATE(wc_order."orderedAt") THEN 1
      ELSE 0
    END as date_exact_match,
    CASE
      WHEN ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 0.01 THEN 1
      WHEN lv_order.total IS NOT NULL AND wc_order."total" IS NULL THEN 0.5
      ELSE 0
    END as amount_match,
    (SELECT COUNT(*) FROM wellcrafted."OrderLine" WHERE "orderId" = wc_order.id) as orderlines_available
  FROM lovable.order lv_order
  JOIN lovable.customer lv_cust ON lv_order.customerid = lv_cust.id
  JOIN wellcrafted."Customer" wc_cust ON LOWER(TRIM(lv_cust.name)) = LOWER(TRIM(wc_cust."name"))
  JOIN wellcrafted."Order" wc_order ON wc_order."customerId" = wc_cust.id
  WHERE
    -- Date tolerance: exact or +/- 1 day
    DATE(lv_order.orderedat) BETWEEN DATE(wc_order."orderedAt") - 1 AND DATE(wc_order."orderedAt") + 1
    -- Amount tolerance: exact or NULL in Well Crafted
    AND (
      ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 1.00
      OR wc_order."total" IS NULL
    )
    -- Only orders without existing OrderLines
    AND NOT EXISTS (
      SELECT 1 FROM lovable.orderline WHERE orderid = lv_order.id
    )
  ORDER BY lv_order.id, wc_order."updatedAt" DESC
)
SELECT
  COUNT(*) as total_potential_matches,
  COUNT(*) FILTER (WHERE customer_exact_match = 1) as exact_customer_matches,
  COUNT(*) FILTER (WHERE date_exact_match = 1) as exact_date_matches,
  COUNT(*) FILTER (WHERE amount_match >= 1) as exact_amount_matches,
  COUNT(*) FILTER (WHERE customer_exact_match = 1 AND date_exact_match = 1 AND amount_match >= 1) as perfect_matches,
  COUNT(*) FILTER (WHERE orderlines_available > 0) as matches_with_orderlines,
  COUNT(*) FILTER (WHERE orderlines_available = 0) as matches_without_orderlines,
  SUM(orderlines_available) as total_orderlines_to_copy
FROM potential_matches;

-- Sample matched pairs for manual verification (first 20)
WITH matched_pairs AS (
  SELECT DISTINCT ON (lv_order.id)
    lv_order.id as lovable_order_id,
    lv_order.ordernumber as lovable_order_number,
    lv_cust.name as lovable_customer,
    lv_order.orderedat as lovable_date,
    lv_order.total as lovable_total,
    wc_order.id as wellcrafted_order_id,
    wc_cust."name" as wellcrafted_customer,
    wc_order."orderedAt" as wellcrafted_date,
    wc_order."total" as wellcrafted_total,
    (SELECT COUNT(*) FROM wellcrafted."OrderLine" WHERE "orderId" = wc_order.id) as orderlines_count,
    ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) as amount_difference,
    DATE(lv_order.orderedat) - DATE(wc_order."orderedAt") as date_difference_days
  FROM lovable.order lv_order
  JOIN lovable.customer lv_cust ON lv_order.customerid = lv_cust.id
  JOIN wellcrafted."Customer" wc_cust ON LOWER(TRIM(lv_cust.name)) = LOWER(TRIM(wc_cust."name"))
  JOIN wellcrafted."Order" wc_order ON wc_order."customerId" = wc_cust.id
  WHERE
    DATE(lv_order.orderedat) BETWEEN DATE(wc_order."orderedAt") - 1 AND DATE(wc_order."orderedAt") + 1
    AND (
      ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 1.00
      OR wc_order."total" IS NULL
    )
    AND NOT EXISTS (
      SELECT 1 FROM lovable.orderline WHERE orderid = lv_order.id
    )
  ORDER BY lv_order.id, wc_order."updatedAt" DESC
)
SELECT
  lovable_order_number,
  lovable_customer,
  lovable_date,
  lovable_total,
  wellcrafted_date,
  wellcrafted_total,
  orderlines_count,
  amount_difference,
  date_difference_days,
  CASE
    WHEN amount_difference < 0.01 AND date_difference_days = 0 THEN 'PERFECT'
    WHEN amount_difference < 1.00 AND date_difference_days = 0 THEN 'GOOD'
    WHEN date_difference_days != 0 THEN 'DATE_MISMATCH'
    ELSE 'AMOUNT_MISMATCH'
  END as match_quality
FROM matched_pairs
ORDER BY match_quality, lovable_order_number
LIMIT 20;

-- Problematic matches (ambiguous or low quality)
WITH duplicate_matches AS (
  SELECT
    lv_order.id as lovable_order_id,
    lv_order.ordernumber,
    lv_cust.name as customer_name,
    COUNT(wc_order.id) as wellcrafted_match_count
  FROM lovable.order lv_order
  JOIN lovable.customer lv_cust ON lv_order.customerid = lv_cust.id
  JOIN wellcrafted."Customer" wc_cust ON LOWER(TRIM(lv_cust.name)) = LOWER(TRIM(wc_cust."name"))
  JOIN wellcrafted."Order" wc_order ON wc_order."customerId" = wc_cust.id
  WHERE
    DATE(lv_order.orderedat) = DATE(wc_order."orderedAt")
    AND ABS(COALESCE(lv_order.total, 0) - COALESCE(wc_order."total", 0)) < 1.00
    AND NOT EXISTS (
      SELECT 1 FROM lovable.orderline WHERE orderid = lv_order.id
    )
  GROUP BY lv_order.id, lv_order.ordernumber, lv_cust.name
  HAVING COUNT(wc_order.id) > 1
)
SELECT
  ordernumber,
  customer_name,
  wellcrafted_match_count as duplicate_count
FROM duplicate_matches
ORDER BY wellcrafted_match_count DESC
LIMIT 20;

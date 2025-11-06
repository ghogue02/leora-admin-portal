-- Admin Revenue Verification Script
-- Run this to verify the fix is working correctly

-- 1. Check current week delivered orders (what admin dashboard should show)
SELECT
  COUNT(*) as order_count,
  SUM(total) as total_revenue,
  MIN("deliveredAt") as earliest_delivery,
  MAX("deliveredAt") as latest_delivery
FROM "Order"
WHERE
  "deliveredAt" >= date_trunc('week', CURRENT_DATE + INTERVAL '1 day')  -- Monday of current week
  AND "deliveredAt" <= date_trunc('week', CURRENT_DATE + INTERVAL '1 day') + INTERVAL '6 days'  -- Sunday of current week
  AND status != 'CANCELLED';

-- 2. Compare with what the OLD query would have returned (orderedAt)
SELECT
  COUNT(*) as order_count_old_way,
  SUM(total) as total_revenue_old_way
FROM "Order"
WHERE
  "orderedAt" >= date_trunc('week', CURRENT_DATE)  -- Sunday-based, no upper limit
  AND status != 'CANCELLED';

-- 3. Detailed breakdown by status
SELECT
  status,
  COUNT(*) as order_count,
  SUM(total) as total_revenue
FROM "Order"
WHERE
  "deliveredAt" >= date_trunc('week', CURRENT_DATE + INTERVAL '1 day')
  AND "deliveredAt" <= date_trunc('week', CURRENT_DATE + INTERVAL '1 day') + INTERVAL '6 days'
GROUP BY status
ORDER BY status;

-- 4. Check for orders with orderedAt but no deliveredAt (potential data issues)
SELECT
  COUNT(*) as orders_without_delivery,
  SUM(total) as potential_missing_revenue
FROM "Order"
WHERE
  "orderedAt" IS NOT NULL
  AND "deliveredAt" IS NULL
  AND status NOT IN ('CANCELLED', 'DRAFT');

-- 5. Week-by-week revenue comparison (last 4 weeks)
SELECT
  date_trunc('week', "deliveredAt" + INTERVAL '1 day') as week_start,
  COUNT(*) as order_count,
  SUM(total) as total_revenue
FROM "Order"
WHERE
  "deliveredAt" >= CURRENT_DATE - INTERVAL '4 weeks'
  AND status != 'CANCELLED'
GROUP BY week_start
ORDER BY week_start DESC;

-- 6. Verify date-fns week calculation matches
-- (Run this to confirm Monday is start of week)
SELECT
  CURRENT_DATE as today,
  date_trunc('week', CURRENT_DATE + INTERVAL '1 day') as monday_this_week,
  date_trunc('week', CURRENT_DATE + INTERVAL '1 day') + INTERVAL '6 days' as sunday_this_week;

-- EXPECTED RESULTS:
-- Query 1: Should match what admin dashboard now shows
-- Query 2: Should show the WRONG calculation (what it was before)
-- Query 3: Should show cancelled orders excluded
-- Query 4: Should be 0 or very low (completed orders should have deliveredAt)
-- Query 5: Should show consistent week-over-week revenue
-- Query 6: Should show Monday start, Sunday end

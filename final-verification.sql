-- Final Verification and Insights

-- 1. Confirm record counts
SELECT 
  '=== RECORD COUNTS ===' as section,
  '' as detail;

SELECT 
  'Total Snapshots Created' as metric,
  COUNT(*) as value
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- 2. Validate data integrity
SELECT 
  '=== DATA INTEGRITY ===' as section,
  '' as detail;

SELECT 
  'All customers have snapshots' as check_name,
  CASE 
    WHEN COUNT(DISTINCT c.id) = COUNT(DISTINCT ahs."customerId") THEN 'PASSED ✓'
    ELSE 'FAILED ✗'
  END as status,
  COUNT(DISTINCT c.id) as total_customers,
  COUNT(DISTINCT ahs."customerId") as customers_with_snapshots
FROM "Customer" c
LEFT JOIN "AccountHealthSnapshot" ahs ON ahs."customerId" = c.id 
  AND ahs."tenantId" = c."tenantId"
WHERE c."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- 3. Score validation
SELECT 
  '=== SCORE VALIDATION ===' as section,
  '' as detail;

SELECT 
  'Scores within valid range (0-100)' as check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASSED ✓'
    ELSE 'FAILED ✗'
  END as status,
  COUNT(*) as invalid_records
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ("revenueScore" < 0 OR "revenueScore" > 100
    OR "cadenceScore" < 0 OR "cadenceScore" > 100
    OR "sampleUtilization" < 0 OR "sampleUtilization" > 100);

-- 4. Show customers needing immediate attention
SELECT 
  '=== CUSTOMERS NEEDING ATTENTION ===' as section,
  '' as detail;

SELECT 
  c.name as customer_name,
  c.city || ', ' || c.state as location,
  ahs."revenueScore",
  ahs."cadenceScore",
  ahs.notes,
  COUNT(o.id) as total_orders,
  MAX(o."orderedAt") as last_order_date,
  EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER as days_since_last_order
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
LEFT JOIN "Order" o ON o."customerId" = c.id 
  AND o."tenantId" = c."tenantId"
  AND o."orderedAt" IS NOT NULL
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs.notes IN ('At risk - over 3 months since last order', 
                     'Inactive - over 6 months since last order',
                     'Needs attention - over 2 months since last order')
GROUP BY c.id, c.name, c.city, c.state, ahs."revenueScore", ahs."cadenceScore", ahs.notes
ORDER BY days_since_last_order DESC
LIMIT 10;

-- 5. Show best performers by state
SELECT 
  '=== TOP PERFORMERS BY STATE ===' as section,
  '' as detail;

SELECT 
  c.state,
  COUNT(*) as high_performing_customers,
  ROUND(AVG(ahs."revenueScore"), 2) as avg_revenue_score,
  ROUND(AVG(ahs."cadenceScore"), 2) as avg_cadence_score
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs."revenueScore" >= 80
  AND c.state IS NOT NULL
GROUP BY c.state
HAVING COUNT(*) >= 3
ORDER BY high_performing_customers DESC
LIMIT 10;

-- 6. Summary statistics
SELECT 
  '=== SUMMARY STATISTICS ===' as section,
  '' as detail;

SELECT 
  'Average Health Score' as metric,
  ROUND(AVG((ahs."revenueScore" + ahs."cadenceScore" + ahs."sampleUtilization") / 3.0), 2)::TEXT as value
FROM "AccountHealthSnapshot" ahs
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'Median Revenue Score',
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "revenueScore")::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'Median Cadence Score',
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "cadenceScore")::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'High Performers (Score >= 60)',
  COUNT(*)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ("revenueScore" + "cadenceScore" + "sampleUtilization") / 3 >= 60;

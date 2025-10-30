-- Verify snapshot creation
SELECT 
  'Total Customers' as category,
  COUNT(*)::TEXT as count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'Customers with Orders',
  COUNT(DISTINCT "customerId")::TEXT
FROM "Order"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND "orderedAt" IS NOT NULL
UNION ALL
SELECT 
  'Total Snapshots Created',
  COUNT(*)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'Snapshots with Orders (Revenue > 0)',
  COUNT(*)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND "revenueScore" > 0
UNION ALL
SELECT 
  'Snapshots without Orders (Revenue = 0)',
  COUNT(*)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND "revenueScore" = 0;

-- Score distribution
SELECT 
  'Revenue Score Distribution' as analysis,
  CASE
    WHEN "revenueScore" >= 80 THEN 'Excellent (80-100)'
    WHEN "revenueScore" >= 60 THEN 'Good (60-79)'
    WHEN "revenueScore" >= 40 THEN 'Fair (40-59)'
    WHEN "revenueScore" >= 20 THEN 'Poor (20-39)'
    ELSE 'Very Poor (0-19)'
  END as range,
  COUNT(*) as customer_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY range
ORDER BY range;

SELECT 
  'Cadence Score Distribution' as analysis,
  CASE
    WHEN "cadenceScore" >= 80 THEN 'Excellent (80-100)'
    WHEN "cadenceScore" >= 60 THEN 'Good (60-79)'
    WHEN "cadenceScore" >= 40 THEN 'Fair (40-59)'
    WHEN "cadenceScore" >= 20 THEN 'Poor (20-39)'
    ELSE 'Very Poor (0-19)'
  END as range,
  COUNT(*) as customer_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY range
ORDER BY range;

-- Top 10 customers by combined health score
SELECT 
  c.name as customer_name,
  ahs."revenueScore",
  ahs."cadenceScore",
  ahs."sampleUtilization",
  (ahs."revenueScore" + ahs."cadenceScore" + ahs."sampleUtilization") / 3 as avg_health_score,
  ahs.notes
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
ORDER BY avg_health_score DESC
LIMIT 10;

-- Bottom 10 customers (excluding those with no orders)
SELECT 
  c.name as customer_name,
  ahs."revenueScore",
  ahs."cadenceScore",
  ahs."sampleUtilization",
  (ahs."revenueScore" + ahs."cadenceScore" + ahs."sampleUtilization") / 3 as avg_health_score,
  ahs.notes
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND ahs."revenueScore" > 0
ORDER BY avg_health_score ASC
LIMIT 10;

-- Customer activity status breakdown
SELECT 
  ahs.notes as status,
  COUNT(*) as customer_count,
  ROUND(AVG(ahs."revenueScore"), 2) as avg_revenue_score,
  ROUND(AVG(ahs."cadenceScore"), 2) as avg_cadence_score
FROM "AccountHealthSnapshot" ahs
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY ahs.notes
ORDER BY customer_count DESC;

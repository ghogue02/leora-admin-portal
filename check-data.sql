-- Check current state
SELECT 
  'Invoices' as table_name, 
  COUNT(*) as count 
FROM "Invoice" 
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'Customers with Orders', 
  COUNT(DISTINCT o."customerId")
FROM "Order" o
WHERE o."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT 
  'AccountHealthSnapshots',
  COUNT(*)
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Check sample order data
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c."orderingPaceDays",
  COUNT(o.id) as order_count,
  MIN(o."orderedAt") as first_order,
  MAX(o."orderedAt") as last_order,
  SUM(o.total) as total_revenue
FROM "Customer" c
LEFT JOIN "Order" o ON o."customerId" = c.id
WHERE c."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY c.id, c.name, c."orderingPaceDays"
ORDER BY order_count DESC
LIMIT 5;

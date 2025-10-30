-- Verify Email Fix Results
-- Run these queries to check the success of the email update process

-- 1. Overall Statistics
SELECT
  COUNT(*) as total_customers,
  COUNT("email") as customers_with_email,
  COUNT(*) - COUNT("email") as customers_missing_email,
  ROUND(COUNT("email")::numeric / COUNT(*)::numeric * 100, 2) as email_coverage_pct
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- 2. Email Source Breakdown
SELECT
  CASE
    WHEN email IS NULL THEN 'No Email'
    WHEN email LIKE '%@placeholder.local' THEN 'Placeholder'
    WHEN email = 'noemail@wellcrafted.com' THEN 'No Email Marker'
    ELSE 'Real Email'
  END as email_type,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed')::numeric * 100, 2) as percentage
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY email_type
ORDER BY count DESC;

-- 3. Sample of Updated Emails
SELECT
  name as company_name,
  email,
  CASE
    WHEN email LIKE '%@placeholder.local' THEN 'Placeholder'
    WHEN email = 'noemail@wellcrafted.com' THEN 'No Email Marker'
    ELSE 'Real Email'
  END as email_type
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
ORDER BY RANDOM()
LIMIT 20;

-- 4. Customers Still Missing Emails
SELECT
  id,
  name,
  phone,
  "createdAt"
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NULL
LIMIT 20;

-- 5. Email Domain Distribution (Real Emails Only)
SELECT
  SUBSTRING(email FROM POSITION('@' IN email) + 1) as email_domain,
  COUNT(*) as count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
  AND email NOT LIKE '%@placeholder.local'
  AND email != 'noemail@wellcrafted.com'
GROUP BY email_domain
ORDER BY count DESC
LIMIT 20;

-- 6. Duplicate Email Check
SELECT
  email,
  COUNT(*) as customer_count,
  STRING_AGG(name, ', ') as companies
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
  AND email NOT LIKE '%@placeholder.local'
  AND email != 'noemail@wellcrafted.com'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY customer_count DESC;

-- 7. Customers Ready for Mailchimp Sync
SELECT COUNT(*) as mailchimp_ready_count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
  AND email NOT LIKE '%@placeholder.local'
  AND email != 'noemail@wellcrafted.com'
  AND email LIKE '%@%'
  AND email NOT LIKE '% %'; -- No spaces

-- 8. Email Quality Checks
SELECT
  'Valid Email Format' as check_type,
  COUNT(*) as count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'

UNION ALL

SELECT
  'Invalid Email Format' as check_type,
  COUNT(*) as count
FROM "Customer"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND email IS NOT NULL
  AND email NOT LIKE '%@placeholder.local'
  AND email != 'noemail@wellcrafted.com'
  AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';

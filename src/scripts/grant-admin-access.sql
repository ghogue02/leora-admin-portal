-- Grant Admin Access to a User
-- Replace 'your-email@example.com' with your actual email address

-- 1. First, check if admin role exists, if not create it
INSERT INTO "Role" (id, "tenantId", code, name, description, "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  t.id,
  'sales.admin',
  'Sales Admin',
  'Full administrative access to sales admin portal',
  NOW(),
  NOW()
FROM "Tenant" t
WHERE NOT EXISTS (
  SELECT 1 FROM "Role" WHERE code = 'sales.admin' AND "tenantId" = t.id
)
LIMIT 1;

-- 2. Grant the role to your user (UPDATE THE EMAIL ADDRESS!)
INSERT INTO "UserRole" ("userId", "roleId", "tenantId", "createdAt", "updatedAt")
SELECT
  u.id,
  r.id,
  u."tenantId",
  NOW(),
  NOW()
FROM "User" u
CROSS JOIN "Role" r
WHERE u.email = 'your-email@example.com'  -- ← CHANGE THIS TO YOUR EMAIL
  AND r.code = 'sales.admin'
  AND u."tenantId" = r."tenantId"
  AND NOT EXISTS (
    SELECT 1 FROM "UserRole"
    WHERE "userId" = u.id AND "roleId" = r.id
  )
LIMIT 1;

-- 3. Verify the grant
SELECT
  u.email,
  u."fullName",
  r.code as role_code,
  r.name as role_name
FROM "User" u
JOIN "UserRole" ur ON ur."userId" = u.id
JOIN "Role" r ON r.id = ur."roleId"
WHERE u.email = 'your-email@example.com'  -- ← CHANGE THIS TO YOUR EMAIL
ORDER BY r.code;

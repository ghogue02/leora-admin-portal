-- Create single admin user for testing (Travis Vernon)
-- Password will be: admin123

DO $$
DECLARE
    tenant_id UUID;
    travis_user_id UUID;
    admin_role_id UUID;
BEGIN
    -- Get tenant
    SELECT id INTO tenant_id FROM "Tenant" WHERE slug = 'well-crafted' LIMIT 1;

    -- Create or update Travis as admin user
    INSERT INTO "User" (id, "tenantId", email, "fullName", "hashedPassword", "isActive", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        'admin@wellcraftedbeverage.com',
        'Travis Vernon (Admin)',
        '$2a$10$rQ2VBXZvYJF8YMEqX.zq2.8K8vZqN8qJZqF8K8K8K8K8K8K8K8K8Ke', -- admin123
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT ("tenantId", email) DO UPDATE
    SET "hashedPassword" = '$2a$10$rQ2VBXZvYJF8YMEqX.zq2.8K8vZqN8qJZqF8K8K8K8K8K8K8K8K8Ke',
        "fullName" = 'Travis Vernon (Admin)',
        "isActive" = true
    RETURNING id INTO travis_user_id;

    -- Get or create admin role
    INSERT INTO "Role" (id, "tenantId", name, code, "isDefault", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        'Administrator',
        'admin',
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT ("tenantId", code) DO UPDATE SET name = 'Administrator'
    RETURNING id INTO admin_role_id;

    -- Assign admin role to Travis
    INSERT INTO "UserRole" ("userId", "roleId")
    VALUES (travis_user_id, admin_role_id)
    ON CONFLICT DO NOTHING;

    -- Create SalesRep profile for Travis
    INSERT INTO "SalesRep" (id, "tenantId", "userId", "territoryName", "deliveryDay", "weeklyRevenueQuota", "monthlyRevenueQuota", "quarterlyRevenueQuota", "annualRevenueQuota", "weeklyCustomerQuota", "sampleAllowancePerMonth", "isActive", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        travis_user_id,
        'Virginia Territory',
        'Thursday',
        50000.00,
        200000.00,
        600000.00,
        2400000.00,
        25,
        60,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT ("tenantId", "userId") DO UPDATE
    SET "territoryName" = 'Virginia Territory',
        "deliveryDay" = 'Thursday',
        "isActive" = true;

    RAISE NOTICE 'Created admin user: admin@wellcraftedbeverage.com / admin123';
END $$;

SELECT 'Admin user ready!' as status;

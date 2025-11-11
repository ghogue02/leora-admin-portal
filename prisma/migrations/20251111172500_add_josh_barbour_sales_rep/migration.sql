-- Ensure Josh Barbour exists as a user + sales rep for manager impersonation

DO $$
DECLARE
    tenant_id UUID;
    user_id UUID;
BEGIN
    SELECT id INTO tenant_id
    FROM "Tenant"
    WHERE slug = 'well-crafted'
    LIMIT 1;

    IF tenant_id IS NULL THEN
        RAISE NOTICE 'Tenant not found, skipping Josh Barbour backfill';
        RETURN;
    END IF;

    SELECT id INTO user_id
    FROM "User"
    WHERE "tenantId" = tenant_id
      AND email = 'josh@wellcraftedbeverage.com'
    LIMIT 1;

    IF user_id IS NULL THEN
        INSERT INTO "User" (
            id,
            "tenantId",
            email,
            "fullName",
            "hashedPassword",
            "isActive",
            "createdAt",
            "updatedAt"
        )
        VALUES (
            gen_random_uuid(),
            tenant_id,
            'josh@wellcraftedbeverage.com',
            'Josh Barbour',
            '$2a$10$dummy.hash.for.now.will.be.updated.later',
            TRUE,
            NOW(),
            NOW()
        )
        RETURNING id INTO user_id;
    END IF;

    INSERT INTO "SalesRep" (
        id,
        "tenantId",
        "userId",
        "territoryName",
        "deliveryDay",
        "weeklyRevenueQuota",
        "monthlyRevenueQuota",
        "quarterlyRevenueQuota",
        "annualRevenueQuota",
        "weeklyCustomerQuota",
        "sampleAllowancePerMonth",
        "isActive",
        "createdAt",
        "updatedAt"
    )
    SELECT
        gen_random_uuid(),
        tenant_id,
        user_id,
        'Sales Manager',
        'Monday',
        0,
        0,
        0,
        0,
        0,
        0,
        TRUE,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1
        FROM "SalesRep"
        WHERE "tenantId" = tenant_id
          AND "userId" = user_id
    );
END $$;

-- Create User accounts for sales reps
-- These will be linked to SalesRep profiles

-- Get tenant ID
DO $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT id INTO tenant_id FROM "Tenant" WHERE slug = 'well-crafted' LIMIT 1;

    -- Create User for Kelly Neel
    INSERT INTO "User" (id, "tenantId", email, "fullName", "hashedPassword", "isActive", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        'kelly@wellcraftedbeverage.com',
        'Kelly Neel',
        '$2a$10$dummy.hash.for.now.will.be.updated.later',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT ("tenantId", email) DO NOTHING;

    -- Create User for Travis Vernon
    INSERT INTO "User" (id, "tenantId", email, "fullName", "hashedPassword", "isActive", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        'travis@wellcraftedbeverage.com',
        'Travis Vernon',
        '$2a$10$dummy.hash.for.now.will.be.updated.later',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT ("tenantId", email) DO NOTHING;

    -- Create User for Carolyn Vernon
    INSERT INTO "User" (id, "tenantId", email, "fullName", "hashedPassword", "isActive", "createdAt", "updatedAt")
    VALUES (
        gen_random_uuid(),
        tenant_id,
        'carolyn@wellcraftedbeverage.com',
        'Carolyn Vernon',
        '$2a$10$dummy.hash.for.now.will.be.updated.later',
        true,
        NOW(),
        NOW()
    ) ON CONFLICT ("tenantId", email) DO NOTHING;

    RAISE NOTICE 'Created 3 sales rep user accounts';
END $$;

SELECT 'User creation complete' as status;

-- Fast customer assignment to sales reps
-- Assigns all unassigned customers evenly across 3 reps

DO $$
DECLARE
    tenant_id UUID;
    kelly_rep_id UUID;
    travis_rep_id UUID;
    carolyn_rep_id UUID;
    customer_rec RECORD;
    rep_index INT := 0;
    current_rep_id UUID;
BEGIN
    -- Get tenant and sales rep IDs
    SELECT id INTO tenant_id FROM "Tenant" WHERE slug = 'well-crafted' LIMIT 1;

    SELECT sr.id INTO kelly_rep_id
    FROM "SalesRep" sr
    JOIN "User" u ON sr."userId" = u.id
    WHERE u.email = 'kelly@wellcraftedbeverage.com'
    LIMIT 1;

    SELECT sr.id INTO travis_rep_id
    FROM "SalesRep" sr
    JOIN "User" u ON sr."userId" = u.id
    WHERE u.email = 'travis@wellcraftedbeverage.com'
    LIMIT 1;

    SELECT sr.id INTO carolyn_rep_id
    FROM "SalesRep" sr
    JOIN "User" u ON sr."userId" = u.id
    WHERE u.email = 'carolyn@wellcraftedbeverage.com'
    LIMIT 1;

    RAISE NOTICE 'Found sales reps: Kelly=%, Travis=%, Carolyn=%', kelly_rep_id, travis_rep_id, carolyn_rep_id;

    -- Assign customers in round-robin fashion
    FOR customer_rec IN
        SELECT id FROM "Customer"
        WHERE "salesRepId" IS NULL
        ORDER BY name
    LOOP
        -- Cycle through reps (0=Kelly, 1=Travis, 2=Carolyn)
        IF rep_index = 0 THEN
            current_rep_id := kelly_rep_id;
        ELSIF rep_index = 1 THEN
            current_rep_id := travis_rep_id;
        ELSE
            current_rep_id := carolyn_rep_id;
        END IF;

        -- Update customer
        UPDATE "Customer"
        SET "salesRepId" = current_rep_id
        WHERE id = customer_rec.id;

        -- Create assignment record
        INSERT INTO "CustomerAssignment" (id, "tenantId", "salesRepId", "customerId", "assignedAt")
        VALUES (gen_random_uuid(), tenant_id, current_rep_id, customer_rec.id, NOW());

        -- Increment and wrap around
        rep_index := (rep_index + 1) % 3;
    END LOOP;

    RAISE NOTICE 'Customer assignment complete!';
END $$;

-- Show results
SELECT
    u."fullName" as "Sales Rep",
    COUNT(c.id) as "Customers Assigned"
FROM "SalesRep" sr
JOIN "User" u ON sr."userId" = u.id
LEFT JOIN "Customer" c ON c."salesRepId" = sr.id
GROUP BY sr.id, u."fullName"
ORDER BY u."fullName";

SELECT 'Assignment complete!' as status;

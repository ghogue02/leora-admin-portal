-- CRM-83: Standardize sales team email addresses to firstname@wellcraftedbeverage.com
-- https://greghogue.atlassian.net/browse/CRM-83
--
-- IMPORTANT: Configure email forwards BEFORE running this script!
-- See docs/CRM-83-EMAIL-STANDARDIZATION.md for full details

BEGIN;

-- Verify current state before changes
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRM-83: Email Standardization';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Current sales team emails:';
END $$;

SELECT
    "fullName",
    email,
    CASE
        WHEN email LIKE '%@wellcraftedbeverage.com' AND email NOT LIKE '%.%@%' AND email NOT LIKE '%-%@%'
        THEN '✓ Already standard'
        ELSE '⚠ Needs update'
    END as status
FROM "User"
WHERE "salesRepProfile" IS NOT NULL
  AND "isActive" = true
ORDER BY "fullName";

-- Update Group 1: Simple domain changes (wellcrafted.com → wellcraftedbeverage.com)
UPDATE "User" SET email = 'angela@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'angela@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

UPDATE "User" SET email = 'ebony@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'ebony@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

UPDATE "User" SET email = 'jose@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'jose@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

UPDATE "User" SET email = 'mike@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'mike@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

UPDATE "User" SET email = 'nicole@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'nicole@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

-- Update Group 2: Remove special characters + domain change
UPDATE "User" SET email = 'jared@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'jared.lorenz@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

-- Rosa-Anna: Keep hyphen as requested by Greg
UPDATE "User" SET email = 'rosa-anna@wellcraftedbeverage.com', "updatedAt" = NOW()
WHERE email = 'rosa-anna@wellcrafted.com'
  AND "salesRepProfile" IS NOT NULL;

-- Verify results
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Updates Applied - Verification:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
END $$;

SELECT
    "fullName",
    email,
    CASE
        WHEN email ~ '^[a-z]+@wellcraftedbeverage\.com$' THEN '✓ Compliant'
        ELSE '✗ Non-compliant: ' || email
    END as compliance_status
FROM "User"
WHERE "salesRepProfile" IS NOT NULL
  AND "isActive" = true
ORDER BY "fullName";

-- Count of compliant vs non-compliant
SELECT
    COUNT(*) FILTER (WHERE email ~ '^[a-z]+@wellcraftedbeverage\.com$') as compliant_count,
    COUNT(*) FILTER (WHERE NOT email ~ '^[a-z]+@wellcraftedbeverage\.com$') as non_compliant_count,
    COUNT(*) as total_sales_reps
FROM "User"
WHERE "salesRepProfile" IS NOT NULL
  AND "isActive" = true;

-- If everything looks good, commit. Otherwise rollback.
-- COMMIT;
ROLLBACK; -- Comment this and uncomment COMMIT above when ready to execute

/*
ACCEPTANCE CRITERIA CHECKLIST:
[ ] Every sales team member has email in format firstname@wellcraftedbeverage.com
[ ] No dots or special characters in local-part
[ ] Email forwards configured at provider level
[ ] Users notified of change
[ ] Test logins confirmed working
[ ] System notifications tested
[ ] Documented changes

NEXT STEPS:
1. Configure email forwards at email provider
2. Notify affected users:
   - Angela Fultz
   - Ebony Booth
   - Jared Lorenz
   - Jose Bustillo
   - Mike Allen
   - Nicole Shenandoah
   - Rosa-Anna Winchell
3. Run this script in Supabase SQL Editor
4. Change ROLLBACK to COMMIT when verification passes
5. Test user logins
6. Update CRM-83 ticket to Done
*/

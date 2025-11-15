# CRM-83: Email Standardization Report

## Current Status Analysis

Based on the database query, here are the current sales team email addresses:

| Full Name | Current Email | Territory | Status |
|-----------|---------------|-----------|--------|
| Angela Fultz | angela@wellcrafted.com | Hampton Roads | ❌ Needs Update |
| Ebony Booth | ebony@wellcrafted.com | DC & Eastern MD | ❌ Needs Update |
| Jared Lorenz | jared.lorenz@wellcrafted.com | Western NoVA | ❌ Needs Update (has dot) |
| Jose Bustillo | jose@wellcrafted.com | Baltimore & Frederick | ❌ Needs Update |
| Josh Barbour | josh@wellcraftedbeverage.com | Sales Manager | ✅ Already Standard |
| Mike Allen | mike@wellcrafted.com | Eastern NoVA | ❌ Needs Update |
| Nicole Shenandoah | nicole@wellcrafted.com | Southwest VA | ❌ Needs Update |
| Rosa-Anna Winchell | rosa-anna@wellcrafted.com | Richmond, Charlottesville, & Fredericksburg | ❌ Needs Update (has hyphen) |
| Travis Vernon | travis@wellcraftedbeverage.com | House Accounts | ✅ Already Standard |
| Travis Vernon (Admin) | admin@wellcraftedbeverage.com | House Accounts | ✅ Already Standard |

## Updates Required (7 users)

### Group 1: Domain Change (wellcrafted.com → wellcraftedbeverage.com)

1. **Angela Fultz**
   - OLD: `angela@wellcrafted.com`
   - NEW: `angela@wellcraftedbeverage.com`

2. **Ebony Booth**
   - OLD: `ebony@wellcrafted.com`
   - NEW: `ebony@wellcraftedbeverage.com`

3. **Jose Bustillo**
   - OLD: `jose@wellcrafted.com`
   - NEW: `jose@wellcraftedbeverage.com`

4. **Mike Allen**
   - OLD: `mike@wellcrafted.com`
   - NEW: `mike@wellcraftedbeverage.com`

5. **Nicole Shenandoah**
   - OLD: `nicole@wellcrafted.com`
   - NEW: `nicole@wellcraftedbeverage.com`

### Group 2: Remove Special Characters + Domain Change

6. **Jared Lorenz**
   - OLD: `jared.lorenz@wellcrafted.com`
   - NEW: `jared@wellcraftedbeverage.com` (remove dot)

7. **Rosa-Anna Winchell**
   - OLD: `rosa-anna@wellcrafted.com`
   - NEW: `rosa-anna@wellcraftedbeverage.com` (keep hyphen per Greg's request)

## SQL Update Script

```sql
-- CRM-83: Standardize sales team email addresses
-- Run this in Supabase SQL Editor

BEGIN;

-- Update simple domain changes
UPDATE "User" SET email = 'angela@wellcraftedbeverage.com'
WHERE email = 'angela@wellcrafted.com';

UPDATE "User" SET email = 'ebony@wellcraftedbeverage.com'
WHERE email = 'ebony@wellcrafted.com';

UPDATE "User" SET email = 'jose@wellcraftedbeverage.com'
WHERE email = 'jose@wellcrafted.com';

UPDATE "User" SET email = 'mike@wellcraftedbeverage.com'
WHERE email = 'mike@wellcrafted.com';

UPDATE "User" SET email = 'nicole@wellcraftedbeverage.com'
WHERE email = 'nicole@wellcrafted.com';

-- Remove special characters
UPDATE "User" SET email = 'jared@wellcraftedbeverage.com'
WHERE email = 'jared.lorenz@wellcrafted.com';

-- Rosa-Anna: Choose one option
-- Option 1: Remove hyphen
UPDATE "User" SET email = 'rosaanna@wellcraftedbeverage.com'
WHERE email = 'rosa-anna@wellcrafted.com';

-- Option 2: Use first name only (uncomment if preferred)
-- UPDATE "User" SET email = 'rosa@wellcraftedbeverage.com'
-- WHERE email = 'rosa-anna@wellcrafted.com';

COMMIT;

-- Verify results
SELECT "fullName", email FROM "User"
WHERE "salesRepProfile" IS NOT NULL AND "isActive" = true
ORDER BY "fullName";
```

## Pre-Execution Checklist

- [ ] **Email Forwards Configured**: Set up email forwards at email provider level:
  - angela@wellcrafted.com → angela@wellcraftedbeverage.com
  - ebony@wellcrafted.com → ebony@wellcraftedbeverage.com
  - jared.lorenz@wellcrafted.com → jared@wellcraftedbeverage.com
  - jose@wellcrafted.com → jose@wellcraftedbeverage.com
  - mike@wellcrafted.com → mike@wellcraftedbeverage.com
  - nicole@wellcrafted.com → nicole@wellcraftedbeverage.com
  - rosa-anna@wellcrafted.com → rosa-anna@wellcraftedbeverage.com

- [ ] **Notify Users**: Send email to affected users about the change
- [ ] **Test Login**: Have each user test login with new email address
- [ ] **Verify Notifications**: Confirm system notifications still work

## Post-Execution Verification

After running the SQL script:

1. Run verification query:
```sql
SELECT "fullName", email, "isActive"
FROM "User"
WHERE "salesRepProfile" IS NOT NULL
ORDER BY "fullName";
```

2. Verify all emails match pattern: `firstname@wellcraftedbeverage.com`
3. No dots or hyphens in local-part
4. Test login for each user
5. Test system notifications

## Questions for Travis

1. **Rosa-Anna Winchell**: Should her email be:
   - `rosaanna@wellcraftedbeverage.com` (remove hyphen), OR
   - `rosa@wellcraftedbeverage.com` (use first name only)?

2. **Email Provider**: Do you have access to configure email forwards in the email provider admin panel?

## Acceptance Criteria Status

- [x] Audit completed - 7 users need updates
- [ ] Email forwards configured
- [ ] SQL script executed
- [ ] All emails match firstname@wellcraftedbeverage.com format
- [ ] No dots or special characters in local-part
- [ ] System notifications tested and working
- [ ] Users notified and confirmed working
- [ ] Document changes (this file)

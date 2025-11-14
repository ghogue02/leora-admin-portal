# ⚠️ DATABASE MIGRATION REQUIRED

## Issue

The application has been updated with new Activity table fields, but the database columns don't exist yet.

**Error**: `The column Activity.callDuration does not exist in the current database`

---

## Quick Fix (Manual SQL - 2 minutes)

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor**
4. Paste and run this SQL:

```sql
-- Add activity type-specific optional fields
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "callDuration" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "visitDuration" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "attendees" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "changeType" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "impactAssessment" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "portalInteraction" TEXT;
```

5. Click **RUN**
6. Refresh your app - error should be gone!

---

## What This Enables

Once applied, these columns enable dynamic conditional fields in the Log Activity modal:

- **Phone Calls**: Track call duration
- **Visits**: Track duration, attendees, location
- **Major Changes**: Track change type, effective date, impact
- **Events**: Track location, attendees
- **Portal**: Track interaction type

---

## Why Auto-Migration Didn't Work

Vercel deployment is failing to apply migrations because:
- DATABASE_URL environment variable may not be configured in Vercel
- Or database authentication is failing during build

Manual SQL is the fastest fix.

---

## After Applying

Delete this file and the app will work normally with all new dynamic activity features!

```bash
rm MIGRATION_REQUIRED.md
git commit -am "chore: remove migration notice after applying"
git push
```

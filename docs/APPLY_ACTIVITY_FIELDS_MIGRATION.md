# Apply Activity Fields Migration

## Issue

The new dynamic activity type fields require database columns that don't exist yet, causing this error:

```
The column `Activity.callDuration` does not exist in the current database.
```

## Solution

Apply the migration SQL to add the 8 new optional columns to the Activity table.

---

## Option 1: Automatic (Vercel Deployment)

The migration will be automatically applied when Vercel builds and deploys the application.

**No action needed** - just wait for deployment to complete.

---

## Option 2: Manual SQL (Supabase Dashboard)

1. Go to Supabase Dashboard: https://supabase.com
2. Select your project
3. Go to SQL Editor
4. Run this SQL:

```sql
-- Add activity type-specific optional fields to Activity table
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "callDuration" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "visitDuration" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "attendees" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "changeType" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "impactAssessment" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "portalInteraction" TEXT;
```

5. Click "Run" to execute

---

## Option 3: Via Script (When DB Access Restored)

When local database access is restored:

```bash
npx tsx scripts/apply-activity-fields-migration.ts
```

---

## Verification

After applying migration, verify columns exist:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Activity'
  AND column_name IN (
    'callDuration', 'visitDuration', 'attendees', 'location',
    'changeType', 'effectiveDate', 'impactAssessment', 'portalInteraction'
  )
ORDER BY column_name;
```

Expected result: 8 rows showing all new columns with `is_nullable = YES`

---

## What These Columns Enable

Once applied, these columns enable dynamic conditional fields in the Log Activity modal:

- **Phone Calls**: Track call duration
- **Visits**: Track duration, attendees, location
- **Major Changes**: Track change type, effective date, impact
- **Portal**: Track portal interaction type

All fields are optional and backward compatible.

---

## Migration File Location

`prisma/migrations/20251114000000_add_activity_type_specific_fields/migration.sql`

---

## Status

- ✅ Migration file created
- ✅ Pushed to GitHub
- ⏳ **Waiting for deployment or manual application**
- ⏳ Once applied, dynamic activity fields will work

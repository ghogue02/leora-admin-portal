-- Add activity type-specific optional fields to Activity table
-- These fields enable dynamic conditional forms based on activity type

-- Phone call fields
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "callDuration" TEXT;

-- Visit fields
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "visitDuration" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "attendees" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- Major change fields
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "changeType" TEXT;
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "effectiveDate" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "impactAssessment" TEXT;

-- Portal follow-up fields
ALTER TABLE "Activity" ADD COLUMN IF NOT EXISTS "portalInteraction" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "Activity"."callDuration" IS 'Phone call duration: <5min, 5-15min, 15-30min, 30min+';
COMMENT ON COLUMN "Activity"."visitDuration" IS 'Visit duration: <30min, 30min-1hr, 1-2hr, 2hr+';
COMMENT ON COLUMN "Activity"."attendees" IS 'Visit/event attendees (names or count)';
COMMENT ON COLUMN "Activity"."location" IS 'Visit/event location or venue';
COMMENT ON COLUMN "Activity"."changeType" IS 'Major change type: OWNERSHIP, MANAGEMENT, LICENSE, etc.';
COMMENT ON COLUMN "Activity"."effectiveDate" IS 'When major change takes effect';
COMMENT ON COLUMN "Activity"."impactAssessment" IS 'Change impact: HIGH, MEDIUM, LOW';
COMMENT ON COLUMN "Activity"."portalInteraction" IS 'Portal activity: VIEWED_CATALOG, SUBMITTED_ORDER, etc.';

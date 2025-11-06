-- Migration: Multi-select activity outcomes
BEGIN;

ALTER TABLE "Activity"
  ADD COLUMN "outcomes" TEXT[] NOT NULL DEFAULT '{}'::text[];

UPDATE "Activity"
SET "outcomes" = ARRAY["outcome"]
WHERE "outcome" IS NOT NULL;

ALTER TABLE "Activity"
  DROP COLUMN "outcome";

DROP TYPE IF EXISTS "ActivityOutcome";

COMMIT;

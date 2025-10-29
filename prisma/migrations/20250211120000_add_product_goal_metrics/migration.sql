ALTER TABLE "RepProductGoal"
  ADD COLUMN "targetPod" INTEGER,
  ADD COLUMN "metricType" TEXT NOT NULL DEFAULT 'revenue',
  ADD COLUMN "periodType" TEXT NOT NULL DEFAULT 'month';

UPDATE "RepProductGoal"
SET "metricType" = CASE
  WHEN "targetCases" IS NOT NULL THEN 'cases'
  WHEN "targetRevenue" IS NOT NULL THEN 'revenue'
  ELSE 'revenue'
END;

UPDATE "RepProductGoal"
SET "periodType" = CASE
  WHEN DATE_PART('day', "periodEnd" - "periodStart") <= 7 THEN 'week'
  WHEN DATE_PART('day', "periodEnd" - "periodStart") <= 31 THEN 'month'
  WHEN DATE_PART('day', "periodEnd" - "periodStart") <= 92 THEN 'quarter'
  ELSE 'year'
END;

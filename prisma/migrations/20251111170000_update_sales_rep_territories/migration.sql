-- Align sales rep territory labels with Travis' requested assignments

WITH territory_map ("fullName", "territoryName") AS (
    VALUES
        ('Angela Fultz', 'Hampton Roads'),
        ('Carolyn Vernon', 'House Accounts'),
        ('Ebony Booth', 'DC & Eastern MD'),
        ('Jared Lorenz', 'Western NoVA'),
        ('Jose Bustillo', 'Baltimore & Frederick'),
        ('Kelly Neel', 'Select MD'),
        ('Mike Allen', 'Eastern NoVA'),
        ('Nicole Shenandoah', 'Southwest VA'),
        ('Rosa-Anna Winchell', 'Richmond, Charlottesville, & Fredericksburg'),
        ('Travis Vernon', 'House Accounts'),
        ('Josh Barbour', 'Sales Manager')
)
UPDATE "SalesRep" AS sr
SET "territoryName" = tm."territoryName",
    "updatedAt" = NOW()
FROM territory_map tm,
     "User" u
WHERE u."id" = sr."userId"
  AND u."fullName" = tm."fullName"
  AND sr."territoryName" IS DISTINCT FROM tm."territoryName";

-- Ensure inactive/unassigned reps do not linger with stale assignments
UPDATE "SalesRep"
SET "territoryName" = 'House Accounts',
    "updatedAt" = NOW()
WHERE "territoryName" IS NULL;

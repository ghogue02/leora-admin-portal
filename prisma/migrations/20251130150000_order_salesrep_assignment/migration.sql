-- Add salesperson assignment support for orders and gate reps for order entry

ALTER TABLE "SalesRep"
    ADD COLUMN IF NOT EXISTS "orderEntryEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "Order"
    ADD COLUMN IF NOT EXISTS "salesRepId" UUID,
    ADD CONSTRAINT "Order_salesRepId_fkey"
        FOREIGN KEY ("salesRepId") REFERENCES "SalesRep"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Order_salesRepId_idx"
    ON "Order"("salesRepId");

-- Backfill historical orders with the customer owner as the credited sales rep
UPDATE "Order" o
SET "salesRepId" = c."salesRepId"
FROM "Customer" c
WHERE o."customerId" = c."id"
  AND c."salesRepId" IS NOT NULL
  AND o."salesRepId" IS NULL;

-- Enable order entry for the core field reps provided by Travis
WITH enabled_reps AS (
    SELECT sr."id"
    FROM "SalesRep" sr
    INNER JOIN "User" u ON u."id" = sr."userId"
    WHERE u."fullName" IN (
        'Angela Fultz',
        'Ebony Booth',
        'Kelly Neel',
        'Josh Barbour',
        'Travis Vernon',
        'Jared Lorenz',
        'Rosa-Anna Winchell',
        'Nicole Shenandoah',
        'Jose Bustillo',
        'Carolyn Vernon'
    )
)
UPDATE "SalesRep" sr
SET "orderEntryEnabled" = TRUE
FROM enabled_reps er
WHERE sr."id" = er."id";

CREATE TYPE "PriceListJurisdictionType" AS ENUM ('GLOBAL', 'STATE', 'FEDERAL_PROPERTY', 'CUSTOM');

ALTER TABLE "PriceList"
  ADD COLUMN "jurisdictionType" "PriceListJurisdictionType" NOT NULL DEFAULT 'GLOBAL',
  ADD COLUMN "jurisdictionValue" TEXT,
  ADD COLUMN "allowManualOverride" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "PriceList_jurisdictionType_idx" ON "PriceList" ("jurisdictionType");
CREATE INDEX "PriceList_jurisdictionValue_idx" ON "PriceList" ("jurisdictionValue");

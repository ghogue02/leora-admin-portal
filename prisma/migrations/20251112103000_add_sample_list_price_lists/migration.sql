-- Add preferred price list tracking to sample lists
ALTER TABLE "SampleList"
  ADD COLUMN "preferredPriceListIds" jsonb NOT NULL DEFAULT '[]';

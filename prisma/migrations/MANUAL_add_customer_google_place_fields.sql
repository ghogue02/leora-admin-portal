-- Adds Google Maps metadata columns to Customer

ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "googlePlaceId" TEXT,
  ADD COLUMN IF NOT EXISTS "googlePlaceName" TEXT,
  ADD COLUMN IF NOT EXISTS "googleFormattedAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "internationalPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "googleMapsUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "googleBusinessStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "googlePlaceTypes" TEXT[] DEFAULT '{}';

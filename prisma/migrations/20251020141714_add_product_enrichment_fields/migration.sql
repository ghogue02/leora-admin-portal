-- Add product enrichment fields to Product table
-- These fields support AI-powered product information enrichment

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "tastingNotes" JSONB,
ADD COLUMN "foodPairings" JSONB,
ADD COLUMN "servingInfo" JSONB,
ADD COLUMN "wineDetails" JSONB,
ADD COLUMN "enrichedAt" TIMESTAMP(3),
ADD COLUMN "enrichedBy" TEXT DEFAULT 'claude-ai';

-- Add comment for documentation
COMMENT ON COLUMN "Product"."tastingNotes" IS 'Structured tasting notes: { aroma, palate, finish }';
COMMENT ON COLUMN "Product"."foodPairings" IS 'Array of recommended food pairings';
COMMENT ON COLUMN "Product"."servingInfo" IS 'Serving recommendations: { temperature, decanting, glassware }';
COMMENT ON COLUMN "Product"."wineDetails" IS 'Wine-specific details: { region, grapes, vintage, style, ageability }';
COMMENT ON COLUMN "Product"."enrichedAt" IS 'Timestamp when product was enriched with AI-generated content';
COMMENT ON COLUMN "Product"."enrichedBy" IS 'Source of enrichment (e.g., claude-ai)';

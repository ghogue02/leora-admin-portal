-- ============================================================================
-- Product Name Normalization & Enrichment Fixes
-- ============================================================================
-- Purpose: Fix common name mismatches that prevent enrichment data matching
-- Author: Code Quality Analyzer (Claude Code)
-- Date: 2025-10-21
--
-- IMPORTANT: This script makes destructive changes.
-- ALWAYS backup your database first!
-- ============================================================================

-- ============================================================================
-- PHASE 1: Add Normalized Name Column (if not exists)
-- ============================================================================

-- Add column for normalized product names
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS normalized_name TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_normalized_name
ON "Product"(normalized_name);

-- Add enrichment tracking fields
ALTER TABLE "Product"
ADD COLUMN IF NOT EXISTS enrichment_source TEXT,
ADD COLUMN IF NOT EXISTS enrichment_batch_number INTEGER,
ADD COLUMN IF NOT EXISTS enrichment_confidence DECIMAL(3,2);

-- ============================================================================
-- PHASE 2: Populate Normalized Names
-- ============================================================================

-- Update all products with normalized names
UPDATE "Product"
SET normalized_name =
  TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                LOWER(name),
                '\s+', ' ', 'g'                    -- Single spaces
              ),
              '['']', '''', 'g'                    -- Normalize apostrophes
            ),
            '["""]', '"', 'g'                      -- Normalize quotes
          ),
          '–', '-', 'g'                            -- Normalize dashes
        ),
        '\s*\(\d{4}\)\s*$', '', 'g'                -- Remove trailing years
      ),
      '^the\s+', '', 'i'                           -- Remove leading "the"
    )
  )
WHERE normalized_name IS NULL
   OR normalized_name = '';

-- ============================================================================
-- PHASE 3: Fix Common Name Variations
-- ============================================================================

-- Fix Case Sensitivity Issues
-- Example: "KOSHER" -> "kosher" in normalized_name
UPDATE "Product"
SET normalized_name = REGEXP_REPLACE(normalized_name, '\bkosher\b', 'Kosher', 'gi')
WHERE normalized_name ~ '\bkosher\b';

-- Standardize State Codes (MD, DC)
UPDATE "Product"
SET normalized_name = REGEXP_REPLACE(
  REGEXP_REPLACE(normalized_name, '\bmd\b', 'MD', 'gi'),
  '\bdc\b', 'DC', 'gi'
)
WHERE normalized_name ~ '\b(md|dc)\b';

-- Standardize & and "and"
UPDATE "Product"
SET normalized_name = REGEXP_REPLACE(normalized_name, '\s+&\s+', ' and ', 'g')
WHERE normalized_name ~ '\s+&\s+';

-- Remove extra whitespace (final cleanup)
UPDATE "Product"
SET normalized_name = REGEXP_REPLACE(
  TRIM(normalized_name),
  '\s+', ' ', 'g'
)
WHERE normalized_name ~ '\s{2,}';

-- ============================================================================
-- PHASE 4: Duplicate Detection
-- ============================================================================

-- Identify products with duplicate normalized names
-- (Review before applying enrichments)
SELECT
  normalized_name,
  COUNT(*) as duplicate_count,
  STRING_AGG(name, ' | ') as original_names,
  STRING_AGG(id::TEXT, ', ') as product_ids
FROM "Product"
WHERE normalized_name IS NOT NULL
GROUP BY normalized_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, normalized_name;

-- ============================================================================
-- PHASE 5: Enrichment Status Report
-- ============================================================================

-- Current enrichment status
SELECT
  COUNT(*) as total_products,
  COUNT(enriched_at) as enriched_products,
  COUNT(*) - COUNT(enriched_at) as unenriched_products,
  ROUND(100.0 * COUNT(enriched_at) / COUNT(*), 2) as enrichment_percentage
FROM "Product";

-- Enrichment by source
SELECT
  COALESCE(enriched_by, 'unenriched') as source,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM "Product"), 2) as percentage
FROM "Product"
GROUP BY enriched_by
ORDER BY count DESC;

-- ============================================================================
-- PHASE 6: Validation Queries
-- ============================================================================

-- Check normalized name quality
-- Should have minimal null values
SELECT
  COUNT(*) FILTER (WHERE normalized_name IS NULL) as null_count,
  COUNT(*) FILTER (WHERE normalized_name = '') as empty_count,
  COUNT(*) FILTER (WHERE normalized_name ~ '\s{2,}') as multiple_spaces,
  COUNT(*) FILTER (WHERE normalized_name ~ '^\s|\s$') as leading_trailing_spaces
FROM "Product";

-- Find products with unusual characters that may need attention
SELECT id, name, normalized_name
FROM "Product"
WHERE normalized_name ~ '[^\x00-\x7F]'  -- Non-ASCII characters
   OR normalized_name ~ '[\x00-\x1F]'   -- Control characters
LIMIT 50;

-- ============================================================================
-- PHASE 7: Create Matching View for Enrichment
-- ============================================================================

-- Create a view that makes it easier to match products with batch results
CREATE OR REPLACE VIEW product_enrichment_match AS
SELECT
  p.id,
  p.name as original_name,
  p.normalized_name,
  p.brand,
  p.category,
  p.enriched_at,
  p.enriched_by,
  p.enrichment_batch_number,
  p.enrichment_confidence,
  CASE
    WHEN p.enriched_at IS NOT NULL THEN 'enriched'
    ELSE 'pending'
  END as enrichment_status
FROM "Product" p;

-- ============================================================================
-- PHASE 8: Backup Unenriched Products
-- ============================================================================

-- Create backup table of unenriched products before applying fixes
CREATE TABLE IF NOT EXISTS product_enrichment_backup AS
SELECT
  id,
  tenant_id,
  name,
  brand,
  description,
  category,
  tasting_notes,
  food_pairings,
  serving_info,
  wine_details,
  enriched_at,
  enriched_by,
  NOW() as backup_created_at
FROM "Product"
WHERE enriched_at IS NULL;

-- Verify backup
SELECT COUNT(*) as backed_up_products
FROM product_enrichment_backup;

-- ============================================================================
-- PHASE 9: Sample Matches for Manual Review
-- ============================================================================

-- Sample 20 random unenriched products for manual verification
SELECT
  id,
  name,
  normalized_name,
  brand,
  category
FROM "Product"
WHERE enriched_at IS NULL
ORDER BY RANDOM()
LIMIT 20;

-- ============================================================================
-- PHASE 10: Cleanup & Maintenance
-- ============================================================================

-- Refresh statistics for query optimizer
ANALYZE "Product";

-- Refresh materialized views (if any)
-- REFRESH MATERIALIZED VIEW product_enrichment_stats;

-- ============================================================================
-- ROLLBACK PLAN
-- ============================================================================

/*
If enrichment application goes wrong, restore from backup:

-- 1. Clear bad enrichments
UPDATE "Product" p
SET
  description = b.description,
  tasting_notes = b.tasting_notes,
  food_pairings = b.food_pairings,
  serving_info = b.serving_info,
  wine_details = b.wine_details,
  enriched_at = NULL,
  enriched_by = NULL,
  enrichment_source = NULL,
  enrichment_batch_number = NULL,
  enrichment_confidence = NULL
FROM product_enrichment_backup b
WHERE p.id = b.id;

-- 2. Verify rollback
SELECT COUNT(*) FROM "Product" WHERE enriched_at IS NULL;

-- 3. Drop backup table (after verification)
-- DROP TABLE product_enrichment_backup;
*/

-- ============================================================================
-- POST-ENRICHMENT VALIDATION
-- ============================================================================

-- Run these queries AFTER applying enrichments via enhanced matcher:

-- 1. Verify enrichment rate improved
SELECT
  COUNT(*) as total,
  COUNT(enriched_at) as enriched,
  COUNT(*) - COUNT(enriched_at) as remaining,
  ROUND(100.0 * COUNT(enriched_at) / COUNT(*), 2) as enrichment_rate
FROM "Product";

-- 2. Check enrichment by batch
SELECT
  enrichment_batch_number,
  COUNT(*) as products_enriched,
  AVG(enrichment_confidence) as avg_confidence,
  MIN(enrichment_confidence) as min_confidence,
  MAX(enrichment_confidence) as max_confidence
FROM "Product"
WHERE enrichment_batch_number IS NOT NULL
GROUP BY enrichment_batch_number
ORDER BY enrichment_batch_number;

-- 3. Find low-confidence enrichments for review
SELECT
  id,
  name,
  enrichment_batch_number,
  enrichment_confidence,
  enriched_by
FROM "Product"
WHERE enrichment_confidence < 0.90
  AND enriched_at IS NOT NULL
ORDER BY enrichment_confidence ASC
LIMIT 50;

-- 4. Verify no data loss
SELECT
  'Before' as timing,
  (SELECT COUNT(*) FROM product_enrichment_backup) as count
UNION ALL
SELECT
  'After',
  COUNT(*)
FROM "Product"
WHERE enriched_at IS NOT NULL;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================

/*
Target Metrics After Running Enhanced Matcher:

✅ Enrichment Rate: 95%+ (was ~20%)
✅ Average Confidence: >0.92
✅ Low Confidence (<0.90): <5% of enriched products
✅ Duplicates: 0 (all handled)
✅ Failed Matches: <50 products

Next Steps After This Script:
1. Review duplicate normalized names (Phase 4 query)
2. Run enhanced-product-matcher.ts in dry-run mode
3. Review matcher logs in data/logs/
4. Apply enrichments with --live flag
5. Run post-enrichment validation (above)
6. Create new batches for remaining unmatched products
*/

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================

-- Final status check
SELECT
  'SCRIPT COMPLETE' as status,
  NOW() as completed_at,
  COUNT(*) as total_products,
  COUNT(normalized_name) as products_with_normalized_names,
  COUNT(enriched_at) as currently_enriched
FROM "Product";

# Unenriched Products Analysis Report

**Generated:** 2025-10-21
**Analyst:** Code Quality Analyzer (Claude Code)

## Executive Summary

### Key Findings

- **Total Batch Files Analyzed:** 188
- **Successfully Loaded:** 171 batches (91%)
- **Failed/Corrupt Batches:** 17 batches (9%)
- **Unique Product Names Indexed:** 1,699

### Critical Issues Identified

1. **Batch File Format Inconsistencies** (17 affected files)
   - 13 batches use unknown structure (batches 45, 65, 110-120)
   - 4 batches have JSON syntax errors (batches 26, 55, 86, 94)

2. **Name Matching Problems**
   - Case sensitivity variations ("KOSHER" vs "Kosher")
   - Whitespace inconsistencies (multiple spaces, trailing spaces)
   - Special character differences (' vs ', " vs ", – vs -)
   - Vintage year format variations ("(2024)" vs "2024" vs omitted)
   - Region abbreviation inconsistencies ("MD & DC" vs "Maryland & DC")

3. **Root Cause Analysis**
   - **Primary Issue:** String matching is case and whitespace sensitive
   - **Secondary Issue:** Product names in database may differ slightly from batch files
   - **Tertiary Issue:** Some batches never generated or corrupted during processing

## Batch File Analysis

### Successfully Loaded Batches (171/188)

The following batches loaded successfully and contain **1,699 unique products**:

- Batches 1-9: ✅
- Batch 10: ✅ (format: `{wines: [...]}`)
- Batches 11-25: ✅
- Batch 26: ❌ JSON syntax error
- Batches 27-44: ✅
- Batch 45: ❌ Unknown format
- Batches 46-54: ✅
- Batch 55: ❌ JSON syntax error
- Batches 56-64: ✅
- Batch 65: ❌ Unknown format
- Batches 66-85: ✅
- Batch 86: ❌ JSON syntax error
- Batches 87-93: ✅
- Batch 94: ❌ JSON syntax error
- Batches 95-109: ✅
- Batches 110-120: ❌ Unknown format (11 files)
- Batches 121-188: ✅ (except 26, 55, 86, 94)

### Failed Batches (17/188)

**JSON Syntax Errors (4 batches):**
1. **Batch 26:** Error at position 12,994 (line 178, column 345)
2. **Batch 55:** Error at position 3,646 (line 46, column 7)
3. **Batch 86:** Error at position 11,223 (line 187, column 5)
4. **Batch 94:** Error at position 22,872 (line 327, column 7)

**Unknown Format (13 batches):**
- Batches: 45, 65, 110-120
- These batches don't match either expected format:
  - Array format: `[{productName, description, ...}]`
  - Wrapper format: `{wines: [{productName, description, ...}]}`

## Name Normalization Analysis

### Common Variations Causing Match Failures

| Pattern | Database Example | Batch File Example | Impact |
|---------|-----------------|-------------------|--------|
| **Case Sensitivity** | "Kosher Wine" | "KOSHER WINE" | High |
| **Whitespace** | "Product  Name" | "Product Name" | High |
| **Apostrophes** | "O'Brien Vineyard" | "O'Brien Vineyard" | Medium |
| **Quotes** | 'Reserve "Special"' | 'Reserve "Special"' | Medium |
| **Dashes** | "Estate-Bottled" | "Estate–Bottled" | Medium |
| **Vintage Format** | "Wine 2024" | "Wine (2024)" | High |
| **Region Abbrev** | "MD & DC" | "Maryland & DC" | Medium |
| **The Article** | "The Estate" | "Estate" | Low |
| **And/Ampersand** | "Wine & Spirits" | "Wine and Spirits" | Medium |

### Recommended Normalization Rules

```typescript
function normalizeName(name: string): string {
  return name
    .toLowerCase()                               // Consistent case
    .trim()                                      // Remove leading/trailing spaces
    .replace(/\s+/g, ' ')                       // Single spaces only
    .replace(/\b(md|dc)\b/g, m => m.toUpperCase()) // Standardize state codes
    .replace(/kosher/gi, 'Kosher')              // Standardize Kosher
    .replace(/\s*\(\d{4}\)\s*$/,'')             // Remove trailing years
    .replace(/['']/g, "'")                       // Normalize apostrophes
    .replace(/[""]/g, '"')                       // Normalize quotes
    .replace(/–/g, '-')                          // Normalize dashes
    .replace(/^the\s+/i, '')                     // Remove leading "the"
    .replace(/\s+&\s+/g, ' and ')                // Standardize & to "and"
    .replace(/\s+/g, ' ')                        // Final cleanup
    .trim();
}
```

## Fuzzy Matching Strategy

### Levenshtein Distance Algorithm

For products that don't match exactly after normalization, implement fuzzy matching:

```typescript
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLen);
}
```

### Recommended Thresholds

| Similarity Score | Action | Risk Level |
|------------------|--------|------------|
| **1.00 (100%)** | Auto-apply | None |
| **0.95-0.99** | Auto-apply with logging | Very Low |
| **0.90-0.94** | Auto-apply (dry-run first) | Low |
| **0.85-0.89** | Manual review required | Medium |
| **< 0.85** | Do not match | High |

## Implementation Plan

### Phase 1: Fix Corrupt Batch Files (Priority: HIGH)

**Batches to Repair:**
- [ ] Batch 26: Fix JSON at line 178, column 345
- [ ] Batch 55: Fix JSON at line 46, column 7
- [ ] Batch 86: Fix JSON at line 187, column 5
- [ ] Batch 94: Fix JSON at line 327, column 7
- [ ] Batches 45, 65, 110-120: Investigate and convert to standard format

**Commands:**
```bash
# Identify exact errors
for batch in 26 55 86 94; do
  echo "Checking batch $batch:"
  jq empty "data/wine-research-results-batch-$batch.json" 2>&1
done

# Fix JSON syntax (manual review required)
# Once fixed, validate:
jq empty "data/wine-research-results-batch-*.json"
```

### Phase 2: Run Enhanced Matcher (Priority: HIGH)

**Step 1: Dry Run**
```bash
# Test with 90% similarity threshold
chmod +x scripts/enhanced-product-matcher.ts
npx tsx scripts/enhanced-product-matcher.ts --min-similarity 0.90

# Review logs in data/logs/enhanced-matcher-log-*.json
```

**Step 2: Apply Matches**
```bash
# Run in live mode after reviewing dry run results
npx tsx scripts/enhanced-product-matcher.ts --live --min-similarity 0.90
```

### Phase 3: SQL Fixes for Common Patterns (Priority: MEDIUM)

See `scripts/apply-name-normalization-fixes.sql` for database updates.

### Phase 4: Create New Batches for Unmatched Products (Priority: LOW)

Products with no match should be queued for new enrichment batches.

## Expected Outcomes

### Best Case Scenario

Assuming all 1,699 products in batch files should match database products:

- **Normalized Matches:** ~85% (1,444 products) - Direct application
- **Fuzzy Matches (>90%):** ~10% (170 products) - High confidence
- **Fuzzy Matches (85-90%):** ~3% (51 products) - Manual review
- **No Matches:** ~2% (34 products) - New batches needed

### Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Enrichment Rate** | 95%+ | `COUNT(*) WHERE enriched_at IS NOT NULL` |
| **Match Accuracy** | 98%+ | Manual audit of 100 random matches |
| **Processing Time** | < 30 min | End-to-end matcher execution |
| **False Positives** | < 1% | Products enriched with wrong data |

## Technical Details

### Batch File Formats Observed

**Format 1: Array (Most Common)**
```json
[
  {
    "productName": "...",
    "description": "...",
    "tastingNotes": {...},
    "foodPairings": [...],
    "servingInfo": {...},
    "wineDetails": {...}
  }
]
```

**Format 2: Wrapped Object**
```json
{
  "batchNumber": 10,
  "totalWines": 10,
  "researchedAt": "2025-10-20T00:00:00.000Z",
  "wines": [
    {
      "productName": "...",
      "description": "..."
    }
  ]
}
```

### Database Schema Considerations

**Current Product Table:**
```sql
CREATE TABLE "Product" (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  category TEXT,
  tasting_notes JSONB,
  food_pairings JSONB,
  serving_info JSONB,
  wine_details JSONB,
  enriched_at TIMESTAMP,
  enriched_by TEXT DEFAULT 'claude-ai',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Recommended Additions:**
```sql
-- Add normalized name for faster matching
ALTER TABLE "Product" ADD COLUMN normalized_name TEXT;
CREATE INDEX idx_product_normalized_name ON "Product"(normalized_name);

-- Add enrichment tracking
ALTER TABLE "Product" ADD COLUMN enrichment_source TEXT;
ALTER TABLE "Product" ADD COLUMN enrichment_batch_number INTEGER;
ALTER TABLE "Product" ADD COLUMN enrichment_confidence DECIMAL(3,2);

-- Update existing products
UPDATE "Product"
SET normalized_name = lower(trim(regexp_replace(name, '\s+', ' ', 'g')));
```

## Monitoring & Validation

### Quality Checks

**Before Applying Enrichments:**
```sql
-- Check for duplicates
SELECT normalized_name, COUNT(*)
FROM "Product"
GROUP BY normalized_name
HAVING COUNT(*) > 1;

-- Verify unenriched count
SELECT
  COUNT(*) as total,
  COUNT(enriched_at) as enriched,
  COUNT(*) - COUNT(enriched_at) as remaining
FROM "Product";
```

**After Applying Enrichments:**
```sql
-- Verify enrichment rate
SELECT
  COUNT(*) FILTER (WHERE enriched_by LIKE '%enhanced%') as enhanced_matches,
  COUNT(*) FILTER (WHERE enriched_at IS NOT NULL) as total_enriched,
  COUNT(*) as total
FROM "Product";

-- Sample check
SELECT name, enriched_by, enriched_at, enrichment_confidence
FROM "Product"
WHERE enriched_by LIKE '%enhanced%'
ORDER BY RANDOM()
LIMIT 20;
```

## Files Generated

| File | Purpose | Location |
|------|---------|----------|
| **Analysis Report** | This document | `/docs/unenriched-products-analysis.md` |
| **Enhanced Matcher** | Apply enrichments with fuzzy matching | `/scripts/enhanced-product-matcher.ts` |
| **SQL Fixes** | Database normalization queries | `/scripts/apply-name-normalization-fixes.sql` |
| **Batch Repair Guide** | Fix corrupt JSON files | `/docs/batch-repair-guide.md` |

## Next Steps

### Immediate Actions (Today)

1. ✅ Review this analysis report
2. ⏳ Fix corrupt batch files (Batches 26, 55, 86, 94)
3. ⏳ Run enhanced matcher in dry-run mode
4. ⏳ Review match log for accuracy

### Short-term (This Week)

5. ⏳ Apply high-confidence matches (>95% similarity)
6. ⏳ Manual review of 85-95% similarity matches
7. ⏳ Update database schema with normalized_name column
8. ⏳ Create monitoring dashboard

### Long-term (This Month)

9. ⏳ Create new batches for unmatched products
10. ⏳ Implement automated quality checks
11. ⏳ Document enrichment pipeline
12. ⏳ Set up continuous validation

## Support & Troubleshooting

### Common Issues

**Issue: "Too many false positives in fuzzy matching"**
- **Solution:** Increase `minFuzzySimilarity` threshold
- **Command:** `--min-similarity 0.95`

**Issue: "Database connection failed"**
- **Solution:** Check `.env.local` has correct `DATABASE_URL`
- **Command:** `cat .env.local | grep DATABASE_URL`

**Issue: "Batch file won't load"**
- **Solution:** Validate JSON syntax
- **Command:** `jq empty data/wine-research-results-batch-X.json`

### Contact

For questions or issues:
- Create GitHub issue with label `enrichment-analysis`
- Include matcher log file from `data/logs/`
- Attach sample of problematic product names

---

**Report Status:** ✅ Complete
**Last Updated:** 2025-10-21
**Next Review:** After enhanced matcher execution

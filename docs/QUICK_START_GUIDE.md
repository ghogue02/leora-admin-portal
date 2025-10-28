# Quick Start Guide - Fix Unenriched Products

**Goal:** Increase enrichment rate from 20% to 95%+ in under 30 minutes

## Prerequisites

```bash
# 1. Ensure you're in the project directory
cd /Users/greghogue/Leora2/web

# 2. Verify batch files exist
ls -1 data/wine-research-results-batch-*.json | wc -l
# Should show: 188

# 3. Check database connection
cat .env.local | grep DATABASE_URL
```

## Step-by-Step Process

### Option 1: Quick Fix (Recommended) ⚡

**Time:** 10-15 minutes
**Enrichment Improvement:** 20% → 95%+

```bash
# 1. Run matcher in DRY-RUN mode (no changes to database)
npx tsx scripts/enhanced-product-matcher.ts

# 2. Review results
cat data/logs/enhanced-matcher-summary-*.md

# 3. If satisfied, run in LIVE mode
npx tsx scripts/enhanced-product-matcher.ts --live

# Done! Check results:
# (You'll need database access for this)
```

### Option 2: Full Implementation 🎯

**Time:** 2-3 hours
**Enrichment Improvement:** 20% → 99%+

```bash
# Phase 1: Database improvements (5 minutes)
psql -f scripts/apply-name-normalization-fixes.sql

# Phase 2: Fix corrupt batches (60-90 minutes)
# Follow: docs/batch-repair-guide.md

# Phase 3: Run enhanced matcher (10 minutes)
npx tsx scripts/enhanced-product-matcher.ts --live

# Phase 4: Quality check (30 minutes)
# Manual review of low-confidence matches

# Phase 5: Create batches for remaining (varies)
# For products still unmatched after Step 3
```

## Command Reference

### Enhanced Matcher Commands

```bash
# Dry-run with default settings (90% similarity)
npx tsx scripts/enhanced-product-matcher.ts

# Dry-run with higher confidence requirement
npx tsx scripts/enhanced-product-matcher.ts --min-similarity 0.95

# LIVE mode - actually applies changes!
npx tsx scripts/enhanced-product-matcher.ts --live

# Live mode with high confidence only
npx tsx scripts/enhanced-product-matcher.ts --live --min-similarity 0.95
```

### Validation Commands

```bash
# Check how many batches load successfully
npx tsx scripts/analyze-unenriched-products.ts

# Validate all batch JSON files
for i in {1..188}; do
  jq empty "data/wine-research-results-batch-$i.json" || echo "Batch $i invalid"
done

# Count enriched products (requires database access)
psql -c "SELECT
  COUNT(*) as total,
  COUNT(enriched_at) as enriched,
  ROUND(100.0 * COUNT(enriched_at) / COUNT(*), 1) as pct
FROM Product;"
```

## Understanding the Matcher Output

### Dry-Run Output

```
🔧 Configuration:
   Dry Run: YES (no changes will be made)
   Min Fuzzy Similarity: 90%

📁 Loading batch result files...
   Found 188 batch result files
   ✅ Loaded 171 batches
   ✅ Indexed 1699 unique normalized names

🔬 Processing unenriched products...
   Found 1063 unenriched products

   Progress: 100/1063 (85 matched, 85 applied)
   Progress: 200/1063 (170 matched, 170 applied)
   ...

✅ Processing Complete!
   Processed: 1063
   Matched: 902 (84.9%)
   Applied: 902
   Failed: 161
```

### Match Types

| Type | Description | Example |
|------|-------------|---------|
| **normalized** | Name matches after normalization | "Wine (2024)" → "wine 2024" |
| **fuzzy** | High similarity (>90%) match | "O'Brien" → "O'Brien" |
| **failed** | No suitable match found | Product not in any batch |

### Log Files

```bash
# Match log (JSON)
data/logs/enhanced-matcher-log-2025-10-21T15-30-00.json

# Summary (Markdown)
data/logs/enhanced-matcher-summary-2025-10-21T15-30-00.md
```

## Troubleshooting

### Issue: "Database connection failed"

```bash
# Check environment variables
cat .env.local | grep -E "(DATABASE_URL|DIRECT_URL)"

# Make sure .env.local exists
ls -la .env.local
```

### Issue: "Too many failed matches"

```bash
# Lower similarity threshold
npx tsx scripts/enhanced-product-matcher.ts --min-similarity 0.85

# Check batch files loaded correctly
npx tsx scripts/analyze-unenriched-products.ts | grep "Loaded"
```

### Issue: "Some batches not loading"

```bash
# See which batches are failing
npx tsx scripts/analyze-unenriched-products.ts 2>&1 | grep "Failed to load"

# Follow repair guide
cat docs/batch-repair-guide.md
```

### Issue: "Applied wrong enrichment to product"

```bash
# Rollback using backup table
psql -c "UPDATE Product p
SET description = b.description,
    tasting_notes = b.tasting_notes,
    enriched_at = NULL
FROM product_enrichment_backup b
WHERE p.id = b.id AND p.id = 'PRODUCT_ID_HERE';"
```

## Safety Features

### Built-in Protections

1. **Dry-run by default** - Must explicitly use `--live` to make changes
2. **Backup table created** - Automatic before any updates (in SQL script)
3. **Confidence tracking** - All matches scored 0-1
4. **Match logging** - Every decision logged to file
5. **Similarity threshold** - Won't match below 90% (configurable)

### Pre-flight Checklist

Before running in `--live` mode:

- [ ] Dry-run completed successfully
- [ ] Reviewed match log shows good quality matches
- [ ] Database backup exists
- [ ] Less than 5% of matches below 92% similarity
- [ ] No critical products in "failed" list
- [ ] Tested on staging/dev environment (if available)

## Expected Results

### After Dry-Run

```markdown
# Enhanced Product Matcher - Run Summary

**Mode:** DRY RUN
**Min Similarity:** 90%

## Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Products | 1,063 | 100% |
| Normalized Matches | 858 | 80.7% |
| Fuzzy Matches | 44 | 4.1% |
| Failed Matches | 161 | 15.1% |
| Successfully Applied | 0 | 0% (dry-run) |
```

### After Live Run

```sql
-- Before
SELECT COUNT(*) FROM Product WHERE enriched_at IS NOT NULL;
-- Result: ~400 (20%)

-- After
SELECT COUNT(*) FROM Product WHERE enriched_at IS NOT NULL;
-- Result: ~1,900 (95%)
```

## Success Checklist

After running enhanced matcher:

- [ ] Enrichment rate increased to 95%+
- [ ] No critical errors in matcher log
- [ ] Sample of 20 products verified manually
- [ ] Low-confidence matches reviewed
- [ ] Remaining unenriched products identified
- [ ] Documentation updated

## Next Steps After Completion

1. **Create monitoring dashboard** - Track enrichment rate over time
2. **Schedule regular updates** - Re-run matcher for new products
3. **Handle failed matches** - Create new batches for unmatched products
4. **Quality improvement** - Review and fix low-confidence matches
5. **Process automation** - Integrate matcher into enrichment pipeline

## Additional Resources

| Document | Purpose |
|----------|---------|
| `INVESTIGATION_SUMMARY.md` | Executive overview |
| `unenriched-products-analysis.md` | Detailed analysis |
| `batch-repair-guide.md` | Fix corrupt batch files |
| `apply-name-normalization-fixes.sql` | Database improvements |

## Questions?

- Check the detailed analysis: `docs/unenriched-products-analysis.md`
- Review matcher logs: `data/logs/enhanced-matcher-*.md`
- Check batch file health: `npx tsx scripts/analyze-unenriched-products.ts`

---

**Ready to start?** Run this command:

```bash
npx tsx scripts/enhanced-product-matcher.ts
```

Then review the output and logs before running with `--live` flag.

# Wine Enrichment System - Quick Start Guide

## TL;DR

Enrich 1,879 wine products with unique, accurate tasting notes in ~1.5 hours for ~$35.

```bash
# Run pilot (50 products)
npm run enrich:pilot

# Validate results
npm run enrich:validate

# Enrich all products
npm run enrich:all

# Resume from checkpoint
npm run enrich:resume
```

---

## Prerequisites

### Environment Variables

Add to `.env.local`:

```bash
# Anthropic API key (for Claude 3.5 Sonnet)
ANTHROPIC_API_KEY=sk-ant-...

# Database (already configured)
DATABASE_URL=postgresql://...
```

### Install Dependencies

```bash
npm install
```

---

## Quick Commands

### Development

```bash
# Test extraction logic
npm run enrich:test-extract

# Test single product enrichment
npm run enrich:test-single -- --product-id "uuid..."

# Preview 10 products
npm run enrich:preview -- --limit 10
```

### Production

```bash
# Pilot run (50 products)
npm run enrich:pilot

# Batch processing (500 products)
npm run enrich:batch -- --size 500

# Full enrichment (all 1,879)
npm run enrich:all

# Resume from last checkpoint
npm run enrich:resume
```

### Validation & Reporting

```bash
# Check for duplicates
npm run enrich:check-duplicates

# Validate quality scores
npm run enrich:validate

# Generate quality report
npm run enrich:report
```

---

## Configuration

### Basic Configuration

**File**: `/src/lib/enrichment/config.ts`

```typescript
export const enrichmentConfig = {
  batch: {
    size: 25,              // Products per batch
    concurrency: 3,        // Parallel requests
    retryAttempts: 3,      // Max retries
    checkpointInterval: 50 // Save every N products
  },

  validation: {
    minConfidence: 0.5,    // Minimum confidence score
    minQualityScore: 0.7,  // Minimum quality score
  }
};
```

### Adjust for Your Needs

**Faster processing** (more API costs):
```typescript
concurrency: 5,  // More parallel requests
batchSize: 50    // Larger batches
```

**Higher quality** (slower):
```typescript
minConfidence: 0.7,     // Stricter confidence
minQualityScore: 0.8,   // Higher quality threshold
retryAttempts: 5        // More retry attempts
```

**Cost-conscious** (slower):
```typescript
concurrency: 1,         // Sequential processing
minConfidence: 0.3,     // Accept lower confidence
```

---

## Understanding Output

### Success

```
Processing: Bodegas Muga Reserva Rioja 2018
  ✓ Extracted (confidence: 0.95)
  ✓ Resolved (confidence: 0.92)
  ✓ Generated
  ✓ Validated (quality: 0.88)
  ✓ Saved
```

### Warnings

```
Processing: Obscure Wine 2020
  ✓ Extracted (confidence: 0.60)
  ⚠ Resolved (confidence: 0.45) - Using varietal fallback
  ✓ Generated
  ✓ Validated (quality: 0.72)
  ✓ Saved
```

### Errors

```
Processing: Unknown Product
  ✓ Extracted (confidence: 0.30)
  ✗ Validation failed: Quality score too low (0.55)
  → Retrying with stricter prompt...
```

---

## Enrichment Quality Levels

### Level 1: Exact Match (Best)
- **Confidence**: 0.85-1.00
- **Source**: Wine Spectator, Wine Enthusiast, Decanter
- **Example**: "Bodegas Muga Reserva 2018 Rioja"

### Level 2: Producer Style
- **Confidence**: 0.70-0.85
- **Source**: Producer websites, wine blogs
- **Example**: "Bodegas Muga Rioja wines typically..."

### Level 3: Varietal + Region
- **Confidence**: 0.50-0.70
- **Source**: Regional authorities, grape variety databases
- **Example**: "Tempranillo from Rioja typically shows..."

### Level 4: Generic Varietal
- **Confidence**: 0.30-0.50
- **Source**: Wine education sites
- **Example**: "Tempranillo typically features..."

---

## Troubleshooting

### "Duplicate aroma detected"

**Cause**: Generated text too similar to existing product.

**Solution**: Automatic retry with uniqueness constraint added to prompt.

### "Quality score too low"

**Cause**: Generated text contains generic phrases or insufficient detail.

**Solution**: Automatic retry with stricter quality requirements.

### "Rate limit exceeded"

**Cause**: Too many API requests in short time.

**Solution**: Automatic exponential backoff and retry.

### "Web search timeout"

**Cause**: Search taking too long.

**Solution**: Fallback to next search level automatically.

---

## Monitoring Progress

### Real-time Progress

```
🍷 Wine Enrichment Progress
════════════════════════════════════════════════════════════════

Processed: 150/1879 (8.0%)
Succeeded: 143 (95.3%)
Failed: 7 (4.7%)

Speed: 1,250 products/hour
ETA: 1 hour 23 minutes

Confidence Distribution:
  Exact Match (L1): 68 (45.3%)
  Producer (L2): 42 (28.0%)
  Varietal/Region (L3): 28 (18.7%)
  Generic (L4): 5 (3.3%)

Average Quality Score: 0.82
```

### Checkpoint Files

Location: `/tmp/enrichment-checkpoint-*.json`

```json
{
  "version": "1.0",
  "timestamp": "2025-01-20T15:30:00Z",
  "progress": {
    "total": 1879,
    "processed": 150,
    "succeeded": 143,
    "failed": 7,
    "lastProcessedId": "uuid..."
  },
  "statistics": {
    "averageConfidence": 0.78,
    "averageQualityScore": 0.82,
    "averageProcessingTime": 2.7
  }
}
```

---

## Quality Validation

### After Pilot

```bash
npm run enrich:validate
```

**Output**:
```
🔍 Validating Enriched Products
═══════════════════════════════════════════════

Analyzing 50 enriched products

Uniqueness Check:
  Unique aromas: 50
  Duplicate aromas: 0
  ✅ All aromas are unique!

Quality Metrics:
  Average Confidence: 0.78
  Average Quality Score: 0.82

Source Distribution:
  exact-match: 23 (46.0%)
  producer-wine: 14 (28.0%)
  varietal-region: 10 (20.0%)
  varietal: 3 (6.0%)
```

### Quality Thresholds

| Metric | Minimum | Target | Excellent |
|--------|---------|--------|-----------|
| Uniqueness | 99% | 100% | 100% |
| Avg Confidence | 0.60 | 0.70 | 0.80+ |
| Avg Quality Score | 0.70 | 0.75 | 0.85+ |
| Success Rate | 90% | 95% | 98%+ |

---

## Cost Estimation

### Per Product

```
Web Search: $0.004 (2 searches @ $0.002)
LLM Generation: $0.015 (800 tokens @ Claude 3.5)
─────────────────────────────────────────────
Total: $0.019 per product
```

### Full Catalog

```
1,879 products × $0.019 = $35.70

With 20% cache hit rate:
1,879 × 80% × $0.019 = $28.56

Estimated: $29-36 total
```

### Budget Control

Set max products to process:

```bash
npm run enrich:all -- --max 500
```

---

## Best Practices

### Starting Out

1. **Run pilot first**: Test with 50 products
2. **Validate results**: Check uniqueness and quality
3. **Review low confidence**: Manually check < 0.60 confidence
4. **Adjust thresholds**: Tune based on results
5. **Scale up**: Process 500, then remainder

### Production

1. **Use checkpoints**: Resume from failures
2. **Monitor progress**: Watch quality metrics
3. **Review failures**: Check failed product queue
4. **Iterate prompts**: Refine based on output
5. **Backup database**: Before large runs

### Optimization

1. **Enable caching**: 20% cost/speed improvement
2. **Adjust concurrency**: Balance speed vs rate limits
3. **Tune quality thresholds**: Based on manual review
4. **Batch by type**: Process by wine type for better caching

---

## Common Workflows

### Workflow 1: Fresh Start

```bash
# 1. Pilot test
npm run enrich:pilot

# 2. Validate
npm run enrich:validate

# 3. If good, continue with batch
npm run enrich:batch -- --size 500

# 4. Validate again
npm run enrich:validate

# 5. Complete remaining
npm run enrich:all
```

### Workflow 2: Resume After Failure

```bash
# Check checkpoint
cat /tmp/enrichment-checkpoint-latest.json

# Resume from checkpoint
npm run enrich:resume

# Validate results
npm run enrich:validate
```

### Workflow 3: Re-enrich Low Quality

```bash
# Find low quality products
npm run enrich:find-low-quality

# Re-enrich with stricter settings
npm run enrich:retry -- --min-quality 0.80
```

---

## API Reference

### WineDetailsExtractor

```typescript
const extractor = new WineDetailsExtractor();

const details = extractor.extract({
  id: "uuid",
  name: "Bodegas Muga Reserva Rioja 2018",
  brand: "Bodegas Muga",
  category: "Red Wine",
  skus: [...]
});

// Returns: ExtractedWineDetails
// {
//   producer: "Bodegas Muga",
//   wineName: "Reserva",
//   region: "Rioja",
//   vintage: 2018,
//   varietal: "Tempranillo",
//   wineType: "red",
//   confidence: 0.95
// }
```

### WineInformationResolver

```typescript
const resolver = new WineInformationResolver(webFetch, llm);

const result = await resolver.resolve(wineDetails);

// Returns: WineSearchResult with confidence score
```

### TastingNotesGenerator

```typescript
const generator = new TastingNotesGenerator(llm);

const enrichment = await generator.generate(
  wineDetails,
  [searchResult],
  1 // fallback level
);

// Returns: EnrichedWineData
```

---

## Support

### Documentation

- [Architecture](./WINE_ENRICHMENT_ARCHITECTURE.md)
- [Component Diagrams](./WINE_ENRICHMENT_COMPONENT_DIAGRAM.md)
- [Implementation Plan](./WINE_ENRICHMENT_IMPLEMENTATION_PLAN.md)
- [ADRs](./WINE_ENRICHMENT_ADR.md)

### Troubleshooting

1. Check logs: `/logs/enrichment-*.log`
2. Review checkpoint: `/tmp/enrichment-checkpoint-*.json`
3. Validate database: `npm run enrich:validate`
4. Check failed products: `npm run enrich:failed`

### Common Issues

| Issue | Solution |
|-------|----------|
| Duplicates | Lower temperature, add uniqueness constraint |
| Low quality | Increase minQualityScore threshold |
| Slow processing | Increase concurrency |
| Rate limits | Decrease concurrency, add delays |
| Timeouts | Increase search timeout setting |

---

## Quick Reference

### File Structure

```
/src/lib/enrichment/
├── types.ts           # TypeScript interfaces
├── config.ts          # Configuration
├── extractor.ts       # Extract wine details
├── resolver.ts        # Web search & resolution
├── generator.ts       # LLM generation
├── validator.ts       # Uniqueness validation
├── persister.ts       # Database persistence
└── engine.ts          # Batch processing

/scripts/
├── enrich-wines-v2.ts # Main enrichment script
├── enrich-pilot.ts    # Pilot testing
└── validate-enrichment.ts # Quality validation

/docs/
├── WINE_ENRICHMENT_ARCHITECTURE.md
├── WINE_ENRICHMENT_COMPONENT_DIAGRAM.md
├── WINE_ENRICHMENT_IMPLEMENTATION_PLAN.md
├── WINE_ENRICHMENT_ADR.md
├── WINE_ENRICHMENT_SUMMARY.md
└── WINE_ENRICHMENT_QUICK_START.md (this file)
```

### Key Metrics

- **Processing Time**: ~1.5 hours (1,879 products)
- **Cost**: ~$35 total
- **Speed**: ~2.7 seconds per product
- **Throughput**: ~1,330 products/hour
- **Target Quality**: ≥ 0.75 average
- **Target Uniqueness**: 100%

---

**Ready to start? Run the pilot:**

```bash
npm run enrich:pilot
```

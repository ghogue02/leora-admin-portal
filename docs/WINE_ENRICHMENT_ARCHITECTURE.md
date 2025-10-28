# Wine Product Enrichment System Architecture

## Executive Summary

This document details a comprehensive architecture for accurately enriching 1,879 wine products with real, varietal-specific tasting notes using web research, wine databases, and intelligent fallback mechanisms.

## Problem Statement

Current enrichment approaches use generic templates based on wine type (red/white/sparkling), resulting in:
- Duplicate tasting notes across products
- Generic descriptions not specific to actual wines
- No vintage, producer, or terroir-specific information
- Poor customer experience and reduced trust

## System Requirements

### Functional Requirements
1. **Accuracy**: Each wine must have tasting notes specific to that exact product (name, vintage, producer)
2. **Web Research**: Use web search to find real information about each wine
3. **Intelligent Fallback**: Use varietal/region-specific characteristics if exact wine not found
4. **Uniqueness Validation**: Ensure notes are unique and accurate
5. **Batch Processing**: Process 1,879 products efficiently
6. **Error Handling**: Graceful degradation with logging

### Non-Functional Requirements
1. **Performance**: Process 50-100 products per hour
2. **Cost**: Minimize API costs (web search, LLM calls)
3. **Reliability**: Resume from failures, idempotent operations
4. **Auditability**: Track enrichment source and quality score
5. **Extensibility**: Support future data sources

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Wine Enrichment Pipeline                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Extractor  │→ │   Resolver   │→ │  Generator   │             │
│  │              │  │              │  │              │             │
│  │ Parse wine   │  │ Find real    │  │ Create rich  │             │
│  │ details from │  │ wine info    │  │ tasting      │             │
│  │ product name │  │ via web      │  │ notes        │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                    │
│         v                  v                  v                    │
│  ┌──────────────────────────────────────────────────┐             │
│  │           Validator & Uniqueness Checker          │             │
│  └──────────────────────────────────────────────────┘             │
│         │                                                           │
│         v                                                           │
│  ┌──────────────────────────────────────────────────┐             │
│  │              Database Persister                   │             │
│  └──────────────────────────────────────────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Wine Details Extractor

**Responsibility**: Parse product name and metadata to extract wine attributes

**Input**:
```typescript
interface ProductInput {
  id: string;
  name: string;           // e.g., "Bodegas Muga Reserva Rioja 2018"
  brand: string | null;   // e.g., "Bodegas Muga"
  category: string | null; // e.g., "Red Wine"
  skus: Array<{
    code: string;
    size: string | null;
    abv: number | null;
  }>;
}
```

**Output**:
```typescript
interface ExtractedWineDetails {
  producer: string;       // "Bodegas Muga"
  wineName: string;       // "Reserva"
  region: string;         // "Rioja"
  vintage: number | null; // 2018
  varietal: string | null; // Inferred from name/category
  wineType: 'red' | 'white' | 'sparkling' | 'rose' | 'fortified';
  confidence: number;     // 0-1 score
}
```

**Implementation Strategy**:

```typescript
class WineDetailsExtractor {
  // Pattern-based extraction using regex
  private readonly VINTAGE_PATTERN = /\b(19|20)\d{2}\b/;
  private readonly REGION_PATTERNS = {
    rioja: /rioja/i,
    ribera: /ribera\s+del\s+duero/i,
    priorat: /priorat/i,
    burgundy: /burgundy|bourgogne/i,
    bordeaux: /bordeaux/i,
    // ... more regions
  };

  private readonly VARIETAL_PATTERNS = {
    tempranillo: /tempranillo/i,
    garnacha: /garnacha|grenache/i,
    cabernet: /cabernet\s+sauvignon/i,
    // ... more varietals
  };

  extract(product: ProductInput): ExtractedWineDetails {
    // 1. Extract vintage from name
    const vintage = this.extractVintage(product.name);

    // 2. Identify region from name or brand
    const region = this.extractRegion(product.name, product.brand);

    // 3. Parse producer (usually brand, but validate)
    const producer = this.extractProducer(product.name, product.brand);

    // 4. Determine wine type from category and name patterns
    const wineType = this.determineWineType(product);

    // 5. Extract or infer varietal
    const varietal = this.extractVarietal(product.name, region);

    // 6. Calculate confidence score
    const confidence = this.calculateConfidence({
      hasVintage: !!vintage,
      hasRegion: !!region,
      hasProducer: !!producer,
      hasVarietal: !!varietal
    });

    return {
      producer,
      wineName: this.extractWineName(product.name, producer, region),
      region,
      vintage,
      varietal,
      wineType,
      confidence
    };
  }
}
```

---

### 2. Wine Information Resolver

**Responsibility**: Find accurate information about the wine from web sources

**Strategy**: Multi-tiered search with fallback hierarchy

#### 2.1 Search Hierarchy

```
Level 1: Exact Match Search
├─ Search: "{producer} {wineName} {vintage} {region} tasting notes"
├─ Sources: Wine databases, reviews, retailer sites
└─ Confidence: 0.9-1.0

Level 2: Producer + Wine Search
├─ Search: "{producer} {wineName} {region} wine review"
├─ Sources: Wine blogs, critic sites
└─ Confidence: 0.7-0.9

Level 3: Varietal + Region Search
├─ Search: "{varietal} {region} tasting profile characteristics"
├─ Sources: Wine education sites, regional authorities
└─ Confidence: 0.5-0.7

Level 4: Varietal Generic
├─ Search: "{varietal} typical tasting notes characteristics"
├─ Sources: Grape variety databases
└─ Confidence: 0.3-0.5
```

#### 2.2 Data Sources

**Primary Sources** (Highest Trust):
- Wine Spectator
- Wine Enthusiast
- Decanter
- Jancis Robinson
- Robert Parker / Wine Advocate
- Vivino (aggregated reviews)

**Secondary Sources**:
- Wine.com product descriptions
- Total Wine descriptions
- Regional wine authority websites
- Producer websites (for general style)

**Tertiary Sources**:
- Wine education sites (WSET, Court of Master Sommeliers)
- Grape variety databases
- Regional appellation guides

#### 2.3 Implementation

```typescript
interface WineSearchResult {
  source: string;
  url: string;
  tastingNotes: {
    aroma: string[];
    palate: string[];
    finish: string[];
  };
  foodPairings: string[];
  servingInfo: {
    temperature: string;
    decanting: string;
    glassware: string;
  };
  confidence: number;
  rating: number | null;
  reviewDate: Date | null;
}

class WineInformationResolver {
  constructor(
    private webSearch: WebSearchService,
    private llmService: LLMService
  ) {}

  async resolve(wineDetails: ExtractedWineDetails): Promise<WineSearchResult> {
    // Level 1: Exact match
    const exactMatch = await this.searchExactWine(wineDetails);
    if (exactMatch && exactMatch.confidence > 0.85) {
      return exactMatch;
    }

    // Level 2: Producer + Wine
    const producerMatch = await this.searchProducerWine(wineDetails);
    if (producerMatch && producerMatch.confidence > 0.70) {
      return this.enhanceWithVarietalInfo(producerMatch, wineDetails);
    }

    // Level 3: Varietal + Region
    const varietalRegionMatch = await this.searchVarietalRegion(wineDetails);
    if (varietalRegionMatch && varietalRegionMatch.confidence > 0.50) {
      return this.enhanceWithProducerStyle(varietalRegionMatch, wineDetails);
    }

    // Level 4: Varietal generic
    return this.searchVarietalGeneric(wineDetails);
  }

  private async searchExactWine(
    details: ExtractedWineDetails
  ): Promise<WineSearchResult | null> {
    const query = `"${details.producer}" "${details.wineName}" ${details.vintage || ''} ${details.region} tasting notes review`;

    // Use WebFetch tool to search and extract
    const results = await this.webSearch.search(query, {
      prioritySources: [
        'wineenthusiast.com',
        'winespectator.com',
        'decanter.com',
        'jancisrobinson.com'
      ],
      maxResults: 5
    });

    // Process results with LLM to extract structured tasting notes
    return this.extractTastingNotes(results, details);
  }
}
```

---

### 3. Tasting Notes Generator

**Responsibility**: Create rich, accurate tasting notes from research

**Input**:
```typescript
interface GeneratorInput {
  wineDetails: ExtractedWineDetails;
  searchResults: WineSearchResult[];
  fallbackLevel: 1 | 2 | 3 | 4;
}
```

**Output**:
```typescript
interface EnrichedWineData {
  description: string;
  tastingNotes: {
    aroma: string;      // Descriptive prose
    palate: string;     // Descriptive prose
    finish: string;     // Descriptive prose
  };
  foodPairings: string[];
  servingInfo: {
    temperature: string;
    decanting: string;
    glassware: string;
  };
  wineDetails: {
    region: string;
    grapeVariety: string;
    vintage: number | null;
    style: string;
    ageability: string;
  };
  metadata: {
    enrichmentSource: string;  // 'exact-match' | 'producer-wine' | 'varietal-region' | 'varietal'
    confidence: number;
    enrichedAt: Date;
    enrichedBy: string;
    sourceUrls: string[];
  };
}
```

**Implementation**:

```typescript
class TastingNotesGenerator {
  private readonly SYSTEM_PROMPT = `You are an expert sommelier creating tasting notes for a wine database.

Given research about a specific wine, create:
1. A compelling 2-3 sentence description
2. Detailed tasting notes (aroma, palate, finish)
3. Food pairing recommendations
4. Serving recommendations

CRITICAL RULES:
- Be SPECIFIC to this wine, not generic
- Use actual vintage/producer characteristics when available
- Avoid clichés and marketing language
- Be accurate and educational
- If limited info, clearly state when generalizing`;

  async generate(input: GeneratorInput): Promise<EnrichedWineData> {
    const prompt = this.buildPrompt(input);

    const response = await this.llm.complete({
      system: this.SYSTEM_PROMPT,
      prompt,
      temperature: 0.3, // Low for consistency
      maxTokens: 800
    });

    return this.parseAndValidate(response, input);
  }

  private buildPrompt(input: GeneratorInput): string {
    const { wineDetails, searchResults, fallbackLevel } = input;

    let prompt = `Wine: ${wineDetails.producer} ${wineDetails.wineName}
Vintage: ${wineDetails.vintage || 'NV'}
Region: ${wineDetails.region}
Varietal: ${wineDetails.varietal || 'Unknown'}
Type: ${wineDetails.wineType}

`;

    if (fallbackLevel === 1) {
      // Exact match - use specific research
      prompt += `RESEARCH FOUND (High Confidence):
${this.formatSearchResults(searchResults)}

Create SPECIFIC tasting notes for this exact wine based on the research above.`;
    } else if (fallbackLevel === 2) {
      // Producer style
      prompt += `PRODUCER INFO:
${this.formatSearchResults(searchResults)}

Create tasting notes reflecting ${wineDetails.producer}'s typical style for ${wineDetails.region} wines.`;
    } else if (fallbackLevel === 3) {
      // Varietal + region
      prompt += `VARIETAL/REGION INFO:
${this.formatSearchResults(searchResults)}

Create tasting notes reflecting typical ${wineDetails.varietal} from ${wineDetails.region}.`;
    } else {
      // Varietal generic
      prompt += `Create tasting notes for a typical ${wineDetails.varietal} wine.
NOTE: Limited specific information available.`;
    }

    return prompt;
  }
}
```

---

### 4. Uniqueness Validator

**Responsibility**: Ensure generated notes are unique and not duplicates

```typescript
class UniquenessValidator {
  async validate(
    newEnrichment: EnrichedWineData,
    productId: string,
    db: PrismaClient
  ): Promise<ValidationResult> {
    // 1. Check for exact duplicate aromastrings
    const duplicateAroma = await db.product.findFirst({
      where: {
        id: { not: productId },
        tastingNotes: {
          path: ['aroma'],
          equals: newEnrichment.tastingNotes.aroma
        }
      },
      select: { id: true, name: true }
    });

    if (duplicateAroma) {
      return {
        isValid: false,
        reason: 'DUPLICATE_AROMA',
        conflictingProduct: duplicateAroma
      };
    }

    // 2. Check for high similarity (fuzzy match)
    const similarProducts = await this.findSimilarProducts(
      newEnrichment,
      productId,
      db
    );

    if (similarProducts.length > 0) {
      return {
        isValid: false,
        reason: 'HIGH_SIMILARITY',
        conflictingProducts: similarProducts,
        similarity: 0.9 // threshold
      };
    }

    // 3. Validate against quality rules
    const qualityCheck = this.validateQuality(newEnrichment);

    return qualityCheck;
  }

  private validateQuality(enrichment: EnrichedWineData): ValidationResult {
    const issues: string[] = [];

    // Check for generic phrases
    const genericPhrases = [
      'sophisticated wine',
      'perfect for any occasion',
      'pairs well with everything'
    ];

    const description = enrichment.description.toLowerCase();
    genericPhrases.forEach(phrase => {
      if (description.includes(phrase)) {
        issues.push(`Contains generic phrase: "${phrase}"`);
      }
    });

    // Check for minimum specificity
    if (enrichment.description.split(' ').length < 20) {
      issues.push('Description too short (< 20 words)');
    }

    // Check for required elements
    if (!enrichment.wineDetails.region || !enrichment.wineDetails.grapeVariety) {
      issues.push('Missing required wine details');
    }

    return {
      isValid: issues.length === 0,
      reason: issues.join('; ') || 'PASSED',
      qualityScore: this.calculateQualityScore(enrichment)
    };
  }
}
```

---

### 5. Batch Processing Engine

**Responsibility**: Orchestrate enrichment of all products efficiently

```typescript
interface BatchConfig {
  batchSize: number;        // Products per batch (default: 25)
  concurrency: number;      // Parallel processing (default: 3)
  retryAttempts: number;    // Retry failed products (default: 3)
  resumeFromFailure: boolean; // Resume from last checkpoint
  checkpointInterval: number; // Save progress every N products
}

class BatchEnrichmentEngine {
  private progress: {
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };

  async enrichAll(config: BatchConfig): Promise<BatchResult> {
    // 1. Get products to enrich
    const products = await this.getProductsToEnrich();

    this.progress = {
      total: products.length,
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0
    };

    // 2. Resume from checkpoint if exists
    const checkpoint = await this.loadCheckpoint();
    const startIndex = checkpoint?.lastProcessedIndex || 0;

    // 3. Process in batches with concurrency control
    const batches = this.createBatches(
      products.slice(startIndex),
      config.batchSize
    );

    for (const batch of batches) {
      await this.processBatch(batch, config);

      // Save checkpoint
      if (this.progress.processed % config.checkpointInterval === 0) {
        await this.saveCheckpoint(this.progress);
      }
    }

    return this.progress;
  }

  private async processBatch(
    products: Product[],
    config: BatchConfig
  ): Promise<void> {
    // Process products concurrently within batch
    const chunks = this.chunk(products, config.concurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(product =>
        this.enrichProduct(product, config.retryAttempts)
      );

      const results = await Promise.allSettled(promises);

      results.forEach((result, idx) => {
        this.progress.processed++;

        if (result.status === 'fulfilled') {
          this.progress.succeeded++;
          console.log(`✓ ${chunk[idx].name}`);
        } else {
          this.progress.failed++;
          console.error(`✗ ${chunk[idx].name}: ${result.reason}`);
        }
      });

      // Rate limiting
      await this.sleep(1000); // 1 second between concurrent batches
    }
  }

  private async enrichProduct(
    product: Product,
    retries: number
  ): Promise<void> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 1. Extract wine details
        const wineDetails = await this.extractor.extract(product);

        // 2. Resolve wine information
        const searchResults = await this.resolver.resolve(wineDetails);

        // 3. Generate tasting notes
        const enrichment = await this.generator.generate({
          wineDetails,
          searchResults: [searchResults],
          fallbackLevel: this.determineFallbackLevel(searchResults)
        });

        // 4. Validate uniqueness
        const validation = await this.validator.validate(
          enrichment,
          product.id
        );

        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.reason}`);
        }

        // 5. Save to database
        await this.persister.save(product.id, enrichment);

        return; // Success

      } catch (error) {
        if (attempt === retries) {
          throw error; // Final attempt failed
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }
}
```

---

## Database Schema Enhancements

```typescript
// Existing Product model enhancements
model Product {
  // ... existing fields ...

  // Enhanced enrichment metadata
  enrichmentMetadata Json? // Store detailed metadata

  // Example enrichmentMetadata structure:
  // {
  //   "source": "exact-match",
  //   "confidence": 0.92,
  //   "sourceUrls": ["https://..."],
  //   "fallbackLevel": 1,
  //   "enrichedAt": "2025-01-20T...",
  //   "enrichedBy": "wine-enrichment-v2",
  //   "validationScore": 0.88,
  //   "searchQuery": "...",
  //   "extractedDetails": { ... }
  // }
}
```

---

## Error Handling & Logging

```typescript
interface EnrichmentLog {
  productId: string;
  productName: string;
  timestamp: Date;
  stage: 'extract' | 'resolve' | 'generate' | 'validate' | 'persist';
  status: 'success' | 'warning' | 'error';
  message: string;
  metadata: any;
}

class EnrichmentLogger {
  private logs: EnrichmentLog[] = [];

  log(entry: Omit<EnrichmentLog, 'timestamp'>) {
    const logEntry = {
      ...entry,
      timestamp: new Date()
    };

    this.logs.push(logEntry);

    // Also write to file for debugging
    this.writeToFile(logEntry);
  }

  async generateReport(): Promise<string> {
    const summary = {
      total: this.logs.length,
      byStatus: this.groupBy(this.logs, 'status'),
      byStage: this.groupBy(this.logs, 'stage'),
      errors: this.logs.filter(l => l.status === 'error')
    };

    return this.formatReport(summary);
  }
}
```

---

## Performance Optimization

### Caching Strategy

```typescript
class EnrichmentCache {
  // Cache search results by wine details hash
  private searchCache = new Map<string, WineSearchResult>();

  // Cache LLM responses by prompt hash
  private llmCache = new Map<string, string>();

  getCachedSearch(wineDetails: ExtractedWineDetails): WineSearchResult | null {
    const key = this.hashWineDetails(wineDetails);
    return this.searchCache.get(key) || null;
  }

  setCachedSearch(wineDetails: ExtractedWineDetails, result: WineSearchResult) {
    const key = this.hashWineDetails(wineDetails);
    this.searchCache.set(key, result);
  }
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requestCounts = new Map<string, number>();

  async throttle(service: string, maxPerMinute: number) {
    const key = `${service}:${Math.floor(Date.now() / 60000)}`;
    const count = this.requestCounts.get(key) || 0;

    if (count >= maxPerMinute) {
      const waitTime = 60000 - (Date.now() % 60000);
      await this.sleep(waitTime);
    }

    this.requestCounts.set(key, count + 1);
  }
}
```

---

## Deployment & Execution

### CLI Interface

```bash
# Enrich all products
npm run enrich:wines -- --all

# Enrich specific batch
npm run enrich:wines -- --batch 50

# Preview mode (no saves)
npm run enrich:wines -- --preview --limit 10

# Resume from checkpoint
npm run enrich:wines -- --resume

# Generate enrichment report
npm run enrich:wines -- --report
```

### Configuration

```typescript
// config/enrichment.config.ts
export const enrichmentConfig = {
  batch: {
    size: 25,
    concurrency: 3,
    retryAttempts: 3,
    checkpointInterval: 50
  },

  search: {
    maxResults: 5,
    timeout: 10000,
    prioritySources: [
      'wineenthusiast.com',
      'winespectator.com',
      'decanter.com'
    ]
  },

  llm: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 800
  },

  validation: {
    minConfidence: 0.5,
    minQualityScore: 0.7,
    similarityThreshold: 0.85
  }
};
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('WineDetailsExtractor', () => {
  it('should extract vintage from product name', () => {
    const product = {
      name: 'Bodegas Muga Reserva Rioja 2018',
      brand: 'Bodegas Muga',
      category: 'Red Wine'
    };

    const result = extractor.extract(product);

    expect(result.vintage).toBe(2018);
    expect(result.region).toBe('Rioja');
    expect(result.producer).toBe('Bodegas Muga');
  });
});
```

### Integration Tests

```typescript
describe('Full Enrichment Pipeline', () => {
  it('should enrich a product end-to-end', async () => {
    const product = await createTestProduct();

    const result = await enrichmentEngine.enrichProduct(product);

    expect(result.tastingNotes).toBeDefined();
    expect(result.tastingNotes.aroma).not.toContain('sophisticated wine');
    expect(result.metadata.confidence).toBeGreaterThan(0.5);
  });
});
```

---

## Monitoring & Quality Assurance

### Metrics Dashboard

```typescript
interface EnrichmentMetrics {
  totalProcessed: number;
  successRate: number;
  averageConfidence: number;
  averageQualityScore: number;
  fallbackDistribution: {
    exactMatch: number;
    producerWine: number;
    varietalRegion: number;
    varietalGeneric: number;
  };
  processingSpeed: number; // products per hour
  errorRate: number;
}
```

### Quality Audit

```typescript
// Run periodic audits on enriched products
async function auditEnrichedProducts(sampleSize: number) {
  const products = await getRandomEnrichedProducts(sampleSize);

  const results = await Promise.all(
    products.map(async product => {
      const isDuplicate = await checkForDuplicates(product);
      const isGeneric = await checkForGenericPhrases(product);
      const isAccurate = await verifyAccuracy(product);

      return {
        productId: product.id,
        isDuplicate,
        isGeneric,
        isAccurate,
        confidence: product.enrichmentMetadata.confidence
      };
    })
  );

  return generateAuditReport(results);
}
```

---

## Cost Estimation

### Per-Product Costs

```
Web Search: $0.002 per search (avg 2 searches) = $0.004
LLM Generation: $0.015 per product (800 tokens @ Claude 3.5)
Total: ~$0.019 per product

1,879 products × $0.019 = ~$35.70 total
```

### Time Estimation

```
Extraction: 0.1 seconds
Web Search: 2-3 seconds
LLM Generation: 3-5 seconds
Validation: 0.5 seconds
Persistence: 0.5 seconds

Total: ~8 seconds per product
With batching (3 concurrent): ~3 seconds per product
1,879 products ÷ 1,200/hour = ~1.5 hours total
```

---

## Rollout Plan

### Phase 1: Pilot (50 products)
- Test all components
- Validate uniqueness
- Measure quality
- Refine prompts

### Phase 2: Batch Processing (500 products)
- Run full pipeline
- Monitor errors
- Adjust thresholds
- Verify results

### Phase 3: Full Deployment (remaining ~1,329)
- Process all remaining
- Generate quality report
- Manual review of low-confidence results
- Final validation

---

## Appendix: Data Flow Example

```
Product Input:
  name: "Bodegas Muga Reserva Rioja 2018"
  brand: "Bodegas Muga"
  category: "Red Wine"

↓ EXTRACT ↓

Extracted Details:
  producer: "Bodegas Muga"
  wineName: "Reserva"
  region: "Rioja"
  vintage: 2018
  varietal: "Tempranillo"
  wineType: "red"
  confidence: 0.95

↓ RESOLVE ↓

Search: "Bodegas Muga Reserva 2018 Rioja tasting notes"
Found: Wine Enthusiast review (92 points)
Source: https://wineenthusiast.com/...

↓ GENERATE ↓

Enrichment:
  description: "Bodegas Muga Reserva 2018 is a classic Rioja
    showcasing the elegance and structure that has made this
    producer legendary. Aged for 24 months in French and
    American oak, this Tempranillo-based blend offers remarkable
    balance between fruit and oak influence."

  tastingNotes:
    aroma: "Cherry and raspberry mingle with vanilla, toasted
      oak, and hints of tobacco and leather. Subtle notes of
      spice and dried herbs add complexity."
    palate: "Medium to full-bodied with silky tannins. Red
      cherry, plum, and blackberry flavors are beautifully
      integrated with oak spice. Bright acidity provides
      freshness and food-friendliness."
    finish: "Long, elegant finish with lingering fruit, spice,
      and fine-grained tannins. Shows excellent aging potential."

  metadata:
    source: "exact-match"
    confidence: 0.92
    fallbackLevel: 1
    sourceUrls: ["https://wineenthusiast.com/..."]

↓ VALIDATE ↓

Uniqueness: PASS (no duplicates found)
Quality Score: 0.88
Generic Phrases: PASS (none detected)

↓ PERSIST ↓

Saved to database with enrichmentMetadata
```

---

## Conclusion

This architecture provides a robust, scalable solution for enriching wine products with accurate, unique tasting notes. The multi-tiered search strategy ensures we find real information when available, while intelligent fallbacks maintain quality when specific data isn't accessible. The validation layer guarantees uniqueness, and the batch processing engine handles the full catalog efficiently.

The system is designed to be:
- **Accurate**: Web research finds real wine information
- **Unique**: Validation prevents duplicate content
- **Scalable**: Batch processing handles 1,879+ products
- **Cost-effective**: ~$35 for full catalog
- **Maintainable**: Clear component boundaries and logging
- **Auditable**: Comprehensive metadata tracking

Next steps: Implement components in order, test with pilot batch, then scale to full catalog.

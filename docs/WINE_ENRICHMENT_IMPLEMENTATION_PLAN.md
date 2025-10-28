# Wine Enrichment System - Implementation Plan

## Overview

This document provides a detailed, step-by-step implementation plan for building the Wine Enrichment System.

---

## Phase 1: Foundation & Core Components (Week 1)

### 1.1 Project Setup

**Files to Create**:
```
/src/lib/enrichment/
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Configuration settings
├── extractor.ts                # Wine details extraction
├── resolver.ts                 # Web search & resolution
├── generator.ts                # LLM-based generation
├── validator.ts                # Uniqueness validation
├── persister.ts                # Database persistence
├── cache.ts                    # Caching layer
├── rate-limiter.ts             # Rate limiting
├── logger.ts                   # Logging system
└── engine.ts                   # Batch processing engine
```

**Scripts**:
```
/scripts/
├── enrich-wines-v2.ts          # Main CLI script
├── test-enrichment.ts          # Testing utilities
├── validate-enrichment.ts      # Quality validation
└── enrich-pilot.ts             # Pilot run (50 products)
```

### 1.2 Type Definitions

**File**: `/src/lib/enrichment/types.ts`

```typescript
// Core interfaces
export interface ProductInput {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  skus: Array<{
    code: string;
    size: string | null;
    abv: number | null;
  }>;
}

export interface ExtractedWineDetails {
  producer: string;
  wineName: string;
  region: string;
  vintage: number | null;
  varietal: string | null;
  wineType: 'red' | 'white' | 'sparkling' | 'rose' | 'fortified';
  confidence: number;
}

export interface WineSearchResult {
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

export interface EnrichedWineData {
  description: string;
  tastingNotes: {
    aroma: string;
    palate: string;
    finish: string;
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
    enrichmentSource: 'exact-match' | 'producer-wine' | 'varietal-region' | 'varietal';
    confidence: number;
    enrichedAt: Date;
    enrichedBy: string;
    sourceUrls: string[];
  };
}

export interface ValidationResult {
  isValid: boolean;
  reason: string;
  qualityScore?: number;
  warnings?: string[];
  conflictingProducts?: any[];
}

export interface BatchConfig {
  batchSize: number;
  concurrency: number;
  retryAttempts: number;
  resumeFromFailure: boolean;
  checkpointInterval: number;
}

export interface EnrichmentProgress {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
}
```

### 1.3 Configuration

**File**: `/src/lib/enrichment/config.ts`

```typescript
export const enrichmentConfig = {
  batch: {
    size: 25,
    concurrency: 3,
    retryAttempts: 3,
    checkpointInterval: 50,
  },

  search: {
    maxResults: 5,
    timeout: 10000, // 10 seconds
    prioritySources: [
      'wineenthusiast.com',
      'winespectator.com',
      'decanter.com',
      'jancisrobinson.com',
      'wine.com',
      'totalwine.com',
    ],
  },

  llm: {
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 800,
  },

  validation: {
    minConfidence: 0.5,
    minQualityScore: 0.7,
    similarityThreshold: 0.85,
    genericPhrases: [
      'sophisticated wine',
      'perfect for any occasion',
      'pairs well with everything',
      'elegant and refined',
      'rich and complex',
      // ... more generic phrases
    ],
  },

  cache: {
    enabled: true,
    searchResultTTL: 7 * 24 * 60 * 60, // 7 days
    llmResponseTTL: 30 * 24 * 60 * 60, // 30 days
    varietalProfileTTL: 90 * 24 * 60 * 60, // 90 days
  },

  rateLimits: {
    webSearch: 60, // per minute
    anthropicAPI: 50, // per minute
  },
};
```

---

## Phase 2: Core Component Implementation (Week 1-2)

### 2.1 Wine Details Extractor

**File**: `/src/lib/enrichment/extractor.ts`

```typescript
import { ProductInput, ExtractedWineDetails } from './types';

export class WineDetailsExtractor {
  private readonly VINTAGE_PATTERN = /\b(19|20)\d{2}\b/;

  private readonly REGION_PATTERNS = {
    rioja: /rioja/i,
    'ribera del duero': /ribera\s+del\s+duero/i,
    priorat: /priorat/i,
    burgundy: /burgundy|bourgogne/i,
    bordeaux: /bordeaux/i,
    napa: /napa\s+valley/i,
    sonoma: /sonoma/i,
    willamette: /willamette\s+valley/i,
    // ... more regions
  };

  private readonly VARIETAL_PATTERNS = {
    tempranillo: /tempranillo/i,
    'cabernet sauvignon': /cabernet\s+sauvignon/i,
    merlot: /merlot/i,
    'pinot noir': /pinot\s+noir/i,
    chardonnay: /chardonnay/i,
    // ... more varietals
  };

  extract(product: ProductInput): ExtractedWineDetails {
    const vintage = this.extractVintage(product.name);
    const region = this.extractRegion(product.name, product.brand);
    const producer = this.extractProducer(product.name, product.brand);
    const wineType = this.determineWineType(product);
    const varietal = this.extractVarietal(product.name, region);
    const wineName = this.extractWineName(product.name, producer, region);

    const confidence = this.calculateConfidence({
      hasVintage: !!vintage,
      hasRegion: !!region,
      hasProducer: !!producer,
      hasVarietal: !!varietal,
    });

    return {
      producer: producer || 'Unknown Producer',
      wineName: wineName || product.name,
      region: region || 'Unknown Region',
      vintage,
      varietal,
      wineType,
      confidence,
    };
  }

  private extractVintage(name: string): number | null {
    const match = name.match(this.VINTAGE_PATTERN);
    return match ? parseInt(match[0], 10) : null;
  }

  private extractRegion(name: string, brand: string | null): string {
    const searchText = `${name} ${brand || ''}`.toLowerCase();

    for (const [region, pattern] of Object.entries(this.REGION_PATTERNS)) {
      if (pattern.test(searchText)) {
        return region;
      }
    }

    return '';
  }

  private extractVarietal(name: string, region: string): string | null {
    const searchText = name.toLowerCase();

    for (const [varietal, pattern] of Object.entries(this.VARIETAL_PATTERNS)) {
      if (pattern.test(searchText)) {
        return varietal;
      }
    }

    // Infer from region if possible
    return this.inferVarietalFromRegion(region);
  }

  private inferVarietalFromRegion(region: string): string | null {
    const regionVarietalMap: Record<string, string> = {
      rioja: 'Tempranillo',
      'ribera del duero': 'Tempranillo',
      burgundy: 'Pinot Noir',
      // ... more mappings
    };

    return regionVarietalMap[region.toLowerCase()] || null;
  }

  private extractProducer(name: string, brand: string | null): string {
    // Use brand if available
    if (brand) return brand;

    // Try to extract from name (first 1-3 words before wine type/region)
    // This is a simplified version
    return name.split(' ').slice(0, 2).join(' ');
  }

  private extractWineName(
    fullName: string,
    producer: string,
    region: string
  ): string {
    // Remove producer and region from name to get wine name
    let wineName = fullName;

    if (producer) {
      wineName = wineName.replace(producer, '').trim();
    }

    if (region) {
      wineName = wineName.replace(new RegExp(region, 'i'), '').trim();
    }

    // Remove vintage
    wineName = wineName.replace(this.VINTAGE_PATTERN, '').trim();

    return wineName || fullName;
  }

  private determineWineType(product: ProductInput): ExtractedWineDetails['wineType'] {
    const name = product.name.toLowerCase();
    const category = (product.category || '').toLowerCase();

    if (name.includes('sparkling') || name.includes('champagne') || name.includes('prosecco')) {
      return 'sparkling';
    }
    if (name.includes('rosé') || name.includes('rose')) {
      return 'rose';
    }
    if (name.includes('port') || name.includes('sherry')) {
      return 'fortified';
    }
    if (category.includes('white') || name.includes('chardonnay') || name.includes('sauvignon blanc')) {
      return 'white';
    }

    return 'red'; // Default
  }

  private calculateConfidence(factors: {
    hasVintage: boolean;
    hasRegion: boolean;
    hasProducer: boolean;
    hasVarietal: boolean;
  }): number {
    const weights = {
      hasVintage: 0.2,
      hasRegion: 0.3,
      hasProducer: 0.3,
      hasVarietal: 0.2,
    };

    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      if (factors[key as keyof typeof factors]) {
        score += weight;
      }
    }

    return score;
  }
}
```

### 2.2 Web Search & Information Resolver

**File**: `/src/lib/enrichment/resolver.ts`

```typescript
import { ExtractedWineDetails, WineSearchResult } from './types';
import { enrichmentConfig } from './config';

export class WineInformationResolver {
  constructor(
    private webFetch: typeof import('claude-code').WebFetch,
    private llm: LLMService
  ) {}

  async resolve(wineDetails: ExtractedWineDetails): Promise<WineSearchResult> {
    // Level 1: Exact match
    const exactMatch = await this.searchExactWine(wineDetails);
    if (exactMatch && exactMatch.confidence >= 0.85) {
      return exactMatch;
    }

    // Level 2: Producer + Wine
    const producerMatch = await this.searchProducerWine(wineDetails);
    if (producerMatch && producerMatch.confidence >= 0.70) {
      return producerMatch;
    }

    // Level 3: Varietal + Region
    const varietalRegionMatch = await this.searchVarietalRegion(wineDetails);
    if (varietalRegionMatch && varietalRegionMatch.confidence >= 0.50) {
      return varietalRegionMatch;
    }

    // Level 4: Varietal generic
    return this.searchVarietalGeneric(wineDetails);
  }

  private async searchExactWine(
    details: ExtractedWineDetails
  ): Promise<WineSearchResult | null> {
    const query = this.buildExactMatchQuery(details);

    const searchPrompt = `Find tasting notes and wine information for: ${query}

Search priority sources: Wine Enthusiast, Wine Spectator, Decanter, Jancis Robinson

Extract:
1. Tasting notes (aroma, palate, finish)
2. Food pairings
3. Serving recommendations
4. Rating (if available)
5. Review date

Return structured data in JSON format.`;

    try {
      const result = await this.webFetch(query, searchPrompt);

      // Parse and structure the response
      return this.parseSearchResult(result, details, 0.9);
    } catch (error) {
      console.warn('Exact match search failed:', error);
      return null;
    }
  }

  private buildExactMatchQuery(details: ExtractedWineDetails): string {
    const parts = [
      details.producer,
      details.wineName,
      details.vintage?.toString(),
      details.region,
      'tasting notes',
    ].filter(Boolean);

    return parts.join(' ');
  }

  private async searchProducerWine(
    details: ExtractedWineDetails
  ): Promise<WineSearchResult | null> {
    const query = `${details.producer} ${details.wineName} ${details.region} wine review`;

    const searchPrompt = `Find wine reviews and information about ${details.producer}'s ${details.wineName} from ${details.region}.

Focus on the producer's typical style and characteristics for this wine.

Extract:
1. Producer style and approach
2. Typical tasting notes
3. Food pairing suggestions
4. Serving recommendations

Return structured data.`;

    try {
      const result = await this.webFetch(query, searchPrompt);
      return this.parseSearchResult(result, details, 0.75);
    } catch (error) {
      console.warn('Producer wine search failed:', error);
      return null;
    }
  }

  private async searchVarietalRegion(
    details: ExtractedWineDetails
  ): Promise<WineSearchResult | null> {
    if (!details.varietal) return null;

    const query = `${details.varietal} ${details.region} tasting profile characteristics`;

    const searchPrompt = `Find information about ${details.varietal} wines from ${details.region}.

Focus on regional and varietal characteristics.

Extract:
1. Typical aroma profile
2. Flavor characteristics
3. Structure and style
4. Food pairings
5. Serving recommendations

Return structured data.`;

    try {
      const result = await this.webFetch(query, searchPrompt);
      return this.parseSearchResult(result, details, 0.60);
    } catch (error) {
      console.warn('Varietal region search failed:', error);
      return null;
    }
  }

  private async searchVarietalGeneric(
    details: ExtractedWineDetails
  ): Promise<WineSearchResult> {
    const varietal = details.varietal || details.wineType;
    const query = `${varietal} typical tasting notes characteristics`;

    const searchPrompt = `Find general information about ${varietal} wines.

Extract:
1. Typical aromas and flavors
2. Common characteristics
3. General food pairings
4. Serving suggestions

Return structured data.`;

    try {
      const result = await this.webFetch(query, searchPrompt);
      return this.parseSearchResult(result, details, 0.40);
    } catch (error) {
      // Fallback to basic knowledge
      return this.getFallbackProfile(details);
    }
  }

  private parseSearchResult(
    rawResult: string,
    details: ExtractedWineDetails,
    baseConfidence: number
  ): WineSearchResult {
    // Use LLM to parse and structure the search results
    const prompt = `Parse this wine information into structured JSON:

${rawResult}

Return JSON with:
{
  "tastingNotes": {
    "aroma": ["descriptor1", "descriptor2", ...],
    "palate": ["descriptor1", "descriptor2", ...],
    "finish": ["descriptor1", "descriptor2", ...]
  },
  "foodPairings": ["pairing1", "pairing2", ...],
  "servingInfo": {
    "temperature": "...",
    "decanting": "...",
    "glassware": "..."
  },
  "rating": number or null,
  "reviewDate": "YYYY-MM-DD" or null
}`;

    // This would call your LLM service
    const structured = this.llm.parseJSON(prompt);

    return {
      source: 'Web Search',
      url: '', // Would be extracted from WebFetch result
      ...structured,
      confidence: baseConfidence,
    };
  }

  private getFallbackProfile(details: ExtractedWineDetails): WineSearchResult {
    // Basic fallback profiles by wine type
    // This is a simplified version
    return {
      source: 'Fallback Profile',
      url: '',
      tastingNotes: {
        aroma: ['fruit', 'oak', 'spice'],
        palate: ['balanced', 'smooth', 'flavorful'],
        finish: ['moderate', 'pleasant'],
      },
      foodPairings: ['grilled meats', 'pasta', 'cheese'],
      servingInfo: {
        temperature: '60-65°F',
        decanting: 'Optional',
        glassware: 'Standard wine glass',
      },
      confidence: 0.3,
      rating: null,
      reviewDate: null,
    };
  }
}
```

---

## Phase 3: Generation & Validation (Week 2)

### 3.1 Tasting Notes Generator

**File**: `/src/lib/enrichment/generator.ts`

```typescript
import { ExtractedWineDetails, WineSearchResult, EnrichedWineData } from './types';

export class TastingNotesGenerator {
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
- If limited info, clearly state when generalizing
- Create UNIQUE descriptions - no duplicate phrases`;

  constructor(private llm: LLMService) {}

  async generate(
    wineDetails: ExtractedWineDetails,
    searchResults: WineSearchResult[],
    fallbackLevel: 1 | 2 | 3 | 4
  ): Promise<EnrichedWineData> {
    const prompt = this.buildPrompt(wineDetails, searchResults, fallbackLevel);

    const response = await this.llm.complete({
      system: this.SYSTEM_PROMPT,
      prompt,
      temperature: 0.3,
      maxTokens: 800,
    });

    return this.parseAndValidate(response, wineDetails, searchResults[0]);
  }

  private buildPrompt(
    wineDetails: ExtractedWineDetails,
    searchResults: WineSearchResult[],
    fallbackLevel: number
  ): string {
    const result = searchResults[0];

    let prompt = `Wine: ${wineDetails.producer} ${wineDetails.wineName}
Vintage: ${wineDetails.vintage || 'NV'}
Region: ${wineDetails.region}
Varietal: ${wineDetails.varietal || 'Unknown'}
Type: ${wineDetails.wineType}

`;

    if (fallbackLevel === 1) {
      prompt += `RESEARCH FOUND (High Confidence - Exact Match):
Source: ${result.source}
${result.rating ? `Rating: ${result.rating} points` : ''}

Tasting Notes from Research:
Aroma: ${result.tastingNotes.aroma.join(', ')}
Palate: ${result.tastingNotes.palate.join(', ')}
Finish: ${result.tastingNotes.finish.join(', ')}

Create SPECIFIC tasting notes for this exact wine based on the research above.
Write in prose format (not bullet points).`;
    } else if (fallbackLevel === 2) {
      prompt += `PRODUCER INFO (Moderate Confidence):
${this.formatSearchResult(result)}

Create tasting notes reflecting ${wineDetails.producer}'s typical style for ${wineDetails.region} wines.
Be specific but acknowledge this is based on producer style.`;
    } else if (fallbackLevel === 3) {
      prompt += `VARIETAL/REGION INFO (Limited Specificity):
${this.formatSearchResult(result)}

Create tasting notes reflecting typical ${wineDetails.varietal} from ${wineDetails.region}.
Acknowledge limited specific information about this exact wine.`;
    } else {
      prompt += `Create tasting notes for a typical ${wineDetails.varietal || wineDetails.wineType} wine.
NOTE: Very limited specific information available - use general varietal characteristics.`;
    }

    prompt += `\n\nReturn JSON:
{
  "description": "2-3 sentence description...",
  "tastingNotes": {
    "aroma": "Descriptive prose about aromas...",
    "palate": "Descriptive prose about palate...",
    "finish": "Descriptive prose about finish..."
  },
  "foodPairings": ["pairing1", "pairing2", ...],
  "servingInfo": {
    "temperature": "...",
    "decanting": "...",
    "glassware": "..."
  },
  "wineDetails": {
    "region": "${wineDetails.region}",
    "grapeVariety": "${wineDetails.varietal || 'Unknown'}",
    "vintage": ${wineDetails.vintage || null},
    "style": "...",
    "ageability": "..."
  }
}`;

    return prompt;
  }

  private formatSearchResult(result: WineSearchResult): string {
    return `Research Notes:
- Aroma: ${result.tastingNotes.aroma.join(', ')}
- Palate: ${result.tastingNotes.palate.join(', ')}
- Finish: ${result.tastingNotes.finish.join(', ')}
- Suggested Pairings: ${result.foodPairings.join(', ')}
- Serving: ${result.servingInfo.temperature}, ${result.servingInfo.glassware}`;
  }

  private parseAndValidate(
    response: string,
    wineDetails: ExtractedWineDetails,
    searchResult: WineSearchResult
  ): EnrichedWineData {
    // Parse JSON response
    const data = JSON.parse(response);

    // Add metadata
    return {
      ...data,
      metadata: {
        enrichmentSource: this.determineSource(searchResult.confidence),
        confidence: searchResult.confidence,
        enrichedAt: new Date(),
        enrichedBy: 'wine-enrichment-v2',
        sourceUrls: [searchResult.url].filter(Boolean),
      },
    };
  }

  private determineSource(confidence: number): EnrichedWineData['metadata']['enrichmentSource'] {
    if (confidence >= 0.85) return 'exact-match';
    if (confidence >= 0.70) return 'producer-wine';
    if (confidence >= 0.50) return 'varietal-region';
    return 'varietal';
  }
}
```

---

## Phase 4: Testing & Pilot (Week 3)

### 4.1 Create Test Script

**File**: `/scripts/enrich-pilot.ts`

```typescript
#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { WineDetailsExtractor } from '../src/lib/enrichment/extractor';
import { WineInformationResolver } from '../src/lib/enrichment/resolver';
import { TastingNotesGenerator } from '../src/lib/enrichment/generator';
import { UniquenessValidator } from '../src/lib/enrichment/validator';
import { DatabasePersister } from '../src/lib/enrichment/persister';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function runPilot() {
  console.log('🍷 Wine Enrichment Pilot - 50 Products\n');
  console.log('═'.repeat(80));

  // Get 50 products for pilot
  const products = await prisma.product.findMany({
    where: {
      description: null,
    },
    include: {
      skus: {
        take: 1,
        select: {
          code: true,
          size: true,
          abv: true,
        },
      },
    },
    take: 50,
    orderBy: {
      name: 'asc',
    },
  });

  console.log(`Found ${products.length} products for pilot\n`);

  // Initialize components
  const extractor = new WineDetailsExtractor();
  const resolver = new WineInformationResolver(webFetch, llmService);
  const generator = new TastingNotesGenerator(llmService);
  const validator = new UniquenessValidator(prisma);
  const persister = new DatabasePersister(prisma);

  let succeeded = 0;
  let failed = 0;

  for (const product of products) {
    try {
      console.log(`\nProcessing: ${product.name}`);

      // 1. Extract
      const wineDetails = extractor.extract(product);
      console.log(`  ✓ Extracted (confidence: ${wineDetails.confidence.toFixed(2)})`);

      // 2. Resolve
      const searchResult = await resolver.resolve(wineDetails);
      console.log(`  ✓ Resolved (confidence: ${searchResult.confidence.toFixed(2)})`);

      // 3. Generate
      const enrichment = await generator.generate(
        wineDetails,
        [searchResult],
        searchResult.confidence >= 0.85 ? 1 :
        searchResult.confidence >= 0.70 ? 2 :
        searchResult.confidence >= 0.50 ? 3 : 4
      );
      console.log(`  ✓ Generated`);

      // 4. Validate
      const validation = await validator.validate(enrichment, product.id);
      if (!validation.isValid) {
        console.log(`  ✗ Validation failed: ${validation.reason}`);
        failed++;
        continue;
      }
      console.log(`  ✓ Validated (quality: ${validation.qualityScore?.toFixed(2)})`);

      // 5. Save
      await persister.save(product.id, enrichment);
      console.log(`  ✓ Saved`);

      succeeded++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log(`\nPilot Complete:`);
  console.log(`  Succeeded: ${succeeded}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Success Rate: ${((succeeded / products.length) * 100).toFixed(1)}%`);

  await prisma.$disconnect();
}

runPilot().catch(console.error);
```

### 4.2 Quality Validation Script

**File**: `/scripts/validate-enrichment.ts`

```typescript
#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function validateEnrichment() {
  console.log('🔍 Validating Enriched Products\n');
  console.log('═'.repeat(80));

  const enrichedProducts = await prisma.product.findMany({
    where: {
      description: { not: null },
    },
    select: {
      id: true,
      name: true,
      description: true,
      tastingNotes: true,
      enrichmentMetadata: true,
    },
  });

  console.log(`Analyzing ${enrichedProducts.length} enriched products\n`);

  // Check for duplicates
  const aromaMap = new Map<string, string[]>();

  enrichedProducts.forEach(product => {
    if (product.tastingNotes) {
      const notes = product.tastingNotes as any;
      const aroma = notes.aroma || '';

      if (!aromaMap.has(aroma)) {
        aromaMap.set(aroma, []);
      }
      aromaMap.get(aroma)!.push(product.name);
    }
  });

  const duplicates = Array.from(aromaMap.entries())
    .filter(([_, products]) => products.length > 1);

  console.log(`Uniqueness Check:`);
  console.log(`  Unique aromas: ${aromaMap.size}`);
  console.log(`  Duplicate aromas: ${duplicates.length}`);

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} duplicate aroma(s):\n`);
    duplicates.forEach(([aroma, products]) => {
      console.log(`  "${aroma.substring(0, 60)}..."`);
      console.log(`  Used by: ${products.join(', ')}\n`);
    });
  } else {
    console.log(`  ✅ All aromas are unique!`);
  }

  // Quality score distribution
  const metadata = enrichedProducts
    .map(p => p.enrichmentMetadata as any)
    .filter(Boolean);

  if (metadata.length > 0) {
    const avgConfidence = metadata.reduce((sum, m) => sum + (m.confidence || 0), 0) / metadata.length;
    const sourceDistribution = metadata.reduce((acc: any, m) => {
      const source = m.enrichmentSource || 'unknown';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    console.log(`\nQuality Metrics:`);
    console.log(`  Average Confidence: ${avgConfidence.toFixed(2)}`);
    console.log(`\nSource Distribution:`);
    Object.entries(sourceDistribution).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} (${((count as number / metadata.length) * 100).toFixed(1)}%)`);
    });
  }

  await prisma.$disconnect();
}

validateEnrichment().catch(console.error);
```

---

## Phase 5: Full Deployment (Week 4)

### 5.1 Main Enrichment Script

**File**: `/scripts/enrich-wines-v2.ts`

Full implementation with:
- Batch processing
- Checkpoint system
- Retry logic
- Progress tracking
- Error handling
- Reporting

### 5.2 Deployment Checklist

- [ ] Run pilot with 50 products
- [ ] Validate uniqueness and quality
- [ ] Review and refine prompts
- [ ] Test checkpoint system
- [ ] Run batch of 500 products
- [ ] Review results
- [ ] Process remaining ~1,329 products
- [ ] Final validation
- [ ] Generate quality report
- [ ] Manual review of low-confidence results

---

## Implementation Timeline

**Week 1**: Foundation & Core Components
- Set up project structure
- Implement type definitions
- Build Extractor
- Build Resolver (basic)

**Week 2**: Generation & Validation
- Implement Generator
- Build Validator
- Create Persister
- Add caching and rate limiting

**Week 3**: Testing & Pilot
- Create test scripts
- Run pilot (50 products)
- Validate results
- Refine components

**Week 4**: Full Deployment
- Process batch of 500
- Review and adjust
- Process remaining products
- Final validation and reporting

---

## Success Criteria

1. **Uniqueness**: < 1% duplicate tasting notes
2. **Quality**: Average quality score >= 0.75
3. **Confidence**: >= 60% exact-match or producer-wine level
4. **Speed**: >= 500 products/hour
5. **Cost**: <= $50 total
6. **Accuracy**: Manual review confirms accuracy

---

## Next Steps

1. Create project structure
2. Implement WineDetailsExtractor
3. Set up WebFetch integration
4. Build Generator with LLM
5. Implement Validator
6. Run pilot test
7. Scale to full catalog

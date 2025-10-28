# Wine Enrichment System - Component Interaction Diagram

## System Overview

This document provides detailed component interaction diagrams for the Wine Enrichment System.

---

## 1. High-Level Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        WINE ENRICHMENT SYSTEM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     ORCHESTRATION LAYER                            │ │
│  │  ┌──────────────────────────────────────────────────────────┐     │ │
│  │  │         BatchEnrichmentEngine                            │     │ │
│  │  │  - Progress tracking                                     │     │ │
│  │  │  - Checkpoint management                                 │     │ │
│  │  │  - Retry logic                                           │     │ │
│  │  │  - Concurrency control                                   │     │ │
│  │  └──────────────────────────────────────────────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      PROCESSING PIPELINE                           │ │
│  │                                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │ │
│  │  │  Extractor   │→ │   Resolver   │→ │    Generator         │   │ │
│  │  │              │  │              │  │                      │   │ │
│  │  │ Parse wine   │  │ Web search   │  │ LLM enrichment       │   │ │
│  │  │ details      │  │ + aggregation│  │ generation           │   │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     VALIDATION LAYER                               │ │
│  │  ┌──────────────────────────────────────────────────────────┐     │ │
│  │  │         UniquenessValidator                              │     │ │
│  │  │  - Duplicate detection                                   │     │ │
│  │  │  - Similarity analysis                                   │     │ │
│  │  │  - Quality scoring                                       │     │ │
│  │  └──────────────────────────────────────────────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                 │                                        │
│                                 ▼                                        │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                     PERSISTENCE LAYER                              │ │
│  │  ┌──────────────────────────────────────────────────────────┐     │ │
│  │  │         DatabasePersister                                │     │ │
│  │  │  - Transaction management                                │     │ │
│  │  │  - Metadata storage                                      │     │ │
│  │  │  - Audit logging                                         │     │ │
│  │  └──────────────────────────────────────────────────────────┘     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                   SUPPORTING SERVICES                              │ │
│  │                                                                    │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │ │
│  │  │   Cache      │  │ Rate Limiter │  │  Logger            │     │ │
│  │  │   Service    │  │              │  │                    │     │ │
│  │  └──────────────┘  └──────────────┘  └────────────────────┘     │ │
│  │                                                                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow Sequence

```
┌─────────┐
│ Product │
│ Database│
└────┬────┘
     │
     │ 1. Fetch unenriched products
     ▼
┌────────────────────────┐
│ BatchEnrichmentEngine  │
└───────────┬────────────┘
            │
            │ 2. For each product
            ▼
     ┌──────────────┐
     │  Extractor   │
     └──────┬───────┘
            │
            │ 3. Extract wine details
            ▼
     ┌─────────────────────────────────┐
     │  ExtractedWineDetails           │
     │  - producer: "Bodegas Muga"     │
     │  - wineName: "Reserva"          │
     │  - region: "Rioja"              │
     │  - vintage: 2018                │
     │  - varietal: "Tempranillo"      │
     │  - confidence: 0.95             │
     └─────────────┬───────────────────┘
                   │
                   │ 4. Search for wine info
                   ▼
     ┌──────────────────────────┐
     │    Resolver              │
     │                          │
     │  ┌────────────────────┐  │
     │  │ Level 1: Exact     │  │──┐
     │  │ Match Search       │  │  │
     │  └────────────────────┘  │  │
     │                          │  │
     │  ┌────────────────────┐  │  │ Fallback
     │  │ Level 2: Producer  │  │◄─┤ Hierarchy
     │  │ + Wine             │  │  │
     │  └────────────────────┘  │  │
     │                          │  │
     │  ┌────────────────────┐  │  │
     │  │ Level 3: Varietal  │  │◄─┤
     │  │ + Region           │  │  │
     │  └────────────────────┘  │  │
     │                          │  │
     │  ┌────────────────────┐  │  │
     │  │ Level 4: Varietal  │  │◄─┘
     │  │ Generic            │  │
     │  └────────────────────┘  │
     └──────────────┬───────────┘
                    │
                    │ 5. Web search results
                    ▼
     ┌─────────────────────────────────┐
     │  WineSearchResult               │
     │  - source: "Wine Enthusiast"    │
     │  - url: "https://..."           │
     │  - tastingNotes: {...}          │
     │  - confidence: 0.92             │
     └─────────────┬───────────────────┘
                   │
                   │ 6. Generate enrichment
                   ▼
     ┌──────────────────────────┐
     │    Generator             │
     │                          │
     │  ┌────────────────────┐  │
     │  │ Build LLM Prompt   │  │
     │  └─────────┬──────────┘  │
     │            │              │
     │            ▼              │
     │  ┌────────────────────┐  │
     │  │ Call LLM API       │  │
     │  └─────────┬──────────┘  │
     │            │              │
     │            ▼              │
     │  ┌────────────────────┐  │
     │  │ Parse Response     │  │
     │  └────────────────────┘  │
     └──────────────┬───────────┘
                    │
                    │ 7. Generated enrichment
                    ▼
     ┌─────────────────────────────────┐
     │  EnrichedWineData               │
     │  - description: "..."           │
     │  - tastingNotes: {...}          │
     │  - foodPairings: [...]          │
     │  - metadata: {...}              │
     └─────────────┬───────────────────┘
                   │
                   │ 8. Validate uniqueness
                   ▼
     ┌──────────────────────────┐
     │  UniquenessValidator     │
     │                          │
     │  ┌────────────────────┐  │
     │  │ Check Duplicates   │  │
     │  └─────────┬──────────┘  │
     │            │              │
     │            ▼              │
     │  ┌────────────────────┐  │
     │  │ Similarity Match   │  │
     │  └─────────┬──────────┘  │
     │            │              │
     │            ▼              │
     │  ┌────────────────────┐  │
     │  │ Quality Check      │  │
     │  └────────────────────┘  │
     └──────────────┬───────────┘
                    │
                    │ 9. Validation result
                    ▼
         ┌──────────────────────┐
         │  Valid?              │
         └──────┬───────────────┘
                │
         ┌──────┴──────┐
         │             │
        YES           NO
         │             │
         │             └──► Retry / Log error
         │
         │ 10. Save to database
         ▼
     ┌──────────────────────────┐
     │  DatabasePersister       │
     │                          │
     │  - Begin transaction     │
     │  - Update product        │
     │  - Store metadata        │
     │  - Commit                │
     └──────────────┬───────────┘
                    │
                    ▼
     ┌─────────────────────────┐
     │  Product Enriched!      │
     │  ✓ Unique notes         │
     │  ✓ High confidence      │
     │  ✓ Quality validated    │
     └─────────────────────────┘
```

---

## 3. Resolver Fallback Strategy

```
START: WineInformationResolver.resolve()
│
├─► Level 1: Exact Match Search
│   │
│   │ Query: "{producer} {wineName} {vintage} {region} tasting notes"
│   │ Example: "Bodegas Muga Reserva 2018 Rioja tasting notes"
│   │
│   ├─► Search Priority Sources:
│   │   ├─ Wine Enthusiast (wineenthusiast.com)
│   │   ├─ Wine Spectator (winespectator.com)
│   │   ├─ Decanter (decanter.com)
│   │   └─ Jancis Robinson (jancisrobinson.com)
│   │
│   ├─► Extract structured data via LLM
│   │
│   ├─► Confidence check: >= 0.85?
│   │   ├─ YES → Return result (BEST OUTCOME)
│   │   └─ NO → Continue to Level 2
│   │
│   └─► Example Result:
│       {
│         source: "Wine Enthusiast",
│         confidence: 0.92,
│         tastingNotes: {
│           aroma: "Cherry, vanilla oak, tobacco...",
│           palate: "Full-bodied with silky tannins...",
│           finish: "Long, elegant finish..."
│         },
│         rating: 92,
│         reviewDate: "2021-05-15"
│       }
│
├─► Level 2: Producer + Wine Search
│   │
│   │ Query: "{producer} {wineName} {region} wine review"
│   │ Example: "Bodegas Muga Reserva Rioja wine review"
│   │
│   ├─► Search Additional Sources:
│   │   ├─ Wine blogs
│   │   ├─ Critic sites
│   │   ├─ Wine.com
│   │   └─ Total Wine
│   │
│   ├─► Extract producer style info
│   │
│   ├─► Confidence check: >= 0.70?
│   │   ├─ YES → Enhance with varietal info → Return
│   │   └─ NO → Continue to Level 3
│   │
│   └─► Example Result:
│       {
│         source: "Wine.com",
│         confidence: 0.78,
│         notes: "Bodegas Muga Reserva typically shows...",
│         producerStyle: "Traditional Rioja with oak aging"
│       }
│
├─► Level 3: Varietal + Region Search
│   │
│   │ Query: "{varietal} {region} tasting profile characteristics"
│   │ Example: "Tempranillo Rioja tasting profile characteristics"
│   │
│   ├─► Search Educational Sources:
│   │   ├─ Wine education sites (WSET)
│   │   ├─ Regional authorities (Rioja DOCa)
│   │   ├─ Grape variety databases
│   │   └─ Wine region guides
│   │
│   ├─► Extract regional/varietal characteristics
│   │
│   ├─► Confidence check: >= 0.50?
│   │   ├─ YES → Enhance with producer style → Return
│   │   └─ NO → Continue to Level 4
│   │
│   └─► Example Result:
│       {
│         source: "Rioja Wine Board",
│         confidence: 0.62,
│         notes: "Tempranillo from Rioja shows cherry...",
│         regionalCharacteristics: {...}
│       }
│
└─► Level 4: Varietal Generic
    │
    │ Query: "{varietal} typical tasting notes characteristics"
    │ Example: "Tempranillo typical tasting notes characteristics"
    │
    ├─► Search Generic Sources:
    │   ├─ Grape variety databases
    │   ├─ Wine education sites
    │   └─ General wine guides
    │
    ├─► Extract varietal characteristics
    │
    └─► Return generic result
        {
          source: "Wine Folly",
          confidence: 0.35,
          notes: "Tempranillo typically shows...",
          caveat: "Generic varietal profile - limited specific info"
        }
```

---

## 4. Uniqueness Validation Flow

```
┌─────────────────────────────────────────┐
│  UniquenessValidator.validate()         │
└───────────────┬─────────────────────────┘
                │
                │ Input: EnrichedWineData + productId
                │
                ▼
┌────────────────────────────────────────────────────┐
│  Step 1: Check Exact Duplicate Aromas             │
│                                                    │
│  Query:                                            │
│    SELECT * FROM "Product"                         │
│    WHERE id != :productId                          │
│    AND tastingNotes->>'aroma' = :newAroma          │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ Found duplicate?                     │          │
│  │  ├─ YES → FAIL (duplicate detected)  │          │
│  │  └─ NO → Continue to Step 2          │          │
│  └──────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────┐
│  Step 2: Calculate Similarity Scores               │
│                                                    │
│  For each existing product:                        │
│    - Compute Levenshtein distance                  │
│    - Calculate cosine similarity                   │
│    - Check phrase overlap                          │
│                                                    │
│  Similarity threshold: 0.85                        │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ High similarity found (>0.85)?       │          │
│  │  ├─ YES → FAIL (too similar)         │          │
│  │  └─ NO → Continue to Step 3          │          │
│  └──────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────┐
│  Step 3: Quality Checks                            │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ 3a. Generic Phrase Detection         │          │
│  │                                      │          │
│  │ Scan for:                            │          │
│  │  - "sophisticated wine"              │          │
│  │  - "perfect for any occasion"        │          │
│  │  - "pairs well with everything"      │          │
│  │  - 20+ other generic phrases         │          │
│  │                                      │          │
│  │ Found generic phrases?               │          │
│  │  ├─ YES → WARNING (reduce score)     │          │
│  │  └─ NO → Continue                    │          │
│  └──────────────────────────────────────┘          │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ 3b. Length Validation                │          │
│  │                                      │          │
│  │ Check:                               │          │
│  │  - Description >= 20 words           │          │
│  │  - Aroma >= 10 words                 │          │
│  │  - Palate >= 15 words                │          │
│  │                                      │          │
│  │ Too short?                           │          │
│  │  ├─ YES → FAIL (insufficient detail) │          │
│  │  └─ NO → Continue                    │          │
│  └──────────────────────────────────────┘          │
│                                                    │
│  ┌──────────────────────────────────────┐          │
│  │ 3c. Required Fields Check            │          │
│  │                                      │          │
│  │ Validate presence of:                │          │
│  │  - wineDetails.region                │          │
│  │  - wineDetails.grapeVariety          │          │
│  │  - foodPairings (min 3)              │          │
│  │  - servingInfo complete              │          │
│  │                                      │          │
│  │ Missing required fields?             │          │
│  │  ├─ YES → FAIL (incomplete data)     │          │
│  │  └─ NO → Continue                    │          │
│  └──────────────────────────────────────┘          │
└────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────────────────┐
│  Step 4: Calculate Quality Score                   │
│                                                    │
│  Components:                                       │
│    - Specificity: 0-30 points                      │
│      * Unique descriptors                          │
│      * Specific tasting notes                      │
│      * No generic phrases                          │
│                                                    │
│    - Completeness: 0-30 points                     │
│      * All required fields present                 │
│      * Sufficient detail                           │
│      * Rich descriptions                           │
│                                                    │
│    - Accuracy: 0-30 points                         │
│      * Matches varietal profile                    │
│      * Matches regional style                      │
│      * Consistent with research                    │
│                                                    │
│    - Confidence: 0-10 points                       │
│      * Source reliability                          │
│      * Data freshness                              │
│                                                    │
│  Total: 0-100 points → Normalized to 0-1           │
│                                                    │
│  Quality Score Thresholds:                         │
│    - 0.90-1.00: Excellent                          │
│    - 0.70-0.89: Good                               │
│    - 0.50-0.69: Acceptable                         │
│    - 0.00-0.49: Needs Improvement                  │
│                                                    │
│  Minimum acceptable: 0.70                          │
└────────────────────────────────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  Return ValidationResult               │
│                                        │
│  {                                     │
│    isValid: boolean,                   │
│    reason: string,                     │
│    qualityScore: number,               │
│    warnings: string[],                 │
│    conflictingProducts?: Product[]     │
│  }                                     │
└────────────────────────────────────────┘
```

---

## 5. Batch Processing Architecture

```
┌────────────────────────────────────────────────────────────────┐
│  BatchEnrichmentEngine                                         │
│                                                                │
│  Configuration:                                                │
│    - batchSize: 25                                             │
│    - concurrency: 3                                            │
│    - retryAttempts: 3                                          │
│    - checkpointInterval: 50                                    │
└─────────────────────┬──────────────────────────────────────────┘
                      │
                      │ 1. Load checkpoint (if exists)
                      ▼
          ┌───────────────────────┐
          │  Checkpoint Manager   │
          │                       │
          │  - lastProcessedId    │
          │  - successCount       │
          │  - failureCount       │
          │  - timestamp          │
          └───────────┬───────────┘
                      │
                      │ 2. Fetch products
                      ▼
          ┌───────────────────────────────────┐
          │  Product Query                    │
          │                                   │
          │  WHERE enrichedAt IS NULL         │
          │  AND id > :lastProcessedId        │
          │  ORDER BY name ASC                │
          │  LIMIT :batchSize                 │
          └───────────┬───────────────────────┘
                      │
                      │ 3. Create batches
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Batch Creation                                                 │
│                                                                 │
│  Products [1879 total]                                          │
│    │                                                            │
│    ├─► Batch 1 [1-25]                                          │
│    ├─► Batch 2 [26-50]                                         │
│    ├─► Batch 3 [51-75]                                         │
│    ├─► ...                                                     │
│    └─► Batch N [1851-1879]                                     │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 4. Process each batch
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Batch Processing (Concurrency: 3)                             │
│                                                                 │
│  Batch [1-25]:                                                  │
│    │                                                            │
│    ├─► Chunk 1 [Products 1, 2, 3]  ──┐                         │
│    │                                  │                         │
│    ├─► Chunk 2 [Products 4, 5, 6]  ──┤ Process                 │
│    │                                  │ Concurrently            │
│    ├─► Chunk 3 [Products 7, 8, 9]  ──┘                         │
│    │                                                            │
│    │   Wait 1 second (rate limiting)                            │
│    │                                                            │
│    ├─► Chunk 4 [Products 10, 11, 12] ──┐                       │
│    │                                    │                       │
│    ├─► Chunk 5 [Products 13, 14, 15] ──┤ Process               │
│    │                                    │ Concurrently          │
│    └─► ...                            ──┘                       │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 5. Process individual product
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Single Product Enrichment (with Retry)                        │
│                                                                 │
│  Attempt 1:                                                     │
│    ├─► Extract → Resolve → Generate → Validate → Save          │
│    └─► Success? YES → Done                                     │
│                  NO ↓                                           │
│                                                                 │
│  Wait 2^0 = 1 second                                            │
│                                                                 │
│  Attempt 2:                                                     │
│    ├─► Extract → Resolve → Generate → Validate → Save          │
│    └─► Success? YES → Done                                     │
│                  NO ↓                                           │
│                                                                 │
│  Wait 2^1 = 2 seconds                                           │
│                                                                 │
│  Attempt 3:                                                     │
│    ├─► Extract → Resolve → Generate → Validate → Save          │
│    └─► Success? YES → Done                                     │
│                  NO ↓                                           │
│                                                                 │
│  Wait 2^2 = 4 seconds                                           │
│                                                                 │
│  Attempt 4 (Final):                                             │
│    ├─► Extract → Resolve → Generate → Validate → Save          │
│    └─► Success? YES → Done                                     │
│                  NO → Log error, mark failed                   │
│                                                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ 6. Update progress
                      ▼
          ┌───────────────────────┐
          │  Progress Tracker     │
          │                       │
          │  processed: 125/1879  │
          │  succeeded: 118       │
          │  failed: 7            │
          │  rate: 45/hour        │
          │  eta: 40 hours        │
          └───────────┬───────────┘
                      │
                      │ 7. Save checkpoint (every 50)
                      ▼
          ┌───────────────────────┐
          │  Checkpoint Save      │
          │                       │
          │  {                    │
          │    lastProcessedId,   │
          │    progress,          │
          │    timestamp,         │
          │    failedProducts: [] │
          │  }                    │
          └───────────────────────┘
```

---

## 6. Error Handling & Recovery

```
┌─────────────────────────────────────────┐
│  Error Scenarios & Handling             │
└─────────────────────────────────────────┘

Error Type: Web Search Timeout
├─ Detection: Request > 10 seconds
├─ Action: Retry with exponential backoff
├─ Fallback: Skip to next search level
└─ Log: Warning with product details

Error Type: LLM API Rate Limit
├─ Detection: 429 HTTP status
├─ Action: Wait and retry (up to 3 times)
├─ Fallback: Queue product for later
└─ Log: Rate limit hit, queued

Error Type: Duplicate Aroma Detected
├─ Detection: Validation finds exact match
├─ Action: Regenerate with different prompt
├─ Fallback: Add uniqueness constraint to prompt
└─ Log: Duplicate prevented, regenerated

Error Type: Low Quality Score
├─ Detection: Quality score < 0.70
├─ Action: Try higher confidence search level
├─ Fallback: Manual review flag
└─ Log: Quality issue, flagged for review

Error Type: Database Connection Lost
├─ Detection: Prisma connection error
├─ Action: Save checkpoint immediately
├─ Fallback: Reconnect and resume
└─ Log: Critical - checkpoint saved

Error Type: Validation Failure
├─ Detection: Missing required fields
├─ Action: Retry generation with stricter prompt
├─ Fallback: Use lower search level
└─ Log: Validation failed, retrying

Recovery Strategy:
├─ Checkpoint system saves progress every 50 products
├─ Failed products tracked separately
├─ Resume from last checkpoint on restart
├─ Retry queue for transient failures
└─ Manual review queue for persistent issues

┌─────────────────────────────────────────┐
│  Checkpoint Structure                   │
│                                         │
│  {                                      │
│    version: "1.0",                      │
│    timestamp: "2025-01-20T...",         │
│    progress: {                          │
│      total: 1879,                       │
│      processed: 150,                    │
│      succeeded: 143,                    │
│      failed: 7,                         │
│      lastProcessedId: "uuid..."         │
│    },                                   │
│    failedProducts: [                    │
│      {                                  │
│        productId: "uuid...",            │
│        error: "...",                    │
│        attempts: 3,                     │
│        lastAttempt: "2025-01-20T..."    │
│      }                                  │
│    ],                                   │
│    statistics: {                        │
│      averageProcessingTime: 3.2,        │
│      successRate: 0.953,                │
│      confidenceDistribution: {...}      │
│    }                                    │
│  }                                      │
└─────────────────────────────────────────┘
```

---

## 7. Caching & Performance Optimization

```
┌─────────────────────────────────────────────────────────┐
│  Multi-Layer Caching Strategy                           │
└─────────────────────────────────────────────────────────┘

Layer 1: Search Result Cache
├─ Key: Hash(producer + wineName + vintage + region)
├─ Value: WineSearchResult
├─ TTL: 7 days
├─ Hit Rate Target: 15-20%
│  (Similar wines from same producer/vintage)
└─ Storage: In-memory Map (cleared between sessions)

Layer 2: LLM Response Cache
├─ Key: Hash(prompt + model + temperature)
├─ Value: Generated enrichment
├─ TTL: 30 days
├─ Hit Rate Target: 5-10%
│  (Exact duplicate requests)
└─ Storage: Redis (persistent)

Layer 3: Varietal Profile Cache
├─ Key: varietal + region
├─ Value: Generic profile data
├─ TTL: 90 days
├─ Hit Rate Target: 40-50%
│  (Many wines share varietals)
└─ Storage: In-memory + Redis

┌─────────────────────────────────────────────────────────┐
│  Rate Limiting Strategy                                 │
└─────────────────────────────────────────────────────────┘

Service: Web Search (Claude.ai WebFetch)
├─ Limit: 60 requests / minute
├─ Implementation: Token bucket
├─ Backoff: 1 second between bursts
└─ Retry: Exponential (1s, 2s, 4s)

Service: Anthropic API (Claude 3.5 Sonnet)
├─ Limit: 50 requests / minute
├─ Implementation: Sliding window
├─ Backoff: Wait for window reset
└─ Retry: Queue and batch

Service: Database (Postgres)
├─ Limit: 100 concurrent connections
├─ Implementation: Connection pool
├─ Backoff: Wait for available connection
└─ Retry: Immediate (from pool)

┌─────────────────────────────────────────────────────────┐
│  Performance Metrics                                    │
└─────────────────────────────────────────────────────────┘

Without Caching:
├─ Time per product: ~8 seconds
├─ Throughput: 450 products/hour
└─ Total time: ~4.2 hours

With Caching (20% hit rate):
├─ Time per product: ~6.4 seconds (avg)
├─ Throughput: 560 products/hour
└─ Total time: ~3.4 hours (20% faster)

With Concurrency (3 parallel):
├─ Time per product: ~2.7 seconds (effective)
├─ Throughput: 1,330 products/hour
└─ Total time: ~1.4 hours (66% faster)
```

---

## Component Dependencies

```
BatchEnrichmentEngine
  ├─ depends on → WineDetailsExtractor
  ├─ depends on → WineInformationResolver
  │                 ├─ depends on → WebSearchService
  │                 └─ depends on → LLMService
  ├─ depends on → TastingNotesGenerator
  │                 └─ depends on → LLMService
  ├─ depends on → UniquenessValidator
  │                 └─ depends on → PrismaClient
  ├─ depends on → DatabasePersister
  │                 └─ depends on → PrismaClient
  ├─ depends on → CacheService
  ├─ depends on → RateLimiter
  └─ depends on → Logger

Supporting Services:
  ├─ WebSearchService (Claude Code's WebFetch)
  ├─ LLMService (Anthropic API)
  ├─ PrismaClient (Database)
  ├─ CacheService (In-memory + Redis)
  ├─ RateLimiter (Token bucket)
  └─ Logger (File + Console)
```

This component diagram provides a visual representation of how all pieces fit together for the wine enrichment system.

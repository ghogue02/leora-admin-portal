# Wine Enrichment System - Data Flow Visualization

## Complete Data Flow Example

This document shows a real-world example of how data flows through the system.

---

## Input: Raw Product Data

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-uuid",
  "name": "Bodegas Muga Reserva Rioja 2018",
  "brand": "Bodegas Muga",
  "category": "Red Wine",
  "description": null,
  "tastingNotes": null,
  "foodPairings": null,
  "servingInfo": null,
  "wineDetails": null,
  "enrichedAt": null,
  "enrichedBy": null,
  "skus": [
    {
      "code": "MUGA-RES-18-750",
      "size": "750ml",
      "abv": 14.0
    }
  ]
}
```

---

## Step 1: Wine Details Extraction

### Input to Extractor
```typescript
ProductInput {
  id: "550e8400-e29b-41d4-a716-446655440000"
  name: "Bodegas Muga Reserva Rioja 2018"
  brand: "Bodegas Muga"
  category: "Red Wine"
}
```

### Processing Logic

```
1. Extract Vintage:
   Pattern: /\b(19|20)\d{2}\b/
   Match: "2018"
   → vintage = 2018

2. Extract Region:
   Pattern: /rioja/i
   Match: "Rioja" in name
   → region = "Rioja"

3. Extract Producer:
   Use brand field
   → producer = "Bodegas Muga"

4. Extract Wine Name:
   Remove producer, region, vintage from name
   "Bodegas Muga Reserva Rioja 2018"
   - Remove "Bodegas Muga" → "Reserva Rioja 2018"
   - Remove "Rioja" → "Reserva 2018"
   - Remove "2018" → "Reserva"
   → wineName = "Reserva"

5. Determine Wine Type:
   Category = "Red Wine"
   → wineType = "red"

6. Extract/Infer Varietal:
   Region = "Rioja" → Tempranillo (regional default)
   → varietal = "Tempranillo"

7. Calculate Confidence:
   hasVintage: ✓ (0.2)
   hasRegion: ✓ (0.3)
   hasProducer: ✓ (0.3)
   hasVarietal: ✓ (0.2)
   Total: 1.0
   → confidence = 1.0
```

### Output from Extractor

```typescript
ExtractedWineDetails {
  producer: "Bodegas Muga",
  wineName: "Reserva",
  region: "Rioja",
  vintage: 2018,
  varietal: "Tempranillo",
  wineType: "red",
  confidence: 1.0
}
```

---

## Step 2: Web Search & Information Resolution

### Level 1: Exact Match Search

#### Search Query Construction

```typescript
Query = [
  "Bodegas Muga",
  "Reserva",
  "2018",
  "Rioja",
  "tasting notes"
].join(" ")

→ "Bodegas Muga Reserva 2018 Rioja tasting notes"
```

#### Web Search Prompt

```
Find tasting notes and wine information for: Bodegas Muga Reserva 2018 Rioja tasting notes

Search priority sources: Wine Enthusiast, Wine Spectator, Decanter, Jancis Robinson

Extract:
1. Tasting notes (aroma, palate, finish)
2. Food pairings
3. Serving recommendations
4. Rating (if available)
5. Review date

Return structured data in JSON format.
```

#### Web Search Results (Simulated)

```markdown
Source: Wine Enthusiast
URL: https://www.wineenthusiast.com/ratings-reviews/bodegas-muga-reserva-2018
Rating: 92 points
Review Date: May 2021

Tasting Notes:
This wine opens with aromas of ripe cherry, blackberry, and vanilla oak,
complemented by hints of tobacco leaf and leather. The palate is medium to
full-bodied with silky tannins and a core of concentrated dark fruit.
Bright acidity provides freshness, while oak spice adds complexity. The
finish is long and elegant, with lingering notes of fruit, spice, and
fine-grained tannins.

Aged 24 months in French and American oak. Tempranillo-based blend with
Garnacha and Mazuelo. Drinking beautifully now but has excellent aging
potential through 2035.

Food Pairings: Grilled meats, braised dishes, aged cheeses

Serving: 60-65°F, decant 30-45 minutes, Bordeaux glass
```

#### LLM Parsing Prompt

```
Parse this wine information into structured JSON:

[Web search results above]

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
}
```

#### Parsed Result

```typescript
WineSearchResult {
  source: "Wine Enthusiast",
  url: "https://www.wineenthusiast.com/ratings-reviews/bodegas-muga-reserva-2018",
  tastingNotes: {
    aroma: [
      "ripe cherry",
      "blackberry",
      "vanilla oak",
      "tobacco leaf",
      "leather"
    ],
    palate: [
      "medium to full-bodied",
      "silky tannins",
      "concentrated dark fruit",
      "bright acidity",
      "oak spice"
    ],
    finish: [
      "long and elegant",
      "lingering fruit",
      "spice",
      "fine-grained tannins"
    ]
  },
  foodPairings: [
    "Grilled meats",
    "Braised dishes",
    "Aged cheeses"
  ],
  servingInfo: {
    temperature: "60-65°F",
    decanting: "Decant 30-45 minutes",
    glassware: "Bordeaux glass"
  },
  confidence: 0.92,
  rating: 92,
  reviewDate: "2021-05-01"
}
```

**Confidence Check**: 0.92 >= 0.85 ✓ (Exact match found, skip fallback levels)

---

## Step 3: Tasting Notes Generation

### LLM Generation Prompt

```
System: You are an expert sommelier creating tasting notes for a wine database.

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
- Create UNIQUE descriptions - no duplicate phrases

User: Wine: Bodegas Muga Reserva
Vintage: 2018
Region: Rioja
Varietal: Tempranillo
Type: red

RESEARCH FOUND (High Confidence - Exact Match):
Source: Wine Enthusiast
Rating: 92 points

Tasting Notes from Research:
Aroma: ripe cherry, blackberry, vanilla oak, tobacco leaf, leather
Palate: medium to full-bodied, silky tannins, concentrated dark fruit, bright acidity, oak spice
Finish: long and elegant, lingering fruit, spice, fine-grained tannins

Create SPECIFIC tasting notes for this exact wine based on the research above.
Write in prose format (not bullet points).

Return JSON:
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
    "region": "Rioja",
    "grapeVariety": "Tempranillo",
    "vintage": 2018,
    "style": "...",
    "ageability": "..."
  }
}
```

### LLM Response

```json
{
  "description": "Bodegas Muga Reserva 2018 is a classic Rioja that showcases the elegance and structure which has made this producer legendary among wine enthusiasts. Aged for 24 months in a combination of French and American oak barrels, this Tempranillo-based blend offers a remarkable balance between concentrated fruit character and refined oak influence. The 2018 vintage demonstrates exceptional quality, earning 92 points from Wine Enthusiast for its harmony and aging potential.",

  "tastingNotes": {
    "aroma": "The nose opens with inviting aromas of ripe cherry and blackberry, beautifully integrated with vanilla and toasted oak. Subtle hints of tobacco leaf and supple leather add complexity, while delicate notes of spice and dried herbs emerge with aeration. The aromatic profile speaks to careful barrel selection and traditional Rioja winemaking techniques.",

    "palate": "Medium to full-bodied on the palate, this wine delivers silky, well-integrated tannins that caress rather than grip. Concentrated flavors of red cherry, plum, and blackberry form the core, elegantly framed by oak-derived spice and vanilla. Bright acidity provides freshness and food-friendliness, while maintaining excellent structure that promises graceful evolution with age.",

    "finish": "The finish is long and remarkably elegant, with lingering notes of dark fruit, baking spice, and fine-grained tannins. This persistence, combined with the wine's balanced structure, suggests excellent cellaring potential through 2035, though it's drinking beautifully in its youth."
  },

  "foodPairings": [
    "Grilled ribeye steak with chimichurri",
    "Braised short ribs in red wine reduction",
    "Aged Manchego cheese with quince paste",
    "Wild mushroom risotto with truffle oil",
    "Herb-crusted rack of lamb"
  ],

  "servingInfo": {
    "temperature": "60-65°F (16-18°C)",
    "decanting": "Decant 30-45 minutes before serving to allow integration",
    "glassware": "Bordeaux or large-bowled red wine glass"
  },

  "wineDetails": {
    "region": "Rioja DOCa, Spain",
    "grapeVariety": "Tempranillo, Garnacha, Mazuelo blend",
    "vintage": 2018,
    "style": "Classic Rioja Reserva - Traditional oak-aged red",
    "ageability": "Drink now through 2035"
  }
}
```

### Add Metadata

```typescript
EnrichedWineData {
  ...generatedData,
  metadata: {
    enrichmentSource: "exact-match",
    confidence: 0.92,
    enrichedAt: new Date("2025-01-20T15:30:00Z"),
    enrichedBy: "wine-enrichment-v2",
    sourceUrls: [
      "https://www.wineenthusiast.com/ratings-reviews/bodegas-muga-reserva-2018"
    ]
  }
}
```

---

## Step 4: Uniqueness Validation

### Check 1: Exact Duplicate Detection

```sql
SELECT id, name, tastingNotes->>'aroma'
FROM "Product"
WHERE id != '550e8400-e29b-41d4-a716-446655440000'
  AND tastingNotes->>'aroma' = 'The nose opens with inviting aromas...'
```

**Result**: No matches ✓

### Check 2: Similarity Scoring

```typescript
// Get all existing aromas
existingAromas = [
  "Cherry and raspberry with vanilla oak...",
  "Bright citrus notes with green apple...",
  "Dark fruit aromas with hints of chocolate...",
  // ... more
]

// Calculate similarity for each
newAroma = "The nose opens with inviting aromas of ripe cherry..."

similarities = existingAromas.map(existing => {
  levenshtein = calculateLevenshteinDistance(newAroma, existing)
  cosine = calculateCosineSimilarity(newAroma, existing)
  return (levenshtein + cosine) / 2
})

maxSimilarity = Math.max(...similarities) = 0.23
threshold = 0.85

maxSimilarity < threshold ✓ (No high similarity found)
```

### Check 3: Quality Checks

```typescript
// 3a. Generic Phrase Detection
genericPhrases = [
  "sophisticated wine",
  "perfect for any occasion",
  "pairs well with everything"
]

description = "Bodegas Muga Reserva 2018 is a classic Rioja..."

hasGenericPhrases = genericPhrases.some(phrase =>
  description.toLowerCase().includes(phrase)
)
→ false ✓

// 3b. Length Validation
wordCount = {
  description: 58,  // >= 20 ✓
  aroma: 52,        // >= 10 ✓
  palate: 60,       // >= 15 ✓
  finish: 38        // >= 10 ✓
}

// 3c. Required Fields
requiredFields = {
  region: "Rioja DOCa, Spain",          // ✓
  grapeVariety: "Tempranillo, ...",     // ✓
  foodPairings: [...5 items],           // >= 3 ✓
  servingInfo: {temperature, ...}       // ✓
}
```

### Calculate Quality Score

```typescript
// Specificity (0-30)
specificityScore = 28
  - Unique descriptors: ✓ (10/10)
  - Specific tasting notes: ✓ (10/10)
  - No generic phrases: ✓ (8/10)

// Completeness (0-30)
completenessScore = 30
  - All required fields: ✓ (10/10)
  - Sufficient detail: ✓ (10/10)
  - Rich descriptions: ✓ (10/10)

// Accuracy (0-30)
accuracyScore = 25
  - Matches varietal profile: ✓ (8/10)
  - Matches regional style: ✓ (9/10)
  - Consistent with research: ✓ (8/10)

// Confidence (0-10)
confidenceScore = 9
  - Source reliability: ✓ (Wine Enthusiast)
  - Data freshness: ✓ (2021)

totalScore = 28 + 30 + 25 + 9 = 92/100
normalizedScore = 0.92

qualityScore >= 0.70 ✓
```

### Validation Result

```typescript
ValidationResult {
  isValid: true,
  reason: "PASSED",
  qualityScore: 0.92,
  warnings: [],
  conflictingProducts: []
}
```

---

## Step 5: Database Persistence

### Database Transaction

```sql
BEGIN;

UPDATE "Product"
SET
  description = 'Bodegas Muga Reserva 2018 is a classic Rioja that showcases...',

  "tastingNotes" = '{
    "aroma": "The nose opens with inviting aromas...",
    "palate": "Medium to full-bodied on the palate...",
    "finish": "The finish is long and remarkably elegant..."
  }'::jsonb,

  "foodPairings" = '[
    "Grilled ribeye steak with chimichurri",
    "Braised short ribs in red wine reduction",
    "Aged Manchego cheese with quince paste",
    "Wild mushroom risotto with truffle oil",
    "Herb-crusted rack of lamb"
  ]'::jsonb,

  "servingInfo" = '{
    "temperature": "60-65°F (16-18°C)",
    "decanting": "Decant 30-45 minutes before serving to allow integration",
    "glassware": "Bordeaux or large-bowled red wine glass"
  }'::jsonb,

  "wineDetails" = '{
    "region": "Rioja DOCa, Spain",
    "grapeVariety": "Tempranillo, Garnacha, Mazuelo blend",
    "vintage": 2018,
    "style": "Classic Rioja Reserva - Traditional oak-aged red",
    "ageability": "Drink now through 2035"
  }'::jsonb,

  "enrichmentMetadata" = '{
    "enrichmentSource": "exact-match",
    "confidence": 0.92,
    "sourceUrls": ["https://www.wineenthusiast.com/..."],
    "enrichedAt": "2025-01-20T15:30:00Z",
    "enrichedBy": "wine-enrichment-v2",
    "validationScore": 0.92,
    "searchQuery": "Bodegas Muga Reserva 2018 Rioja tasting notes",
    "extractedDetails": {
      "producer": "Bodegas Muga",
      "wineName": "Reserva",
      "region": "Rioja",
      "vintage": 2018,
      "varietal": "Tempranillo",
      "confidence": 1.0
    }
  }'::jsonb,

  "enrichedAt" = NOW(),
  "enrichedBy" = 'wine-enrichment-v2',
  "updatedAt" = NOW()

WHERE id = '550e8400-e29b-41d4-a716-446655440000';

COMMIT;
```

---

## Final Output: Enriched Product

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "tenant-uuid",
  "name": "Bodegas Muga Reserva Rioja 2018",
  "brand": "Bodegas Muga",
  "category": "Red Wine",

  "description": "Bodegas Muga Reserva 2018 is a classic Rioja that showcases the elegance and structure which has made this producer legendary among wine enthusiasts. Aged for 24 months in a combination of French and American oak barrels, this Tempranillo-based blend offers a remarkable balance between concentrated fruit character and refined oak influence. The 2018 vintage demonstrates exceptional quality, earning 92 points from Wine Enthusiast for its harmony and aging potential.",

  "tastingNotes": {
    "aroma": "The nose opens with inviting aromas of ripe cherry and blackberry, beautifully integrated with vanilla and toasted oak. Subtle hints of tobacco leaf and supple leather add complexity, while delicate notes of spice and dried herbs emerge with aeration. The aromatic profile speaks to careful barrel selection and traditional Rioja winemaking techniques.",
    "palate": "Medium to full-bodied on the palate, this wine delivers silky, well-integrated tannins that caress rather than grip. Concentrated flavors of red cherry, plum, and blackberry form the core, elegantly framed by oak-derived spice and vanilla. Bright acidity provides freshness and food-friendliness, while maintaining excellent structure that promises graceful evolution with age.",
    "finish": "The finish is long and remarkably elegant, with lingering notes of dark fruit, baking spice, and fine-grained tannins. This persistence, combined with the wine's balanced structure, suggests excellent cellaring potential through 2035, though it's drinking beautifully in its youth."
  },

  "foodPairings": [
    "Grilled ribeye steak with chimichurri",
    "Braised short ribs in red wine reduction",
    "Aged Manchego cheese with quince paste",
    "Wild mushroom risotto with truffle oil",
    "Herb-crusted rack of lamb"
  ],

  "servingInfo": {
    "temperature": "60-65°F (16-18°C)",
    "decanting": "Decant 30-45 minutes before serving to allow integration",
    "glassware": "Bordeaux or large-bowled red wine glass"
  },

  "wineDetails": {
    "region": "Rioja DOCa, Spain",
    "grapeVariety": "Tempranillo, Garnacha, Mazuelo blend",
    "vintage": 2018,
    "style": "Classic Rioja Reserva - Traditional oak-aged red",
    "ageability": "Drink now through 2035"
  },

  "enrichmentMetadata": {
    "enrichmentSource": "exact-match",
    "confidence": 0.92,
    "sourceUrls": [
      "https://www.wineenthusiast.com/ratings-reviews/bodegas-muga-reserva-2018"
    ],
    "enrichedAt": "2025-01-20T15:30:00Z",
    "enrichedBy": "wine-enrichment-v2",
    "validationScore": 0.92,
    "searchQuery": "Bodegas Muga Reserva 2018 Rioja tasting notes",
    "extractedDetails": {
      "producer": "Bodegas Muga",
      "wineName": "Reserva",
      "region": "Rioja",
      "vintage": 2018,
      "varietal": "Tempranillo",
      "confidence": 1.0
    }
  },

  "enrichedAt": "2025-01-20T15:30:00Z",
  "enrichedBy": "wine-enrichment-v2",
  "updatedAt": "2025-01-20T15:30:00Z",

  "skus": [
    {
      "code": "MUGA-RES-18-750",
      "size": "750ml",
      "abv": 14.0
    }
  ]
}
```

---

## Summary Statistics for This Enrichment

```
Processing Time Breakdown:
├─ Extraction: 0.08s
├─ Web Search: 2.3s
├─ LLM Generation: 4.2s
├─ Validation: 0.4s
└─ Database Save: 0.15s
───────────────────────
Total: 7.13 seconds

Quality Metrics:
├─ Extraction Confidence: 1.00 (perfect)
├─ Search Confidence: 0.92 (exact match)
├─ Validation Quality Score: 0.92 (excellent)
└─ Enrichment Source: exact-match (best)

Cost:
├─ Web Search: $0.004
├─ LLM Generation: $0.015
└─ Total: $0.019
```

This represents an **ideal enrichment** with:
- Perfect extraction (all details identified)
- Exact wine match found (Level 1 search)
- High-quality unique content generated
- Excellent validation scores
- Comprehensive metadata tracking

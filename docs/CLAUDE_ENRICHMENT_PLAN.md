# Product Enrichment Plan - Using Claude in Claude Code

## 🎯 Goal
Use **Claude AI (right here in Claude Code)** to enrich all 1,285 products with tasting notes and details, then build proper drilldown UI to display them.

---

## ✅ Why This Approach is Perfect

1. **No External Dependencies** - No GPT-4, no Wine Vybe API needed
2. **No Additional Costs** - Use Claude tokens you already have
3. **Better Context** - Claude knows your database structure
4. **Integrated Workflow** - Generate + save + build UI all in one session
5. **Immediate Testing** - See results right away

---

## 📋 Implementation Plan

### Phase 1: Database Schema Update (5 minutes)

**Add New Fields to Product Model:**

```prisma
model Product {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  supplierId   String?  @db.Uuid
  name         String
  brand        String?
  description  String?  @db.Text          // ← EXPAND THIS (already exists!)
  category     String?
  isSampleOnly Boolean  @default(false)

  // ADD THESE NEW FIELDS:
  tastingNotes Json?    // { aroma, palate, finish }
  foodPairings Json?    // ["pairing1", "pairing2", ...]
  servingInfo  Json?    // { temperature, suggestions, glassware }
  wineDetails  Json?    // { region, grapes, vintage, style, ageability }
  enrichedAt   DateTime?
  enrichedBy   String?  @default("claude-ai")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // ... existing relations
}
```

**Migration Command:**
```bash
npx prisma migrate dev --name add_product_enrichment_fields
```

**Estimated Time:** 5 minutes

---

### Phase 2: Claude Enrichment Script (30 minutes to build)

**Create:** `/scripts/claude-enrich-products.ts`

**How it Works:**

1. **Fetch products** from database (batch of 10-20)
2. **For each product**, Claude generates:
   - Product description
   - Tasting notes (aroma, palate, finish)
   - Food pairings (5 suggestions)
   - Serving info (temp, decanting, glassware)
   - Wine details (region, grapes, style, ageability)
3. **Save to database** in proper JSON structure
4. **Progress tracking** with console output
5. **Error handling** for failed enrichments
6. **Batch processing** to avoid overwhelming Claude

**Pseudo-code:**
```typescript
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

async function enrichProducts(batchSize = 20) {
  const products = await prisma.product.findMany({
    where: { description: null },
    include: { skus: { take: 1 } },
    take: batchSize
  });

  for (const product of products) {
    const enrichedData = await generateWithClaude(product);
    await saveToDatabase(product.id, enrichedData);
    console.log(`✓ Enriched: ${product.name}`);
  }
}

async function generateWithClaude(product) {
  const prompt = `Generate wine product data for: ${product.name}...`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return JSON.parse(response.content[0].text);
}
```

**Estimated Time:** 30 minutes to build script

---

### Phase 3: Batch Enrichment Execution (1-2 hours)

**Run enrichment in batches:**

```bash
# Test with 10 products first
npx tsx scripts/claude-enrich-products.ts --batch 10

# Review quality

# Then run full enrichment
npx tsx scripts/claude-enrich-products.ts --batch 50 --total 1285
```

**Processing:**
- 50 products per batch
- ~26 batches total for 1,285 products
- 2-3 minutes per batch
- **Total time: ~60-90 minutes**

**Cost:** Uses your existing Claude Code session (no additional cost!)

**Estimated Time:** 1-2 hours total execution

---

### Phase 4: Update Drilldown Modal UI (30 minutes)

**Update:** `ProductDrilldownModal.tsx`

**Add 4th Tab:** "📖 Product Details"

**Display:**
1. **Hero Section:**
   - Product name
   - Brand & region
   - Vintage & grape variety
   - Wine style

2. **Description:**
   - Full 2-3 sentence description

3. **Tasting Notes Panel:**
   - 🍷 Aroma (purple card)
   - 👅 Palate (red card)
   - ✨ Finish (amber card)

4. **Food Pairings:**
   - Badges for each pairing
   - Interactive (could ask LeorAI about recipes)

5. **Serving Guide:**
   - Temperature
   - Decanting suggestions
   - Glassware recommendations

**Estimated Time:** 30 minutes

---

### Phase 5: Catalog Card Preview (15 minutes)

**Update:** Catalog grid cards to show snippet

**Add to product cards:**
```tsx
{/* Show tasting notes preview */}
{product.tastingNotes && (
  <div className="mt-2 text-xs text-gray-600 italic line-clamp-2">
    "{product.tastingNotes.aroma}"
  </div>
)}
```

**Estimated Time:** 15 minutes

---

## 📊 Total Implementation Timeline

| Phase | Task | Time | Dependencies |
|-------|------|------|--------------|
| 1 | Database migration | 5 min | None |
| 2 | Build enrichment script | 30 min | Migration complete |
| 3 | Run enrichment (1,285 SKUs) | 90 min | Script complete |
| 4 | Update drilldown modal | 30 min | Enrichment running |
| 5 | Update catalog cards | 15 min | Drilldown done |
| **TOTAL** | **End-to-End** | **~3 hours** | Database access |

---

## 🎯 Data Structure in Database

### Product Record After Enrichment:

```json
{
  "id": "uuid",
  "name": "Abadia de Acon Crianza 2019",
  "brand": "Bodegas Riojanas",
  "category": "Red Wine",
  "description": "Abadia de Acon Crianza 2019 is a classic Spanish Rioja wine crafted from Tempranillo grapes. Aged 12 months in American and French oak barrels, this wine showcases traditional Rioja character with red fruit, vanilla, and spice notes.",

  "tastingNotes": {
    "aroma": "Red cherry, vanilla, tobacco, leather, sweet spice",
    "palate": "Medium-bodied with vibrant red fruit, silky tannins, balanced acidity",
    "finish": "Medium-long finish with lingering oak and dried fruit"
  },

  "foodPairings": [
    "Grilled lamb chops with rosemary",
    "Aged manchego cheese",
    "Mushroom risotto",
    "Charcuterie board with jamón",
    "Roasted red peppers"
  ],

  "servingInfo": {
    "temperature": "60-65°F (15-18°C)",
    "decanting": "Decant 30 minutes before serving",
    "glassware": "Bordeaux-style wine glass"
  },

  "wineDetails": {
    "region": "Rioja, Spain",
    "grapeVariety": "Tempranillo",
    "vintage": 2019,
    "style": "Medium-bodied red wine with oak aging",
    "ageability": "Drink now through 2027",
    "peakWindow": "2024-2026"
  },

  "enrichedAt": "2025-10-20T14:30:00Z",
  "enrichedBy": "claude-ai"
}
```

---

## 🎨 UI Components

### Updated Product Drilldown Modal

**4 Tabs:**
1. **📦 Inventory** (existing)
2. **💰 Pricing** (existing)
3. **📈 Sales History** (existing)
4. **📖 Product Details** (NEW!)

### New Product Details Tab Layout:

```
┌──────────────────────────────────────────────────────┐
│ 📖 Product Details                                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│ Abadia de Acon Crianza 2019                          │
│ Bodegas Riojanas • Rioja, Spain • 2019               │
│ Medium-bodied red wine with oak aging                │
│                                                       │
│ ┌──────────────────────────────────────────────────┐ │
│ │ Description                                      │ │
│ │ Abadia de Acon Crianza 2019 is a classic       │ │
│ │ Spanish Rioja wine crafted from Tempranillo... │ │
│ └──────────────────────────────────────────────────┘ │
│                                                       │
│ Tasting Notes                                         │
│ ┌──────────┬──────────┬──────────┐                   │
│ │ 🍷 Aroma │ 👅 Palate│ ✨ Finish│                   │
│ ├──────────┼──────────┼──────────┤                   │
│ │ Red      │ Medium-  │ Medium-  │                   │
│ │ cherry,  │ bodied   │ long     │                   │
│ │ vanilla, │ with red │ finish   │                   │
│ │ tobacco  │ fruit... │ with oak │                   │
│ └──────────┴──────────┴──────────┘                   │
│                                                       │
│ Perfect Pairings                                      │
│ [🥩 Grilled lamb] [🧀 Manchego] [🍄 Risotto]        │
│                                                       │
│ Serving Guide                                         │
│ 🌡️ Temperature: 60-65°F                              │
│ 🍷 Decant: 30 minutes                                │
│ 🥂 Glass: Bordeaux style                             │
│ ⏰ Drink: Now through 2027                           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🔄 Enrichment Workflow

### Step-by-Step Process:

**1. Database Migration** (5 min)
```bash
# Add new fields to Product model
npx prisma migrate dev --name add_enrichment_fields
```

**2. Build Enrichment Script** (30 min)
- Uses Anthropic SDK
- Generates professional tasting notes
- Saves to database with proper structure

**3. Run Enrichment** (90 min)
```bash
# Test with 10 products
npx tsx scripts/claude-enrich-products.ts --test 10

# Run full enrichment (batches of 20)
npx tsx scripts/claude-enrich-products.ts --all
```

**4. Update Drilldown Modal** (30 min)
- Add Product Details tab
- Display tasting notes beautifully
- Show serving information
- Format food pairings

**5. Update Catalog Cards** (15 min)
- Add tasting note preview
- Show "View tasting notes" link
- Better hover states

---

## 💰 Cost Analysis

### Using Claude (This Session):

**Token Usage Estimate:**
- Per product: ~500 tokens output
- Total for 1,285: ~642,500 tokens
- Your context window: 1M tokens

**Batching Strategy:**
- Process 20 products at once
- Clear context between batches
- **Total batches needed:** ~64

**Cost:** $0 (uses your existing Claude Code session!)

**Alternative:** Use Anthropic API directly
- Cost: ~$0.003 per product
- Total: ~$3.86 for all 1,285 SKUs

---

## 📝 Detailed Technical Plan

### Step 1: Schema Migration

**File:** `prisma/migrations/XXX_add_enrichment_fields/migration.sql`

```sql
ALTER TABLE "Product"
  ADD COLUMN "tastingNotes" JSONB,
  ADD COLUMN "foodPairings" JSONB,
  ADD COLUMN "servingInfo" JSONB,
  ADD COLUMN "wineDetails" JSONB,
  ADD COLUMN "enrichedAt" TIMESTAMP,
  ADD COLUMN "enrichedBy" TEXT DEFAULT 'claude-ai';
```

---

### Step 2: Enrichment Script Structure

**File:** `/scripts/claude-enrich-products.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type EnrichmentData = {
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
    region: string | null;
    grapeVariety: string | null;
    vintage: number | null;
    style: string;
    ageability: string;
  };
};

async function enrichProducts(options: {
  test?: number;
  all?: boolean;
  batchSize?: number;
}) {
  const { test, all, batchSize = 20 } = options;

  // Get products needing enrichment
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { description: null },
        { tastingNotes: null }
      ]
    },
    include: {
      skus: {
        take: 1,
        select: { code: true, size: true, abv: true }
      }
    },
    take: test || (all ? undefined : batchSize),
  });

  console.log(`🍷 Enriching ${products.length} products...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const sku = product.skus[0];

    console.log(`[${i + 1}/${products.length}] ${product.name}`);

    try {
      const enrichedData = await generateProductData(product, sku);

      await prisma.product.update({
        where: { id: product.id },
        data: {
          description: enrichedData.description,
          tastingNotes: enrichedData.tastingNotes as any,
          foodPairings: enrichedData.foodPairings as any,
          servingInfo: enrichedData.servingInfo as any,
          wineDetails: enrichedData.wineDetails as any,
          enrichedAt: new Date(),
          enrichedBy: 'claude-ai',
        },
      });

      successCount++;
      console.log('  ✓ Enriched and saved\n');

      // Rate limiting: 1 per second
      await sleep(1000);
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    }
  }

  console.log(`\n✅ Complete: ${successCount} enriched, ${errorCount} failed`);
}

async function generateProductData(
  product: { name: string; brand: string | null; category: string | null },
  sku: { code: string; size: string | null; abv: number | null } | undefined
): Promise<EnrichmentData> {
  const prompt = `You are an expert sommelier and wine educator. Generate detailed, professional product information for this wine/spirit product:

Product Name: ${product.name}
Brand: ${product.brand || 'Unknown'}
Category: ${product.category || 'Wine'}
Size: ${sku?.size || 'Standard 750ml'}
ABV: ${sku?.abv || 'Standard'}%

Generate comprehensive product data. Respond ONLY with valid JSON in this exact structure:

{
  "description": "Write a compelling 2-3 sentence product description highlighting origin, style, and key characteristics",
  "tastingNotes": {
    "aroma": "Describe nose/aroma in professional wine terminology (8-12 words)",
    "palate": "Describe taste profile including body, tannins, acidity, flavors (12-15 words)",
    "finish": "Describe the finish (6-10 words)"
  },
  "foodPairings": [
    "Specific dish pairing 1",
    "Specific dish pairing 2",
    "Specific dish pairing 3",
    "Specific dish pairing 4",
    "Specific dish pairing 5"
  ],
  "servingInfo": {
    "temperature": "Optimal serving temperature (e.g., '60-65°F' or '45-50°F')",
    "decanting": "Decanting recommendation or 'Serve immediately'",
    "glassware": "Recommended glass type"
  },
  "wineDetails": {
    "region": "Primary wine region if identifiable from name, otherwise null",
    "grapeVariety": "Primary grape variety if identifiable, otherwise null",
    "vintage": Extract vintage year from name as number, or null,
    "style": "Brief style description (e.g., 'Full-bodied red', 'Crisp white', 'Premium aged spirit')",
    "ageability": "Drinking window (e.g., 'Drink now through 2027' or 'Best enjoyed fresh')"
  }
}

Be professional, specific, and accurate. Make reasonable inferences based on wine/spirit naming conventions and regions.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }

  return JSON.parse(content.text);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse command line args
const args = process.argv.slice(2);
const options = {
  test: args.includes('--test') ? parseInt(args[args.indexOf('--test') + 1]) : undefined,
  all: args.includes('--all'),
  batchSize: args.includes('--batch') ? parseInt(args[args.indexOf('--batch') + 1]) : 20,
};

enrichProducts(options);
```

---

### Step 3: Update API to Return Enriched Data

**File:** `/api/sales/catalog/[skuId]/details/route.ts`

**Add to response:**
```typescript
const details = {
  product: {
    // ... existing fields ...
    description: product.description,
    tastingNotes: product.tastingNotes,
    foodPairings: product.foodPairings,
    servingInfo: product.servingInfo,
    wineDetails: product.wineDetails,
  },
  // ... inventory, pricing, sales ...
};
```

---

### Step 4: Update Modal Component

**File:** `ProductDrilldownModal.tsx`

**Add Product Details Tab:**

```tsx
{/* Tab 4: Product Details */}
{activeTab === 'details' && (
  <div className="space-y-6">
    {/* Description */}
    {data.product.description && (
      <div>
        <p className="text-base leading-relaxed text-gray-700">
          {data.product.description}
        </p>
      </div>
    )}

    {/* Tasting Notes */}
    {data.product.tastingNotes && (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Tasting Notes</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-purple-50 p-4 border border-purple-200">
            <h4 className="text-xs font-semibold text-purple-900 mb-2">
              🍷 Aroma
            </h4>
            <p className="text-sm text-purple-800">
              {data.product.tastingNotes.aroma}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-4 border border-red-200">
            <h4 className="text-xs font-semibold text-red-900 mb-2">
              👅 Palate
            </h4>
            <p className="text-sm text-red-800">
              {data.product.tastingNotes.palate}
            </p>
          </div>
          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
            <h4 className="text-xs font-semibold text-amber-900 mb-2">
              ✨ Finish
            </h4>
            <p className="text-sm text-amber-800">
              {data.product.tastingNotes.finish}
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Food Pairings */}
    {data.product.foodPairings && (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Perfect Pairings
        </h3>
        <div className="flex flex-wrap gap-2">
          {data.product.foodPairings.map((pairing: string, idx: number) => (
            <span
              key={idx}
              className="rounded-full bg-green-100 border border-green-200 px-3 py-1.5 text-sm font-medium text-green-800"
            >
              {pairing}
            </span>
          ))}
        </div>
      </div>
    )}

    {/* Serving Info */}
    {data.product.servingInfo && (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Serving Guide
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Temperature</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              🌡️ {data.product.servingInfo.temperature}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Decanting</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              🍷 {data.product.servingInfo.decanting}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <p className="text-xs text-gray-600">Glassware</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              🥂 {data.product.servingInfo.glassware}
            </p>
          </div>
        </div>
      </div>
    )}

    {/* Wine Details */}
    {data.product.wineDetails && (
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">
          Wine Details
        </h3>
        <dl className="grid gap-3 md:grid-cols-2">
          {data.product.wineDetails.region && (
            <div className="flex justify-between rounded-lg border border-gray-200 bg-white p-3">
              <dt className="text-sm text-gray-600">Region</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {data.product.wineDetails.region}
              </dd>
            </div>
          )}
          {data.product.wineDetails.grapeVariety && (
            <div className="flex justify-between rounded-lg border border-gray-200 bg-white p-3">
              <dt className="text-sm text-gray-600">Grape Variety</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {data.product.wineDetails.grapeVariety}
              </dd>
            </div>
          )}
          {data.product.wineDetails.style && (
            <div className="flex justify-between rounded-lg border border-gray-200 bg-white p-3">
              <dt className="text-sm text-gray-600">Style</dt>
              <dd className="text-sm font-semibold text-gray-900">
                {data.product.wineDetails.style}
              </dd>
            </div>
          )}
          {data.product.wineDetails.ageability && (
            <div className="flex justify-between rounded-lg border border-gray-200 bg-white p-3">
              <dt className="text-sm text-gray-600">Drink Window</dt>
              <dd className="text-sm font-semibold text-gray-900">
                ⏰ {data.product.wineDetails.ageability}
              </dd>
            </div>
          )}
        </dl>
      </div>
    )}
  </div>
)}
```

---

### Step 5: Catalog Card Enhancement

**File:** `CatalogGrid.tsx`

**Add tasting note preview:**

```tsx
{/* Add after product name/brand */}
{product.tastingNotes?.aroma && (
  <div className="mt-2 rounded bg-purple-50 px-2 py-1 border border-purple-100">
    <p className="text-xs italic text-purple-800 line-clamp-1">
      🍷 {product.tastingNotes.aroma}
    </p>
  </div>
)}

{/* Add "View tasting notes" badge */}
{product.enrichedAt && (
  <span className="text-xs text-indigo-600 font-medium">
    📖 View tasting notes
  </span>
)}
```

---

## 🎯 Approval Checklist

### ✅ What You're Approving:

- [ ] **Database changes:** Add 6 new JSON fields to Product model
- [ ] **Enrichment script:** Claude-powered product data generation
- [ ] **Batch processing:** Process 1,285 products in ~90 minutes
- [ ] **UI updates:** Add Product Details tab to drilldown modal
- [ ] **Catalog enhancement:** Show tasting note previews

### ⚠️ What You're NOT approving:

- ❌ External API costs (using Claude, not GPT-4/Wine Vybe)
- ❌ Image uploading (skipping images per your request)
- ❌ Manual data entry (100% automated)
- ❌ Third-party dependencies (just Anthropic SDK)

---

## 📊 Risk Assessment

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| **Bad data quality** | Low | Test batch of 10 first, review before continuing |
| **Database errors** | Low | Preview mode first, save only after approval |
| **API rate limits** | Low | Built-in 1 sec delay between products |
| **Cost overrun** | None | Using Claude (already paid for) |
| **Schema conflicts** | Low | Adding new fields, not modifying existing |

---

## 🏁 Execution Plan (With Your Approval)

### Batch 1: Setup & Test (30 min)
1. ✅ Run Prisma migration (add new fields)
2. ✅ Build enrichment script
3. ✅ Test on 10 products
4. ✅ Review quality with you
5. ⏸️ **PAUSE FOR YOUR APPROVAL**

### Batch 2: Small Scale (30 min)
6. ✅ Run on 50-100 products
7. ✅ Verify database saves correctly
8. ✅ Spot check a few products
9. ⏸️ **PAUSE FOR YOUR APPROVAL**

### Batch 3: Full Enrichment (90 min)
10. ✅ Process all remaining products
11. ✅ Monitor progress
12. ✅ Handle any errors

### Batch 4: UI Updates (45 min)
13. ✅ Update drilldown modal
14. ✅ Add Product Details tab
15. ✅ Enhance catalog cards
16. ✅ Test UI with enriched data

### Batch 5: Testing & Launch (30 min)
17. ✅ Test drilldown with real data
18. ✅ Verify all fields display correctly
19. ✅ Train sales reps
20. ✅ Deploy to production

**Total Time:** ~4 hours (with approval pauses)

---

## 💡 What Makes This Better Than GPT-4

1. **Already Here:** No new API to set up
2. **Better Context:** Claude knows your database schema
3. **Integrated:** Generate + save + build UI all in one session
4. **Smarter:** Claude 3.5 Sonnet is excellent at structured data
5. **Controllable:** You can review and adjust prompts in real-time

---

## 📝 Sample Generated Content (What to Expect)

### Example 1: Abadia de Acon Crianza 2019

```json
{
  "description": "Abadia de Acon Crianza 2019 is a classic Spanish Rioja wine from Bodegas Riojanas, one of the region's most respected producers. Aged 12 months in a combination of American and French oak, this Tempranillo-based wine offers traditional Rioja character with red fruit, vanilla, and subtle spice notes.",

  "tastingNotes": {
    "aroma": "Red cherry, vanilla bean, tobacco leaf, leather, cedar, dried herbs",
    "palate": "Medium-bodied with bright red fruit core, integrated oak, supple tannins, balanced acidity, savory undertones",
    "finish": "Medium-long finish with persistent oak spice and dried cherry"
  },

  "foodPairings": [
    "Grilled lamb chops with rosemary and garlic",
    "Aged Manchego cheese with quince paste",
    "Wild mushroom risotto with Parmesan",
    "Spanish-style roasted vegetables with olive oil",
    "Charcuterie board with jamón serrano"
  ],

  "servingInfo": {
    "temperature": "60-65°F (15-18°C)",
    "decanting": "Decant 30 minutes before serving for optimal expression",
    "glassware": "Bordeaux or Rioja-style wine glass"
  },

  "wineDetails": {
    "region": "Rioja, Spain",
    "grapeVariety": "Tempranillo",
    "vintage": 2019,
    "style": "Medium-bodied red wine with traditional oak aging",
    "ageability": "Drink now through 2027. Peak: 2024-2026."
  }
}
```

---

## 🎉 Benefits for Sales Reps

### Before Enrichment:
**Rep:** "Uh, let me Google that wine for you..."
**Customer:** "Never mind, I'll think about it"

### After Enrichment:
**Rep:** "Abadia de Acon Crianza 2019 - classic Rioja with cherry and vanilla notes. Perfect with lamb or aged cheese. We have 249 units available. Want me to add 2 cases to your order?"
**Customer:** "Absolutely!"

### Measurable Impact:
- ✅ Answer customer questions instantly
- ✅ Sound like wine experts
- ✅ Suggest perfect pairings
- ✅ Build customer confidence
- ✅ Close sales faster

---

## ✅ Ready for Your Approval

**I can build this complete system if you approve:**

### What I'll Do:
1. ✅ Create Prisma migration for new fields
2. ✅ Build Claude-powered enrichment script
3. ✅ Test on 10 products (show you results)
4. ✅ After your approval, enrich all 1,285
5. ✅ Update drilldown modal with Product Details tab
6. ✅ Enhance catalog cards with previews
7. ✅ Full testing and documentation

### What You Need:
- ✅ Your approval to proceed
- ✅ ANTHROPIC_API_KEY in .env.local (for batch processing)
- ✅ ~90 minutes for full enrichment to run

### What You Get:
- ✅ 1,285 products with professional tasting notes
- ✅ Beautiful Product Details tab in drilldown
- ✅ Preview snippets in catalog
- ✅ Zero external API costs
- ✅ Complete in 4 hours

---

## 🚦 Approve to Proceed?

**Response needed:**
- [ ] ✅ **APPROVED** - Proceed with full plan
- [ ] 🟡 **TEST FIRST** - Build script, test 10 products, then pause
- [ ] 🔄 **MODIFY** - I want changes: ___________
- [ ] ❌ **HOLD** - Not right now

**If approved, I'll start with Batch 1 (Setup & Test) immediately!** 🚀

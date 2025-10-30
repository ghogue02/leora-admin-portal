# Product Enrichment - Quick Start Guide

## 🎯 Goal
Add tasting notes, descriptions, and images to your 1,285 wine/spirits products automatically.

---

## ⚡ Fastest Path: GPT-4 (Ready Now!)

### Cost
- **Test 10 products:** ~$0.10
- **All 1,285 products:** ~$12.85
- **Per product:** ~$0.01

### What You Get
✅ Professional product descriptions
✅ Sommelier-quality tasting notes (aroma, palate, finish)
✅ Food pairing suggestions
✅ Serving temperature & suggestions
✅ Ageability notes
✅ Wine style & region info

### Time
- **Setup:** 5 minutes
- **Test run (10 products):** 2 minutes
- **Full run (1,285 products):** ~30 minutes

---

## 🚀 Try It Now (3 Steps)

### Step 1: Add OpenAI Key
```bash
# Add to .env.local
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env.local
```

### Step 2: Run Test Enrichment
```bash
# Test with 5 products (costs ~$0.05)
npx tsx scripts/enrich-products-poc.ts 5

# Test with 10 products
npx tsx scripts/enrich-products-poc.ts 10
```

### Step 3: Review Results
Check the console output to see generated descriptions and tasting notes!

---

## 📊 Example Output

```
🍷 Product Enrichment - Proof of Concept

Enriching 5 products with GPT-4...

Found 5 products to enrich

────────────────────────────────────────────────────────────

[1/5] Abadia de Acon Crianza 2019
Brand: Unknown
Category: Uncategorized

✓ Generated Data:
  Description: Abadia de Acon Crianza 2019 is a classic Spanish Rioja wine
  crafted from Tempranillo grapes. Aged 12 months in oak barrels, this wine...

  Aroma: Cherry, vanilla, tobacco, leather, subtle spice

  Pairings: Grilled lamb chops, Aged manchego cheese, Mushroom risotto

  💾 [PREVIEW MODE - Not saving to database]

────────────────────────────────────────────────────────────

[2/5] Remhoogte Honeybunch 2024
Brand: Unknown
Category: Uncategorized

✓ Generated Data:
  Description: Remhoogte Honeybunch 2024 is a vibrant South African white
  wine known for its honeyed notes and fresh acidity...

  Aroma: Honeysuckle, citrus, stone fruit, floral hints

  Pairings: Grilled seafood, Goat cheese salad, Thai cuisine

  💾 [PREVIEW MODE - Not saving to database]

────────────────────────────────────────────────────────────

✅ Enrichment preview complete!

To save to database, uncomment the update section in the script.
```

---

## 🎨 What Gets Generated

For **every product**, GPT-4 creates:

### 1. Product Description
> "Abadia de Acon Crianza 2019 is a classic Spanish Rioja wine crafted from Tempranillo grapes. Aged 12 months in oak barrels, this wine showcases traditional Rioja character with modern elegance. A versatile food wine perfect for both casual dining and special occasions."

### 2. Tasting Notes
- **Aroma:** Cherry, vanilla, tobacco, leather, subtle spice
- **Palate:** Medium-bodied with red fruit, smooth tannins, balanced acidity
- **Finish:** Long, elegant finish with oak and dried fruit notes

### 3. Food Pairings
- Grilled lamb chops
- Aged manchego cheese
- Mushroom risotto
- Charcuterie boards
- Roasted vegetables

### 4. Serving Info
- **Temperature:** 60-65°F (15-18°C)
- **Suggestions:** Decant 30 minutes before serving
- **Glassware:** Bordeaux glass recommended

### 5. Additional Data
- **Ageability:** "Drink now through 2028"
- **Style:** "Medium-bodied red wine"
- **Region:** "Rioja, Spain"
- **Grape:** "Tempranillo"

---

## 💡 Alternative Solutions

### Option A: Wine Vybe API ($200-500/month)
**Best for:** Official data, professional images, large portfolios
**Coverage:** 2M+ wines
**Includes:** Tasting notes, images, pairings, producer info

**Next Step:** Contact sales@winevybe.com for pricing

---

### Option B: Hybrid (GPT-4 + Wine Vybe)
**Best for:** Balance of quality and cost
**Strategy:**
1. Try Wine Vybe first (top 500 products)
2. Use GPT-4 for remainder
3. Manual review for flagships

**Cost:** $200/mo (API) + $13 (GPT-4) = ~$213

---

### Option C: Manual Entry with AI Assist
**Best for:** Perfect control, small batches
**Tools:**
- GPT-4 generates drafts
- Team reviews and edits
- Upload images manually

**Cost:** Just time (10-20 hours)

---

## 🔧 How to Actually Save Data

Once you're happy with the test results, enable saving:

### Update the Script

In `/scripts/enrich-products-poc.ts`, **uncomment these lines:**

```typescript
// Uncomment to actually save:
await prisma.product.update({
  where: { id: product.id },
  data: {
    description: enrichedData.description,
    metadata: enrichedData,
  },
});
console.log('  ✓ Saved to database');
```

### Run Full Enrichment
```bash
# Enrich all products missing descriptions
npx tsx scripts/enrich-products-poc.ts 1285

# Or do in batches of 100
npx tsx scripts/enrich-products-poc.ts 100
```

---

## 🎯 Database Schema Update Needed

Before saving data, add these fields:

```prisma
model Product {
  id           String   @id @default(uuid()) @db.Uuid
  tenantId     String   @db.Uuid
  supplierId   String?  @db.Uuid
  name         String
  brand        String?
  description  String?  @db.Text  // ← ADD THIS
  category     String?
  isSampleOnly Boolean  @default(false)

  // ADD THESE:
  imageUrl     String?              // Product image URL
  metadata     Json?                // Tasting notes, pairings, etc.
  enrichedAt   DateTime?            // When enriched

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // ... existing relations
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_product_enrichment
```

---

## 📈 Recommended Approach

### Phase 1: Proof of Concept (Today)
✅ Test GPT-4 on 10 products
✅ Review quality
✅ Calculate actual costs
✅ Get team feedback

### Phase 2: Small Batch (This Week)
- Run on 50-100 products
- A/B test with sales reps
- Measure impact on sales

### Phase 3: Full Rollout (Next Week)
- Enrich all 1,285 products
- Deploy to production
- Train reps on new data
- Monitor usage

### Phase 4: Maintenance (Ongoing)
- Auto-enrich new products
- Quarterly refresh
- Add images over time
- Improve based on feedback

---

## 🎁 Bonus: Image Sourcing Options

### Option 1: GPT-4 Vision with Bottle Photos
1. Take photos of bottles in warehouse
2. Use GPT-4 Vision to extract label text
3. Generate descriptions from labels
4. Store photos as product images

**Cost:** ~$0.03 per product

### Option 2: Google Image Search
```typescript
async function findWineImage(productName: string) {
  // Use Custom Search API
  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?` +
    `key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&` +
    `q=${encodeURIComponent(productName + ' wine bottle')}&` +
    `searchType=image&num=1`
  );

  const data = await response.json();
  return data.items?.[0]?.link;
}
```

**Cost:** 100 searches/day free, then $5/1000

### Option 3: Request from Suppliers
- Email suppliers for product images
- Usually professional shots
- Legal/licensed to use
- Free but time-consuming

---

## 💻 Ready-to-Run Commands

```bash
# Test with 5 products (Preview mode - no DB changes)
npx tsx scripts/enrich-products-poc.ts 5

# Test with 10 products
npx tsx scripts/enrich-products-poc.ts 10

# See what it generates, then decide if you want to:
# 1. Enable database saving
# 2. Run on all 1,285 products
# 3. Try Wine Vybe API instead
```

---

## ❓ Decision Matrix

**Choose GPT-4 if:**
- Want to test immediately
- Budget conscious
- Need 100% coverage
- OK with AI-generated content

**Choose Wine Vybe if:**
- Need official tasting notes
- Want professional images included
- Larger budget available
- Require authoritative source

**Choose Hybrid if:**
- Want best of both worlds
- Can invest time in setup
- Want cost optimization
- Need maximum coverage + quality

---

**What would you like to do next?**
1. Test the GPT-4 script I created?
2. Get Wine Vybe pricing quote?
3. Build the hybrid system?
4. Something else?

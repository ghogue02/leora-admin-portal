# Local Product Enrichment Setup

**Purpose:** Run enrichment locally while AWS Supabase is down, ready to sync when back online

---

## 🎯 Strategy

Since AWS is down, we'll:
1. Generate enrichment data locally (no database needed)
2. Store enriched data in JSON files
3. When AWS is back, batch upload to database
4. Verify UI displays correctly

---

## 📋 Local Workflow

### Step 1: Generate Product List
```bash
# When AWS is back, fetch product list
tsx scripts/fetch-products-list.ts > data/products-to-enrich.json
```

### Step 2: Generate Enrichment Data Locally
```bash
# Generate enrichment for all products (no DB writes)
tsx scripts/generate-enrichment-local.ts
# Output: data/enriched-products.json
```

### Step 3: Review Generated Data
```bash
# Preview first 10 enrichments
tsx scripts/preview-enrichment.ts
```

### Step 4: Upload When AWS Returns
```bash
# Batch upload enriched data to database
tsx scripts/upload-enrichment.ts
```

---

## 🚀 Benefits of This Approach

1. **No Waiting:** Generate enrichment data now
2. **Review Quality:** Check all data before database upload
3. **Fast Upload:** Batch insert when AWS returns (2-3 minutes)
4. **Rollback Safe:** Can modify data before upload
5. **Cost Effective:** $0 using Claude Code

---

## 📁 File Structure

```
/Users/greghogue/Leora2/web/
├── scripts/
│   ├── fetch-products-list.ts       # Fetch products from DB
│   ├── generate-enrichment-local.ts # Generate enrichment locally
│   ├── preview-enrichment.ts        # Preview generated data
│   ├── upload-enrichment.ts         # Batch upload to DB
│   └── monitor-aws-status.ts        # Check if AWS is back
├── data/
│   ├── products-to-enrich.json      # Product list (when AWS back)
│   ├── enriched-products.json       # Generated enrichment data
│   └── enrichment-progress.json     # Progress tracking
```

---

## 🎨 Sample Enrichment Output

```json
{
  "productId": "uuid-here",
  "name": "Château Margaux 2015",
  "enrichment": {
    "description": "Iconic Bordeaux estate producing legendary wines...",
    "tastingNotes": {
      "aroma": "Cassis, violet, cedar, graphite",
      "palate": "Full-bodied with silky tannins...",
      "finish": "Long, elegant finish"
    },
    "foodPairings": [
      "Prime rib roast",
      "Duck breast à l'orange",
      "Aged Comté cheese",
      "Wild mushroom risotto",
      "Dark chocolate tart"
    ],
    "servingInfo": {
      "temperature": "60-65°F (16-18°C)",
      "decanting": "Decant 45-60 minutes",
      "glassware": "Bordeaux glass"
    },
    "wineDetails": {
      "region": "Margaux, Bordeaux, France",
      "grapeVariety": "Cabernet Sauvignon, Merlot, Petit Verdot",
      "vintage": 2015,
      "style": "Full-bodied red wine",
      "ageability": "Peak 2025-2040"
    }
  }
}
```

---

## ⏱️ Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Generate enrichment locally | 30 min | Ready |
| Review & adjust data | 15 min | Ready |
| Wait for AWS to return | ??? | Waiting |
| Batch upload to database | 3 min | Ready |
| Verify UI display | 5 min | Ready |
| **Total (excluding AWS wait)** | **53 min** | **Ready** |

---

## 🔄 Alternative: SQLite Local Database

If you want to test the full workflow locally:

1. Create local SQLite database
2. Seed with sample products
3. Run enrichment script
4. Test UI locally
5. When AWS is back, sync to production

---

## 📊 Monitoring AWS Status

```bash
# Check if AWS/Supabase is back online
tsx scripts/monitor-aws-status.ts

# Output:
# ⏳ AWS Status: DOWN
# 🔄 Checking again in 5 minutes...
# ✅ AWS Status: UP! Ready to upload enrichment data.
```

---

## 🎯 Next Steps

1. Create all local scripts
2. Generate sample enrichment for 10 products
3. Review quality
4. Wait for AWS to return
5. Batch upload everything

Ready to start?

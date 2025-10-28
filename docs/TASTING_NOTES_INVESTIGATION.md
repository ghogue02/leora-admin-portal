# Tasting Notes Investigation Report

## Executive Summary

**Issue:** Users reported that all products show the same tasting notes.

**Root Cause:** The database contains **duplicate generic tasting notes** for multiple products, likely auto-generated with template descriptions rather than product-specific content.

## Database Investigation Results

### Overall Statistics
- **Total Products:** 1,879
- **Products with Tasting Notes:** 1,879 (100%)
- **Enriched By:** claude-code
- **Enrichment Date:** October 20, 2025

### ⚠️ **Critical Finding: Duplicate Tasting Notes**

Out of 15 products analyzed:
- **Unique aroma descriptions:** Only 5
- **Duplicate rate:** 67% of products share tasting notes

### Duplicate Examples

#### 🔴 Most Common (8 products share this):
**Aroma:** "Dark cherry, blackberry, vanilla oak, hints of tobacco, leather, and dried herbs"

**Products affected:**
1. Sailor Seeks Horse Pinot Noir 2022
2. Barone Di Bernaj Cabernet Sauvignon Terre Siciliane 2021
3. Bodegas Riojanas Monte Real Gran Reserva 2005
4. Raywood Cabernet Sauvignon Keg 2023
5. Chateau Puy Laborde Bordeaux Superieur 2019
6. Terra Nostra Corse 2021
7. Zephaniah Three Captains Red 2019
8. Shipping- Domestic

#### 🔴 Second Most Common (3 products):
**Aroma:** "Dark cherry, blackberry, vanilla oak, tobacco, leather"

**Products:**
- Shabo Original Merlot 2022
- Mauro Molino Barolo Gallinotto 2021
- Chateau Maris Zulu 2020

#### 🔴 Third Most Common (2 products):
**Aroma:** "Citrus blossom, green apple, pear, hints of tropical fruit and minerality"

**Products:**
- Black Elephant Vintners Power of Love Chenin Blanc 2024
- Patrick Sullivan Chardonnay 2023

## Why This Happened

The enrichment appears to have been done by an AI (claude-code) that:
1. Used **generic wine category templates** rather than product-specific descriptions
2. Applied the same tasting notes to wines of similar varietals/styles
3. Did not differentiate between products from different vineyards, regions, or vintages

## Architecture Analysis

### ✅ **What's Working Correctly:**

1. **Database Schema** - Properly supports unique tasting notes per product
   ```prisma
   model Product {
     tastingNotes Json?
     foodPairings Json?
     servingInfo  Json?
     wineDetails  Json?
   }
   ```

2. **API Endpoints** - Correctly return product-specific data
   - `/api/sales/catalog` - Returns tastingNotes for each product
   - `/api/sales/catalog/[skuId]/details` - Returns full enrichment data

3. **UI Components** - Display the data as stored in database
   - CatalogGrid shows inline aroma snippet
   - ProductDrilldownModal shows full tasting notes

### ❌ **What Needs Fixing:**

The **enrichment data itself** contains duplicates. The system is working correctly - it's just displaying what's in the database.

## Solutions

### Option 1: Re-enrich with Better AI Prompts (Recommended)

Update the enrichment script to generate **truly unique** tasting notes:

```typescript
// Instead of generic templates, use:
- Product name + vintage
- Brand + region information
- Varietal characteristics
- Actual wine reviews (if available)
- Price point indicators
```

### Option 2: Manual Enrichment

Manually update tasting notes for top-selling or featured products first, then expand coverage.

### Option 3: Source from Wine Databases

Integrate with wine databases (Vivino API, Wine.com, etc.) to get real tasting notes.

### Option 4: AI with Product Context

Re-run enrichment with full product context:

```typescript
const enrichmentPrompt = `
Product: ${product.name}
Brand: ${product.brand}
Vintage: ${extractVintage(product.name)}
Category: ${product.category}
Price Range: ${getPriceRange(product)}

Generate UNIQUE, product-specific tasting notes that reflect:
- The specific vintage characteristics
- Regional terroir
- Winemaking style
- Varietal profile
`;
```

## Immediate Actions

1. **Identify high-priority products** (best sellers, featured items)
2. **Re-enrich these products first** with better prompts
3. **Validate uniqueness** before updating database
4. **Roll out gradually** to remaining products

## SQL Queries for Cleanup

### Find all products with the most common duplicate:
```sql
SELECT id, name, brand, "tastingNotes"->>'aroma' as aroma
FROM "Product"
WHERE "tastingNotes"->>'aroma' = 'Dark cherry, blackberry, vanilla oak, hints of tobacco, leather, and dried herbs';
```

### Count products by aroma similarity:
```sql
SELECT "tastingNotes"->>'aroma' as aroma, COUNT(*) as count
FROM "Product"
WHERE "tastingNotes" IS NOT NULL
GROUP BY "tastingNotes"->>'aroma'
ORDER BY count DESC
LIMIT 10;
```

## Verification Script

Run this to check enrichment quality:
```bash
npx tsx scripts/check-unique-notes.ts
```

## Conclusion

**The issue is NOT a bug in the code** - it's a **data quality problem** from the initial enrichment process. The system is correctly displaying what's stored in the database.

**Fix:** Re-enrich products with better AI prompts that generate truly unique, product-specific tasting notes.

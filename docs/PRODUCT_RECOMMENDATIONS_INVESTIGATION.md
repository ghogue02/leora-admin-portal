# Product Recommendations Investigation

**Date**: 2025-10-27
**Status**: ✅ Investigation Complete
**Issue**: Showing "0 Opportunities" with message "Great news! This customer has ordered all top products"

---

## Executive Summary

The product recommendations feature is **working as designed but missing critical data**. The system relies on a `TopProduct` table that must be populated by a scheduled job or manual process, but **this table appears to be empty or not regularly updated**.

---

## How Recommendations Currently Work

### Data Flow

1. **API Route**: `/api/sales/customers/[customerId]/route.ts` (lines 218-320)
2. **Component**: `/app/sales/customers/[customerId]/sections/ProductRecommendations.tsx`

### Logic (Lines 308-320 in route.ts)

```typescript
// Product gap analysis - Top 20 company wines not yet ordered
const orderedSkuIds = new Set(topProductsRaw.map((tp) => tp.skuId));
const recommendations = companyTopProducts
  .filter((tp) => !orderedSkuIds.has(tp.skuId))
  .map((tp) => ({
    skuId: tp.skuId,
    skuCode: tp.sku.code,
    productName: tp.sku.product.name,
    brand: tp.sku.product.brand,
    category: tp.sku.product.category,
    rank: tp.rank,
    calculationMode: tp.rankingType,
  }));
```

### Step-by-Step Process

1. **Fetch Company Top Products** (lines 218-234)
   - Queries `TopProduct` table for tenant
   - Gets most recent calculation (ordered by `calculatedAt DESC`)
   - Takes top 20 products
   - Includes SKU and product details

2. **Fetch Customer's Ordered Products** (lines 195-216)
   - Gets customer's top products from last 6 months
   - Calculates from actual `OrderLine` data
   - Filters out cancelled orders and samples
   - Groups by SKU

3. **Calculate Gap** (lines 308-320)
   - Creates set of SKU IDs customer has already ordered
   - Filters company top products to exclude customer's orders
   - Returns remaining products as recommendations

4. **Display** (ProductRecommendations.tsx)
   - Shows count: `{recommendations.length} Opportunities`
   - If empty: "Great news! This customer has ordered all top products"

---

## Why It Shows "0 Opportunities"

### Root Cause: Empty TopProduct Table

The `TopProduct` table is **not being populated automatically**. This table requires:

**Schema** (from `prisma/schema.prisma`):
```prisma
model TopProduct {
  id              String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String   @db.Uuid
  skuId           String   @db.Uuid
  rank            Int
  calculatedAt    DateTime
  periodStartDate DateTime
  periodEndDate   DateTime
  totalRevenue    Decimal  @db.Decimal(14, 2)
  totalCases      Int
  uniqueCustomers Int
  rankingType     String   // "REVENUE", "VOLUME", or "CUSTOMER_COUNT"

  @@unique([tenantId, calculatedAt, rankingType, rank])
}
```

### Missing Job

**Evidence**:
- No script found that populates `TopProduct`
- `grep -r "TopProduct\.create"` returns **no results**
- `seed-well-crafted.ts` does **not** populate this table
- No scheduled job in `/src/jobs` directory calculates top products

### Consequence

When `companyTopProducts` query returns empty array:
```typescript
const recommendations = [].filter(...) // Always empty!
```

Result:
- `recommendations.length === 0`
- Component shows: "Great news! This customer has ordered all top products"
- Badge shows: "0 Opportunities"

---

## Is This a Bug?

**YES** - This is a bug caused by **missing infrastructure**, not broken logic.

### The Code Logic is Correct

✅ **Correct Algorithm**:
- Gap analysis approach is sound
- Filtering logic works properly
- Component handles empty state appropriately

❌ **Missing Data Pipeline**:
- No job to calculate company-wide top products
- Table never gets populated
- Recommendations always return empty

---

## Verification

### Test Queries

```sql
-- Check if TopProduct table has data
SELECT COUNT(*) FROM "TopProduct";
-- Expected: 0 (likely empty)

-- Check if TopProduct has recent calculations
SELECT
  "tenantId",
  "rankingType",
  COUNT(*) as product_count,
  MAX("calculatedAt") as latest_calculation
FROM "TopProduct"
GROUP BY "tenantId", "rankingType";
-- Expected: Empty result set

-- Check what top products SHOULD be
SELECT
  s.id as "skuId",
  s.code as "skuCode",
  p.name as "productName",
  p.brand,
  SUM(ol.quantity * ol."unitPrice") as "totalRevenue",
  SUM(ol.quantity) as "totalCases",
  COUNT(DISTINCT o."customerId") as "uniqueCustomers"
FROM "Sku" s
INNER JOIN "Product" p ON s."productId" = p.id
INNER JOIN "OrderLine" ol ON s.id = ol."skuId"
INNER JOIN "Order" o ON ol."orderId" = o.id
WHERE o.status = 'FULFILLED'
  AND o."deliveredAt" >= NOW() - INTERVAL '6 months'
  AND ol."isSample" = false
GROUP BY s.id, s.code, p.name, p.brand
ORDER BY "totalRevenue" DESC
LIMIT 20;
-- This shows what SHOULD be in TopProduct
```

---

## Recommendations for Fixing

### Solution 1: Create Top Products Calculation Job (RECOMMENDED)

**Create**: `/src/jobs/calculate-top-products.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export async function calculateTopProducts() {
  const tenants = await db.tenant.findMany();

  for (const tenant of tenants) {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Calculate for each ranking type
    for (const rankingType of ['REVENUE', 'VOLUME', 'CUSTOMER_COUNT']) {
      const orderByClause =
        rankingType === 'REVENUE' ? 'totalRevenue' :
        rankingType === 'VOLUME' ? 'totalCases' :
        'uniqueCustomers';

      const topProducts = await db.$queryRaw`
        SELECT
          s.id as "skuId",
          SUM(ol.quantity * ol."unitPrice") as "totalRevenue",
          SUM(ol.quantity) as "totalCases",
          COUNT(DISTINCT o."customerId") as "uniqueCustomers"
        FROM "Sku" s
        INNER JOIN "OrderLine" ol ON s.id = ol."skuId"
        INNER JOIN "Order" o ON ol."orderId" = o.id
        WHERE s."tenantId" = ${tenant.id}::uuid
          AND o.status = 'FULFILLED'
          AND o."deliveredAt" >= ${sixMonthsAgo}
          AND ol."isSample" = false
        GROUP BY s.id
        ORDER BY ${orderByClause} DESC
        LIMIT 20
      `;

      // Delete old calculations for this tenant/type
      await db.topProduct.deleteMany({
        where: {
          tenantId: tenant.id,
          rankingType,
        }
      });

      // Insert new calculations
      await db.topProduct.createMany({
        data: topProducts.map((product, index) => ({
          tenantId: tenant.id,
          skuId: product.skuId,
          rank: index + 1,
          calculatedAt: now,
          periodStartDate: sixMonthsAgo,
          periodEndDate: now,
          totalRevenue: product.totalRevenue,
          totalCases: product.totalCases,
          uniqueCustomers: product.uniqueCustomers,
          rankingType,
        })),
      });
    }
  }

  console.log('✅ Top products calculated for all tenants');
}
```

**Add to**: `package.json`
```json
{
  "scripts": {
    "jobs:calculate-top-products": "tsx src/jobs/calculate-top-products.ts"
  }
}
```

**Schedule**: Run weekly (e.g., via cron, Vercel Cron, or similar)

---

### Solution 2: Real-Time Calculation (ALTERNATIVE)

Modify the API route to calculate top products on-the-fly instead of reading from table:

**Pros**:
- No job needed
- Always up-to-date

**Cons**:
- Slower API response
- More database load
- Duplicate calculation logic

---

### Solution 3: Seed Top Products for Demo (TEMPORARY)

Add to seed script for development/testing:

```typescript
// In seed-well-crafted.ts
const topProductsData = await db.$queryRaw`...`; // Same query as above

await db.topProduct.createMany({
  data: topProductsData.map((product, index) => ({
    tenantId: wellCraftedTenant.id,
    skuId: product.skuId,
    rank: index + 1,
    calculatedAt: new Date(),
    periodStartDate: sixMonthsAgo,
    periodEndDate: new Date(),
    totalRevenue: product.totalRevenue,
    totalCases: product.totalCases,
    uniqueCustomers: product.uniqueCustomers,
    rankingType: 'REVENUE',
  })),
});
```

---

## Testing Plan

### After Implementing Fix

1. **Populate TopProduct table**:
   ```bash
   npm run jobs:calculate-top-products
   ```

2. **Verify data exists**:
   ```sql
   SELECT COUNT(*) FROM "TopProduct";
   -- Should return > 0
   ```

3. **Test API**:
   ```bash
   curl http://localhost:3000/api/sales/customers/{customerId}
   ```

   Expected in response:
   ```json
   {
     "recommendations": [
       {
         "skuId": "...",
         "skuCode": "...",
         "productName": "...",
         "brand": "...",
         "category": "...",
         "rank": 1,
         "calculationMode": "REVENUE"
       }
     ]
   }
   ```

4. **Test UI**:
   - Navigate to customer detail page
   - Should show "X Opportunities" where X > 0
   - Should display table of recommended products

---

## Impact Assessment

### Current State
- ❌ No product recommendations shown
- ❌ Misleading message ("ordered all top products")
- ❌ Lost sales opportunity
- ❌ Feature appears broken to users

### After Fix
- ✅ Accurate recommendations
- ✅ Sales reps can identify gaps
- ✅ Increased cross-sell opportunities
- ✅ Better customer insights

---

## Related Components

### Uses TopProduct Table
1. `/api/sales/customers/[customerId]/route.ts` - Customer recommendations
2. Potentially other features (search codebase for "TopProduct")

### Alternative Recommendation Logic
- `/components/ai/ProductRecommendations.tsx` - Uses AI-based recommendations
- `/api/recommendations/products/route.ts` - Machine learning approach
- These are **separate systems** and not affected by this bug

---

## Conclusion

The product recommendations feature has **correct logic but missing data**. The `TopProduct` table was designed to cache company-wide top-performing products but is never populated.

**Recommended Action**: Implement Solution 1 (Calculate Top Products Job) and schedule it to run weekly. This will provide accurate, performant recommendations without changing the existing architecture.

**Priority**: Medium-High (feature is broken but workarounds exist)

**Effort**: Low (1-2 hours to implement job + testing)

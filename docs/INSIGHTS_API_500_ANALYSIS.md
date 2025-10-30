# Customer Insights API 500 Error Analysis

## Error Location
**File:** `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/insights/route.ts`
**URL:** `/api/sales/customers/45e226d1-ef1e-47fe-a6ff-d2b51214485a/insights`
**Error:** 500 Internal Server Error

## Root Cause Analysis

### Issue #1: Missing Product Relationship in OrderLine Model ❌

**Problem:** The code attempts to include `product` in the OrderLine query (lines 46-52), but **the OrderLine model does NOT have a direct `product` relation** in the Prisma schema.

**Schema Evidence (lines 462-479):**
```prisma
model OrderLine {
  id                  String          @id @default(uuid()) @db.Uuid
  tenantId            String          @db.Uuid
  orderId             String          @db.Uuid
  skuId               String          @db.Uuid
  quantity            Int
  unitPrice           Decimal         @db.Decimal(10, 2)
  appliedPricingRules Json?
  isSample            Boolean         @default(false)
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  order               Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sku                 Sku             @relation(fields: [skuId], references: [id], onDelete: Cascade)
  tenant              Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  PickSheetItem       PickSheetItem[]

  @@index([tenantId])
}
```

**The OrderLine model only has:**
- ✅ `sku` relation (to Sku model)
- ❌ NO `product` relation

### Issue #2: Incorrect Data Access Pattern

**Current Code (lines 44-54):**
```typescript
orderLines: {
  include: {
    product: {  // ❌ This field doesn't exist!
      select: {
        id: true,
        name: true,
        category: true,
      },
    },
  },
},
```

**What's Happening:**
1. The query tries to include `orderLines.product`
2. Prisma throws an error because `product` is not a valid relation on OrderLine
3. The API returns 500 Internal Server Error

### Issue #3: Product Data Access Through SKU

**Correct Relationship Chain:**
```
OrderLine → sku → product
```

**Schema Evidence (lines 282-310):**
```prisma
model Sku {
  id             String           @id @default(uuid()) @db.Uuid
  tenantId       String           @db.Uuid
  productId      String           @db.Uuid  // ✅ SKU has productId
  // ... other fields
  product        Product          @relation(fields: [productId], references: [id], onDelete: Cascade)  // ✅ SKU has product relation
  // ... other relations
}
```

## The Fix

### Solution 1: Nested Include (Recommended)

Update the query to include product through the sku relationship:

```typescript
orderLines: {
  include: {
    sku: {
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
      },
    },
  },
},
```

### Solution 2: Update Code References

After fixing the query, update all code that accesses product data:

**Current Code (lines 122-128):**
```typescript
order.orderLines.forEach((line) => {
  if (line.product) {  // ❌ Wrong path
    const current = productCounts.get(line.product.id) || { name: line.product.name, count: 0 };
    current.count += 1;
    productCounts.set(line.product.id, current);
  }
});
```

**Should Be:**
```typescript
order.orderLines.forEach((line) => {
  if (line.sku?.product) {  // ✅ Correct path
    const current = productCounts.get(line.sku.product.id) || {
      name: line.sku.product.name,
      count: 0
    };
    current.count += 1;
    productCounts.set(line.sku.product.id, current);
  }
});
```

**Also Update Line 147:**
```typescript
// Current (line 147)
orders.flatMap((o) => o.orderLines.map((l) => l.product?.id).filter(Boolean))

// Should Be
orders.flatMap((o) => o.orderLines.map((l) => l.sku?.product?.id).filter(Boolean))
```

## Additional Considerations

### Null Safety
Even after fixing the query, add null checks because:
1. SKU might not have a product (though schema enforces it via foreign key)
2. Product data might be selectively included

### Performance Impact
The nested include adds one more JOIN to the query. For 50 orders with multiple line items, this could impact performance. Consider:
- Limiting the number of orders analyzed
- Using a separate query to fetch product data
- Caching frequently accessed product information

## Summary

**Error Type:** Runtime Database Query Error
**Severity:** Critical (500 error)
**Cause:** Attempting to include non-existent relation `orderLines.product`
**Fix Complexity:** Low - update query structure and data access paths
**Lines to Change:**
- Line 44-54: Update include statement
- Line 122-128: Update product access path
- Line 147: Update product ID mapping

## Recommended Action

1. Update the Prisma query to use nested include: `orderLines.sku.product`
2. Update all code references from `line.product` to `line.sku.product`
3. Add null safety checks for `line.sku?.product`
4. Test with the failing customer ID: `45e226d1-ef1e-47fe-a6ff-d2b51214485a`
5. Consider adding error handling to catch similar Prisma query errors

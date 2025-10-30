# OrderLine Schema Analysis Report

## Executive Summary

**CRITICAL ISSUE IDENTIFIED**: The API code at `/src/app/api/sales/customers/[customerId]/insights/route.ts` attempts to access `orderLine.product` directly, but according to the Prisma schema, **OrderLine does NOT have a direct relationship to Product**.

## Schema Analysis

### OrderLine Model Definition (Lines 462-479)

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
}
```

### Key Findings

1. **Price Field Name**: ✅ Correctly named `unitPrice` (NOT `price`)
   - Type: `Decimal @db.Decimal(10, 2)`
   - Location: Line 468

2. **Direct Product Relationship**: ❌ **DOES NOT EXIST**
   - OrderLine only has a direct relationship to `Sku`
   - OrderLine does NOT have a `product` field

3. **Relationship Chain**: OrderLine → Sku → Product
   - OrderLine has `sku` relation (line 474)
   - Sku has `product` relation (see Sku model below)

### Sku Model Definition (Lines 282-310)

```prisma
model Sku {
  id             String           @id @default(uuid()) @db.Uuid
  tenantId       String           @db.Uuid
  productId      String           @db.Uuid
  // ... other fields ...
  orderLines     OrderLine[]
  product        Product          @relation(fields: [productId], references: [id], onDelete: Cascade)
  // ... other relations ...
}
```

### Available Fields on OrderLine

- `id` (UUID)
- `tenantId` (UUID)
- `orderId` (UUID)
- `skuId` (UUID)
- `quantity` (Int)
- `unitPrice` (Decimal) ⚠️ Note: NOT "price"
- `appliedPricingRules` (Json?)
- `isSample` (Boolean)
- `createdAt` (DateTime)
- `updatedAt` (DateTime)

### Available Relations on OrderLine

- `order` → Order
- `sku` → Sku
- `tenant` → Tenant
- `PickSheetItem` → PickSheetItem[]

## Problem in API Code

### Location: `/src/app/api/sales/customers/[customerId]/insights/route.ts`

**Lines 44-53** - INCORRECT Include Statement:
```typescript
orderLines: {
  include: {
    product: {  // ❌ WRONG: orderLine does NOT have direct product relation
      select: {
        id: true,
        name: true,
        category: true,
      },
    },
  },
}
```

**Lines 122-128** - Attempting to access non-existent field:
```typescript
order.orderLines.forEach((line) => {
  if (line.product) {  // ❌ WRONG: line.product doesn't exist
    const current = productCounts.get(line.product.id) || { name: line.product.name, count: 0 };
    current.count += 1;
    productCounts.set(line.product.id, current);
  }
});
```

## Correct Include Pattern

### ✅ CORRECT: Access Product Through Sku

```typescript
const orders = await db.order.findMany({
  where: {
    customerId,
    tenantId,
    status: { not: "CANCELLED" },
  },
  include: {
    lines: {
      include: {
        sku: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                category: true,
                brand: true,
              },
            },
          },
        },
      },
    },
  },
  orderBy: {
    deliveredAt: "desc",
  },
  take: 50,
});
```

### ✅ CORRECT: Accessing Product Data in Code

```typescript
orders.forEach((order) => {
  order.lines.forEach((line) => {
    // Access product through sku relation
    if (line.sku?.product) {
      const product = line.sku.product;
      const current = productCounts.get(product.id) || {
        name: product.name,
        count: 0
      };
      current.count += 1;
      productCounts.set(product.id, current);
    }
  });
});
```

## Alternative: Correct Include with Nested Select

```typescript
include: {
  lines: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,  // Note: unitPrice, not price
      isSample: true,
      sku: {
        select: {
          id: true,
          code: true,
          size: true,
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
            },
          },
        },
      },
    },
  },
}
```

## Data Access Pattern

To access product information from an OrderLine:

```typescript
// Given: orderLine from query result
const productId = orderLine.sku.product.id;
const productName = orderLine.sku.product.name;
const productCategory = orderLine.sku.product.category;
const productBrand = orderLine.sku.product.brand;

// SKU information is also available:
const skuCode = orderLine.sku.code;
const skuSize = orderLine.sku.size;

// OrderLine information:
const lineQuantity = orderLine.quantity;
const lineUnitPrice = orderLine.unitPrice;  // NOT .price
const lineIsSample = orderLine.isSample;
```

## Impact Analysis

### Files That Need Review

1. ✅ `/src/app/api/sales/customers/[customerId]/insights/route.ts` - **CONFIRMED ISSUE**
   - Lines 44-53: Include statement needs correction
   - Lines 122-128: Product access needs correction
   - Lines 146-148: Product access needs correction

2. ⚠️ Any other files that query OrderLine with product data should be reviewed

### Potential Runtime Errors

- TypeScript compilation may fail if strict type checking is enabled
- Runtime errors when trying to access `line.product` (undefined)
- Empty product arrays in insights response
- "Cannot read property 'id' of undefined" errors

## Recommendations

1. **Immediate Action**: Fix the include statement in insights route
2. **Code Review**: Search codebase for other instances of `orderLine.product`
3. **Type Safety**: Ensure TypeScript types are generated from Prisma schema
4. **Testing**: Add integration tests that verify product data access
5. **Documentation**: Update API documentation to reflect correct data structure

## SQL Query Reference

If using raw SQL queries, the relationship is:

```sql
SELECT
  ol.id as order_line_id,
  ol.quantity,
  ol."unitPrice",  -- Note the quotes and capitalization
  s.code as sku_code,
  p.name as product_name,
  p.brand as product_brand,
  p.category as product_category
FROM "OrderLine" ol
JOIN "Sku" s ON ol."skuId" = s.id
JOIN "Product" p ON s."productId" = p.id
WHERE ol."orderId" = 'some-order-id';
```

## Conclusion

**The correct way to access product information from an OrderLine is:**
- OrderLine → (via `sku` relation) → Sku → (via `product` relation) → Product

**NOT:**
- OrderLine → (direct `product` relation) ❌ This does not exist

**Field Name:**
- Use `unitPrice`, NOT `price` ✅

---

**Generated**: 2025-10-27
**Schema File**: `/Users/greghogue/Leora2/web/prisma/schema.prisma`
**Issue Location**: `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/insights/route.ts`

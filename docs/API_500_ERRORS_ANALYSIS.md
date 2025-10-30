# API 500 Error Analysis - Product History Endpoint

## Error Details
- **Endpoint**: `/api/sales/customers/[customerId]/product-history`
- **URL**: `/api/sales/customers/45e226d1-ef1e-47fe-a6ff-d2b51214485a/product-history?type=timeline`
- **Status**: 500 Internal Server Error
- **Affected Query Types**: Both `type=timeline` and `type=breakdown`

## Root Cause

The API route is attempting to include a `product` relation directly on `OrderLine`, but according to the Prisma schema, **OrderLine does not have a direct relation to Product**.

### Schema Analysis

```prisma
model OrderLine {
  id                  String          @id @default(uuid()) @db.Uuid
  tenantId            String          @db.Uuid
  orderId             String          @db.Uuid
  skuId               String          @db.Uuid  // ← Only has SKU relation
  quantity            Int
  unitPrice           Decimal         @db.Decimal(10, 2)
  // ...
  order               Order           @relation(...)
  sku                 Sku             @relation(...)  // ← Product is through sku.product
  tenant              Tenant          @relation(...)
}

model Sku {
  id             String           @id @default(uuid()) @db.Uuid
  tenantId       String           @db.Uuid
  productId      String           @db.Uuid
  // ...
  product        Product          @relation(...)  // ← Product relation is here
  orderLines     OrderLine[]
}
```

The relationship chain is: **OrderLine → Sku → Product**

## Issues Found

### Issue 1: Invalid Include Statement (Lines 35-42, 154-160)
**Location**: `/Users/greghogue/Leora2/web/src/app/api/sales/customers/[customerId]/product-history/route.ts`

**Current Code**:
```typescript
include: {
  product: {  // ← ERROR: OrderLine has no 'product' relation
    select: {
      id: true,
      name: true,
      sku: true,
    },
  },
  order: {
    select: {
      deliveredAt: true,
      createdAt: true,
    },
  },
},
```

**Problem**: Prisma will throw an error because `product` is not a valid relation on `OrderLine`.

### Issue 2: Accessing Non-Existent Field (Lines 70-71, 178-179)
**Current Code**:
```typescript
const productId = line.product?.id || "unknown";
const productName = line.product?.name || "Unknown Product";
```

**Problem**: `line.product` will be `undefined` because the include failed, causing potential runtime errors.

### Issue 3: Field Name Issues
The code correctly uses `line.unitPrice` (lines 73, 197), which matches the schema field name. **This is NOT an issue.**

## Recommended Fixes

### Fix 1: Update Include Statements

**For `type=breakdown` (lines 27-55)**:
```typescript
const orderLines = await db.orderLine.findMany({
  where: {
    order: {
      customerId,
      tenantId,
      status: { not: "CANCELLED" },
    },
  },
  include: {
    sku: {  // ← Changed from 'product' to 'sku'
      select: {
        id: true,
        code: true,
        product: {  // ← Access product through sku
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    order: {
      select: {
        deliveredAt: true,
        createdAt: true,
      },
    },
  },
  orderBy: {
    order: {
      deliveredAt: "desc",
    },
  },
});
```

**For `type=timeline` (lines 142-168)**:
```typescript
const orderLines = await db.orderLine.findMany({
  where: {
    order: {
      customerId,
      tenantId,
      status: { not: "CANCELLED" },
      OR: [
        { deliveredAt: { gte: startDate } },
        { createdAt: { gte: startDate } },
      ],
    },
  },
  include: {
    sku: {  // ← Changed from 'product' to 'sku'
      select: {
        id: true,
        code: true,
        product: {  // ← Access product through sku
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    order: {
      select: {
        deliveredAt: true,
        createdAt: true,
      },
    },
  },
});
```

### Fix 2: Update Data Access Logic

**For `type=breakdown` (lines 69-88)**:
```typescript
for (const line of orderLines) {
  // Changed to access product through sku
  const productId = line.sku?.product?.id || "unknown";
  const productName = line.sku?.product?.name || "Unknown Product";
  const orderDate = line.order.deliveredAt || line.order.createdAt;
  const revenue = Number(line.quantity) * Number(line.unitPrice);

  if (!productMap.has(productId)) {
    productMap.set(productId, {
      productId,
      productName,
      orders: [],
      totalRevenue: 0,
      totalOrders: 0,
    });
  }

  const product = productMap.get(productId)!;
  product.orders.push({ date: orderDate, revenue });
  product.totalRevenue += revenue;
}
```

**For `type=timeline` (lines 177-198)**:
```typescript
for (const line of orderLines) {
  // Changed to access product through sku
  const productId = line.sku?.product?.id || "unknown";
  const productName = line.sku?.product?.name || "Unknown Product";
  const orderDate = line.order.deliveredAt || line.order.createdAt;
  const monthIndex = months.findIndex(
    (m) =>
      orderDate >= m &&
      orderDate < new Date(m.getFullYear(), m.getMonth() + 1, 1)
  );

  if (monthIndex === -1) continue;

  if (!productTimeline.has(productId)) {
    productTimeline.set(productId, {
      name: productName,
      data: new Array(months.length).fill(0),
    });
  }

  const product = productTimeline.get(productId)!;
  product.data[monthIndex] += Number(line.quantity) * Number(line.unitPrice);
}
```

## Summary of Changes

1. **Include Statement**: Change from `product: { ... }` to `sku: { select: { product: { ... } } }`
2. **Data Access**: Change from `line.product?.id` to `line.sku?.product?.id`
3. **Data Access**: Change from `line.product?.name` to `line.sku?.product?.name`

## Testing Recommendations

After applying fixes:
1. Test with `?type=breakdown` parameter
2. Test with `?type=timeline` parameter
3. Test with a customer that has:
   - Multiple orders with different products
   - Orders with null/missing SKU data (edge case)
   - Recent orders (within last 12 months for timeline)

## Additional Observations

- The `unitPrice` field is correctly referenced (no issue)
- The date-fns functions (`subMonths`, `eachMonthOfInterval`, `format`) are being used correctly
- The field names match the Prisma schema correctly
- The null-safe operators (`?.`) are being used appropriately for optional fields

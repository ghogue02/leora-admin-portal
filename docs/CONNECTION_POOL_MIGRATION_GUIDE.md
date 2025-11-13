# Connection Pool Fix - Migration Guide for API Handlers

## Overview

This guide helps you update API route handlers to work correctly with the optimized authentication system that fixes connection pool timeouts.

## What Changed?

### Before (Connection Pool Issues)

**Every request held a database connection for the entire request duration**:

```typescript
// ❌ OLD: Entire handler ran inside a long transaction
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // db is a TransactionClient - holding connection for entire request
    const customers = await db.customer.findMany({ where: { tenantId } });
    return NextResponse.json(customers);
  });
}
```

**Problems**:
- Authentication queries in transaction (1-10 seconds)
- Handler execution in transaction (1-60 seconds)
- Only 17 concurrent requests supported before timeout
- `P2024` errors: "Timed out fetching connection from pool"

### After (Optimized)

**Authentication uses quick queries, handlers decide if they need transactions**:

```typescript
// ✅ NEW: Authentication is fast, handler gets prisma client
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // db is PrismaClient - handler decides if it needs a transaction
    const customers = await db.customer.findMany({ where: { tenantId } });
    return NextResponse.json(customers);
  });
}
```

**Benefits**:
- Authentication: 50-100ms (no transaction)
- Read operations: 10-50ms (direct queries)
- Write operations: 100-500ms (transaction only when needed)
- Supports 100+ concurrent requests
- Zero connection pool timeouts

## Do I Need to Update My Handler?

### No Changes Needed ✅

**Your handler is safe if it ONLY reads data**:

```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ✅ Read-only queries work as-is
    const data = await db.someModel.findMany({ where: { tenantId } });
    return NextResponse.json(data);
  });
}
```

### Changes Required ⚠️

**Your handler needs updates if it writes data**:

```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ⚠️ Write operations need explicit transaction for RLS
    const data = await request.json();
    const result = await db.someModel.create({ data: { ...data, tenantId } });
    return NextResponse.json(result);
  });
}
```

**Fix**: Wrap writes in `withTenant` for proper RLS context:

```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // ✅ Wrap write in withTenant for RLS
    const result = await withTenant(tenantId, async (tx) => {
      return tx.someModel.create({ data: { ...data, tenantId } });
    });

    return NextResponse.json(result);
  });
}
```

## Migration Patterns

### Pattern 1: Simple Read Operations

**Status**: ✅ No changes needed

```typescript
// Read-only queries work as-is
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const customers = await db.customer.findMany({
      where: { tenantId },
      include: { orders: true },
    });
    return NextResponse.json(customers);
  });
}
```

### Pattern 2: Single Write Operation

**Status**: ⚠️ Add `withTenant` wrapper

**Before**:
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();
    const customer = await db.customer.create({
      data: { ...data, tenantId }
    });
    return NextResponse.json(customer);
  });
}
```

**After**:
```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // ✅ Wrap write in withTenant
    const customer = await withTenant(tenantId, async (tx) => {
      return tx.customer.create({
        data: { ...data, tenantId }
      });
    });

    return NextResponse.json(customer);
  });
}
```

### Pattern 3: Update Operation

**Status**: ⚠️ Add `withTenant` wrapper

**Before**:
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();
    const customer = await db.customer.update({
      where: { id: params.id, tenantId },
      data,
    });
    return NextResponse.json(customer);
  });
}
```

**After**:
```typescript
import { withTenant } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // ✅ Wrap update in withTenant
    const customer = await withTenant(tenantId, async (tx) => {
      return tx.customer.update({
        where: { id: params.id, tenantId },
        data,
      });
    });

    return NextResponse.json(customer);
  });
}
```

### Pattern 4: Delete Operation

**Status**: ⚠️ Add `withTenant` wrapper

**Before**:
```typescript
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    await db.customer.delete({
      where: { id: params.id, tenantId }
    });
    return NextResponse.json({ success: true });
  });
}
```

**After**:
```typescript
import { withTenant } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ✅ Wrap delete in withTenant
    await withTenant(tenantId, async (tx) => {
      await tx.customer.delete({
        where: { id: params.id, tenantId }
      });
    });

    return NextResponse.json({ success: true });
  });
}
```

### Pattern 5: Multi-Step Write (Transaction Required)

**Status**: ⚠️ Wrap ALL writes in single `withTenant`

**Before**:
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // Multiple writes - need transactional consistency
    const order = await db.order.create({
      data: { ...data, tenantId }
    });

    // Update inventory
    for (const item of data.items) {
      await db.inventory.update({
        where: { skuId: item.skuId, tenantId },
        data: { quantity: { decrement: item.quantity } }
      });
    }

    // Create invoice
    const invoice = await db.invoice.create({
      data: { orderId: order.id, tenantId }
    });

    return NextResponse.json({ order, invoice });
  });
}
```

**After**:
```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // ✅ Wrap ALL writes in single transaction
    const result = await withTenant(tenantId, async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: { ...data, tenantId }
      });

      // Update inventory
      for (const item of data.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId, tenantId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      // Create invoice
      const invoice = await tx.invoice.create({
        data: { orderId: order.id, tenantId }
      });

      return { order, invoice };
    });

    return NextResponse.json(result);
  });
}
```

### Pattern 6: Mixed Read/Write Operations

**Status**: ⚠️ Wrap only writes in `withTenant`

**Before**:
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db, session }) => {
    const data = await request.json();

    // Read existing data
    const existing = await db.customer.findUnique({
      where: { id: data.customerId, tenantId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Create activity
    const activity = await db.activity.create({
      data: {
        ...data,
        tenantId,
        userId: session.userId,
      }
    });

    return NextResponse.json(activity);
  });
}
```

**After**:
```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db, session }) => {
    const data = await request.json();

    // ✅ Read operations outside transaction (fast)
    const existing = await db.customer.findUnique({
      where: { id: data.customerId, tenantId }
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // ✅ Only write operations in transaction
    const activity = await withTenant(tenantId, async (tx) => {
      return tx.activity.create({
        data: {
          ...data,
          tenantId,
          userId: session.userId,
        }
      });
    });

    return NextResponse.json(activity);
  });
}
```

### Pattern 7: Export/Long-Running Operations

**Status**: ✅ No transaction needed (reads only)

```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ✅ Long-running read operations don't need transactions
    const customers = await db.customer.findMany({
      where: { tenantId },
      include: {
        orders: { include: { items: true } },
        activities: true,
        contacts: true,
      }
    });

    // Generate CSV (this might take 10-60 seconds)
    const csv = generateCSV(customers);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="customers.csv"'
      }
    });
  });
}
```

**Note**: Export operations benefit the most from this fix - they no longer hold connections for 10-60 seconds!

## Testing Your Changes

After updating a handler, test it:

### 1. Basic Functionality Test

```bash
# Test your endpoint
curl -X POST http://localhost:3002/api/your/endpoint \
  -H "Cookie: sales-session-id=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

**Check**:
- ✅ Returns expected response
- ✅ Data persisted correctly
- ✅ No errors in logs

### 2. Verify No Connection Timeouts

```bash
# Watch for connection pool errors
tail -f /tmp/dev-server.log | grep -E "(Timed out|connection pool)"
```

**Expected**: No output (no errors)

### 3. Check Transaction Integrity

For multi-step writes, verify atomicity:

```bash
# Test failure scenario (e.g., invalid data)
curl -X POST http://localhost:3002/api/your/endpoint \
  -H "Cookie: sales-session-id=YOUR_SESSION" \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'
```

**Check**:
- ✅ No partial data committed
- ✅ All-or-nothing behavior preserved

### 4. Verify RLS Still Works

```bash
# Try to access data from different tenant
curl -X GET http://localhost:3002/api/your/endpoint/OTHER_TENANT_RESOURCE \
  -H "Cookie: sales-session-id=YOUR_SESSION"
```

**Expected**: 404 Not Found (RLS filtering works)

## Common Issues & Solutions

### Issue 1: "RLS policy violation" Error

**Symptom**: Write operations failing with RLS errors

**Cause**: Not using `withTenant` for write operations

**Solution**: Wrap writes in `withTenant`:

```typescript
import { withTenant } from "@/lib/prisma";

const result = await withTenant(tenantId, async (tx) => {
  return tx.model.create({ data: { ...data, tenantId } });
});
```

### Issue 2: Partial Data Commits

**Symptom**: Some writes succeed, others fail

**Cause**: Multiple writes not wrapped in single transaction

**Solution**: Wrap ALL related writes in one `withTenant`:

```typescript
const result = await withTenant(tenantId, async (tx) => {
  const step1 = await tx.model1.create({ ... });
  const step2 = await tx.model2.update({ ... });
  return { step1, step2 };
});
```

### Issue 3: Still Getting Connection Timeouts

**Symptom**: P2024 errors still occurring

**Possible Causes**:
1. Another handler still using old pattern
2. External service call inside transaction
3. Very slow query

**Solution**:
- Find and update all write handlers
- Move external calls outside transaction
- Optimize slow queries

## Bulk Migration Script

To help find handlers that need updates:

```bash
# Find all API route files
find src/app/api -name "route.ts" -type f

# Search for write operations that might need withTenant
grep -r "\.create\|\.update\|\.delete" src/app/api/*/route.ts

# Check which handlers use withSalesSession
grep -l "withSalesSession" src/app/api/*/route.ts | wc -l
```

## Verification Checklist

After migrating your handler:

- [ ] Import `withTenant` from `@/lib/prisma`
- [ ] Read operations use `db` directly (no transaction)
- [ ] Single writes wrapped in `withTenant`
- [ ] Multi-step writes wrapped in single `withTenant`
- [ ] Tested basic functionality
- [ ] Verified no connection pool errors
- [ ] Verified transaction integrity (for writes)
- [ ] Verified RLS still enforces tenant isolation
- [ ] Response times improved (< 1s)

## Need Help?

If you encounter issues during migration:

1. Check [CONNECTION_POOL_TEST.md](testing/CONNECTION_POOL_TEST.md) for testing guidance
2. Review [CONNECTION_POOL_TIMEOUT_ANALYSIS.md](CONNECTION_POOL_TIMEOUT_ANALYSIS.md) for context
3. Ask the development team for assistance

## Summary

**Read operations**: No changes needed ✅
**Write operations**: Add `withTenant` wrapper ⚠️
**Benefits**: 10-100x faster, supports 100+ concurrent users ✅

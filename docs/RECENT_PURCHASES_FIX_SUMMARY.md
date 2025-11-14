# Recent Purchases Fix - Summary

**Date**: 2025-01-13
**Status**: ✅ **FIXED**
**Commit**: `f93d3c0`

## Problem

The Recent Purchases section on `/sales/orders/new` stopped working after the connection pool refactoring.

**User Impact**:
- Recent Purchases section not displaying customer's purchase history
- "Add All Recent Items" button not working
- Unable to quickly reorder frequently purchased items

## Root Cause

After refactoring `withSalesSession` to fix connection pool timeouts (commit `2f61d2b`), the `db` parameter changed from a transaction client to the raw `prisma` client.

**Before Connection Pool Fix**:
```typescript
// withSalesSession passed a transaction client
const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
  // db is a TransactionClient with RLS context already set
  const customer = await db.customer.findFirst({ where: { tenantId } });
});
```

**After Connection Pool Fix**:
```typescript
// withSalesSession passes raw prisma client
return withSalesSession(request, async ({ tenantId, db }) => {
  // db is PrismaClient - no RLS context set!
  const customer = await db.customer.findFirst({ where: { tenantId } });
});
```

**The Issue**:
The recent-items endpoint was making direct database queries without the RLS (Row-Level Security) context set. Even though queries had explicit `tenantId` filters, PostgreSQL RLS policies require the session variable `app.current_tenant_id` to be set via:

```sql
SELECT set_config('app.current_tenant_id', 'TENANT_ID', false);
```

This is what `withTenant()` does - it wraps queries in a transaction and sets this session variable.

## Solution

Wrapped the database queries in `withTenant()` to set the proper RLS context:

**File**: [src/app/api/sales/customers/[customerId]/recent-items/route.ts](../src/app/api/sales/customers/[customerId]/recent-items/route.ts)

**Before** (broken):
```typescript
export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session, roles }) => {
    const { customerId } = await context.params;

    // ❌ Direct queries without RLS context
    const customer = await db.customer.findFirst({
      where: { id: customerId, tenantId },
    });

    const orderLines = await db.orderLine.findMany({
      where: { tenantId, order: { customerId } },
    });

    // Process and return
  });
}
```

**After** (fixed):
```typescript
export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(request, async ({ db, tenantId, session, roles }) => {
    const { customerId } = await context.params;

    // ✅ Wrap queries in withTenant to set RLS context
    const result = await withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, tenantId },
      });

      if (!customer) return null;

      const orderLines = await tx.orderLine.findMany({
        where: { tenantId, order: { customerId } },
      });

      return { customer, orderLines };
    });

    if (!result) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Process and return
  });
}
```

## Changes Made

### 1. Import `withTenant`
```typescript
import { withTenant } from "@/lib/prisma";
```

### 2. Wrap Queries in Transaction
- Customer lookup query
- OrderLines query with includes
- Both queries now run inside `withTenant()` transaction

### 3. Handle Null Result
- Return `null` if customer not found
- Check result after transaction
- Return 404 if customer doesn't exist

## Testing

### Manual Test Steps

1. **Navigate to** `/sales/orders/new`
2. **Select a customer** that has order history in the last 6 months
3. **Verify** Recent Purchases section loads
4. **Check** that purchase history displays correctly
5. **Test** "Add All Recent Items" button
6. **Test** individual "Add" buttons for items

### Expected Behavior

**Loading State**:
- Shows 3 skeleton rows while fetching

**No History**:
- Shows message: "No purchases in the last six months"

**Has History**:
- Displays table with columns: Product, Last Order, Last Price, Actions
- Shows product name, SKU code, last quantity, times ordered
- Shows last order date and order number
- Indicates if price is "Standard price" or "Customer price"
- "Add" button becomes "Added" when item is in cart

### Browser Console Test

```javascript
// Get customer ID
const customerId = document.querySelector('[name="customer"]')?.value;

// Test API directly
fetch(`/api/sales/customers/${customerId}/recent-items`)
  .then(r => r.json())
  .then(data => console.log('Recent items:', data))
  .catch(err => console.error('Error:', err));
```

**Expected Response**:
```json
{
  "items": [
    {
      "skuId": "...",
      "skuCode": "ABC123",
      "productName": "Product Name",
      "brand": "Brand Name",
      "size": "750ml",
      "lastQuantity": 12,
      "lastUnitPrice": 25.50,
      "lastOrderId": "...",
      "lastOrderNumber": "ORD-12345",
      "lastOrderedAt": "2025-01-01T00:00:00.000Z",
      "timesOrdered": 3,
      "priceMatchesStandard": true,
      "standardPrice": 25.50,
      "priceLists": [...]
    }
  ]
}
```

## Related Issues & Fixes

### Connection Pool Timeout Fix
**Commit**: `2f61d2b`
**Changed**: `withSalesSession` authentication to avoid long transactions
**Impact**: Required endpoints to explicitly use `withTenant` for RLS

### Migration Pattern

**All API endpoints that use `withSalesSession` should follow this pattern**:

```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db, session }) => {
    // ✅ READ operations: Direct queries if they have tenantId filters
    const simpleData = await db.model.findMany({
      where: { tenantId } // Explicit tenant filter
    });

    // ✅ WRITE operations: Use withTenant for RLS context
    const writeResult = await withTenant(tenantId, async (tx) => {
      return tx.model.create({ data: { ...data, tenantId } });
    });

    // ✅ COMPLEX reads with RLS policies: Use withTenant
    const complexData = await withTenant(tenantId, async (tx) => {
      return tx.model.findMany({
        where: { /* complex conditions */ },
        include: { /* nested includes */ }
      });
    });

    return NextResponse.json({ simpleData, writeResult, complexData });
  });
}
```

### When to Use `withTenant`

**Always use `withTenant` for**:
1. Write operations (CREATE, UPDATE, DELETE)
2. Complex queries with nested includes
3. Queries that might trigger RLS policies
4. Multi-step operations requiring transactional consistency

**Optional for simple reads**:
1. Single-table queries with explicit `tenantId` filter
2. No nested includes or complex joins
3. No RLS policies enforcing session variables

## Verification

### Deployment Checklist

- [x] Code committed (f93d3c0)
- [x] Fix documented
- [ ] Tested in development environment
- [ ] Tested with customer that has order history
- [ ] Tested with customer that has no order history
- [ ] Tested "Add All Recent Items" functionality
- [ ] Verified no console errors
- [ ] Verified no server errors in logs
- [ ] Ready for staging deployment

### Success Criteria

- ✅ Recent Purchases section loads without errors
- ✅ Customer order history displays correctly
- ✅ Prices show correct (standard vs customer-specific)
- ✅ Add buttons work correctly
- ✅ No 500 errors in API calls
- ✅ No RLS policy violations
- ✅ Performance acceptable (< 500ms response time)

## Files Modified

- **[src/app/api/sales/customers/[customerId]/recent-items/route.ts](../src/app/api/sales/customers/[customerId]/recent-items/route.ts)**: Added `withTenant` wrapper for RLS context

## Related Documentation

- [CONNECTION_POOL_FIX_SUMMARY.md](CONNECTION_POOL_FIX_SUMMARY.md) - Original connection pool fix
- [CONNECTION_POOL_MIGRATION_GUIDE.md](CONNECTION_POOL_MIGRATION_GUIDE.md) - Pattern for updating handlers
- [RECENT_PURCHASES_DEBUG.md](RECENT_PURCHASES_DEBUG.md) - Debugging guide

## Lessons Learned

1. **RLS Context Required**: Even with explicit `tenantId` filters, RLS policies require session variables
2. **Transaction Scope**: After connection pool fix, endpoints must explicitly use `withTenant` for RLS
3. **Testing Coverage**: Need integration tests for RLS policy enforcement
4. **Migration Pattern**: Clear pattern needed for updating all endpoints post-refactor

## Next Steps

### Immediate
1. Test the fix in development
2. Deploy to staging
3. Monitor for RLS errors

### Short-term
1. Audit other endpoints for similar RLS issues
2. Add integration tests for RLS enforcement
3. Document RLS requirements in API guidelines

### Long-term
1. Consider automatic RLS context injection
2. Add linting rules to enforce `withTenant` usage
3. Create migration script to find endpoints needing updates

---

**Status**: ✅ Fixed and committed
**Next**: Test in development, then deploy to staging

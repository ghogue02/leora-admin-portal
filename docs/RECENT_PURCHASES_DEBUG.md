# Recent Purchases - Debugging Guide

## Issue

The Recent Purchases section on `/sales/orders/new` doesn't appear to work after the connection pool fix.

## Investigation

### 1. Component Structure

**File**: [src/app/sales/orders/new/page.tsx](../src/app/sales/orders/new/page.tsx)

**Lines 140-144**: Uses `useRecentItems` hook
```typescript
const {
  items: recentItems,
  loading: recentItemsLoading,
  error: recentItemsError,
} = useRecentItems(selectedCustomerId || null);
```

**Lines 1196-1302**: Renders Recent Purchases section
- Shows loading skeleton while `recentItemsLoading === true`
- Shows error message if `recentItemsError` is set
- Shows "No purchases" message if `recentItems.length === 0`
- Shows table with items if `recentItems.length > 0`

### 2. Hook Implementation

**File**: [src/app/sales/orders/new/hooks/useRecentItems.ts](../src/app/sales/orders/new/hooks/useRecentItems.ts)

**Lines 23-69**: Effect that fetches data
```typescript
useEffect(() => {
  if (!customerId) {
    setItems([]);
    setError(null);
    setLoading(false);
    return;
  }

  // Fetches from: /api/sales/customers/${customerId}/recent-items
  const response = await fetch(`/api/sales/customers/${customerId}/recent-items`, {
    cache: 'no-store',
    signal: controller.signal,
  });
}, [customerId, refreshToken]);
```

### 3. API Endpoint

**File**: [src/app/api/sales/customers/[customerId]/recent-items/route.ts](../src/app/api/sales/customers/[customerId]/recent-items/route.ts)

**Authentication**: Uses `withSalesSession` (recently refactored)

**Database Queries**:
1. **Lines 33-46**: Get customer with explicit `tenantId` filter
2. **Lines 54-111**: Get order lines with explicit `tenantId` filter

**Both queries include `tenantId` filter**, so they should work with the refactored `withSalesSession` that now passes the raw `prisma` client instead of a transaction client.

## Possible Issues

### Issue 1: RLS Context Not Set

**Problem**: After refactoring `withSalesSession`, the `db` parameter is now the raw `prisma` client without RLS context.

**Impact**: If the database has RLS policies that require `app.current_tenant_id` to be set, queries will fail or return no results.

**Solution**: The queries have explicit `tenantId` filters, so this shouldn't be an issue UNLESS there are RLS policies enforcing it at the database level.

**Check**:
```sql
-- Check if RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('Order', 'OrderLine', 'Customer');
```

### Issue 2: Query Returns No Results

**Problem**: The query might be correctly filtered by `tenantId`, but returns no results for the test customer.

**Check**:
1. Does the customer have any orders in the last 6 months?
2. Are those orders in a non-CANCELLED status?
3. Do the order lines have associated SKUs and products?

**Test Query**:
```sql
SELECT COUNT(*) as order_count
FROM "Order" o
WHERE o."customerId" = 'TEST_CUSTOMER_ID'
  AND o."tenantId" = 'TEST_TENANT_ID'
  AND o."orderedAt" >= NOW() - INTERVAL '6 months'
  AND o."status" != 'CANCELLED';
```

### Issue 3: Frontend Not Calling API

**Problem**: The `useRecentItems` hook might not be executing because `selectedCustomerId` is null or empty.

**Check**: Look at browser Network tab when selecting a customer:
1. Open Developer Tools → Network tab
2. Select a customer in the order form
3. Look for request to `/api/sales/customers/{id}/recent-items`
4. Check if request is made
5. Check response status and body

### Issue 4: Session/Auth Issue

**Problem**: After the connection pool fix, there might be an authentication issue preventing the API call from succeeding.

**Check**: Look for 401/403 errors in browser Network tab or server logs

**Test**:
```bash
# Check logs for authentication errors
tail -100 /tmp/dev-server.log | grep -i "recent-items"
```

## Testing Steps

### Step 1: Check If Hook Is Called

Add console logs to `useRecentItems.ts`:

```typescript
useEffect(() => {
  console.log('[useRecentItems] Effect triggered', {
    customerId,
    refreshToken
  });

  if (!customerId) {
    console.log('[useRecentItems] No customerId, skipping fetch');
    // ...
    return;
  }

  async function loadRecentItems() {
    console.log('[useRecentItems] Starting fetch for customer:', customerId);
    setLoading(true);
    // ...
  }
}, [customerId, refreshToken]);
```

### Step 2: Check API Response

In browser console after selecting a customer:

```javascript
// Get the selected customer ID from the page
const customerId = document.querySelector('[id="customer"]')?.value;

// Manually fetch recent items
fetch(`/api/sales/customers/${customerId}/recent-items`)
  .then(r => r.json())
  .then(data => console.log('Recent items:', data))
  .catch(err => console.error('Error:', err));
```

### Step 3: Check Database Directly

Using Prisma Studio or direct SQL:

```typescript
// In a test script
import { prisma } from '@/lib/prisma';

const customerId = 'TEST_CUSTOMER_ID';
const tenantId = 'TEST_TENANT_ID';
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const orderLines = await prisma.orderLine.findMany({
  where: {
    tenantId,
    order: {
      customerId,
      orderedAt: { gte: sixMonthsAgo },
      status: { not: "CANCELLED" },
    },
  },
  include: {
    order: {
      select: {
        id: true,
        orderNumber: true,
        orderedAt: true,
      },
    },
    sku: {
      select: {
        id: true,
        code: true,
        // ...
      },
    },
  },
});

console.log(`Found ${orderLines.length} order lines for customer ${customerId}`);
```

## Expected Behavior

When a customer is selected on `/sales/orders/new`:

1. **useRecentItems hook** should detect `selectedCustomerId` change
2. **Fetch request** should be made to `/api/sales/customers/{id}/recent-items`
3. **API endpoint** should:
   - Validate session with `withSalesSession`
   - Query customer and verify access
   - Query order lines from last 6 months
   - Aggregate and return items
4. **Component** should render:
   - Loading skeleton while `loading === true`
   - Error message if `error !== null`
   - "No purchases" if `items.length === 0`
   - Table of items if `items.length > 0`

## Quick Fix (If RLS Is The Issue)

If the issue is that RLS context is required, wrap the queries in `withTenant`:

```typescript
export async function GET(request: NextRequest, context: RouteContext) {
  return withSalesSession(
    request,
    async ({ db, tenantId, session, roles }) => {
      const { customerId } = await context.params;
      // ... auth checks ...

      // ✅ Wrap queries in withTenant for RLS context
      const result = await withTenant(tenantId, async (tx) => {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId, /* ... */ },
          select: { /* ... */ },
        });

        if (!customer) {
          return null;
        }

        const orderLines = await tx.orderLine.findMany({
          where: { tenantId, order: { customerId, /* ... */ } },
          include: { /* ... */ },
        });

        return { customer, orderLines };
      });

      if (!result) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }

      // Aggregate and return
      const items = aggregateRecentOrderLines(/* ... */);
      return NextResponse.json({ items });
    },
  );
}
```

## Next Steps

1. Check browser Network tab when selecting a customer
2. Look for `/recent-items` API call
3. Check response status and body
4. If 500 error, check server logs for database errors
5. If 200 but no items, check database for order history
6. If no API call at all, check if `selectedCustomerId` is being set

## Related Files

- [src/app/sales/orders/new/page.tsx](../src/app/sales/orders/new/page.tsx#L140-L144) - Component usage
- [src/app/sales/orders/new/hooks/useRecentItems.ts](../src/app/sales/orders/new/hooks/useRecentItems.ts) - Fetch hook
- [src/app/api/sales/customers/[customerId]/recent-items/route.ts](../src/app/api/sales/customers/[customerId]/recent-items/route.ts) - API endpoint
- [src/lib/auth/sales.ts](../src/lib/auth/sales.ts) - Authentication (recently refactored)

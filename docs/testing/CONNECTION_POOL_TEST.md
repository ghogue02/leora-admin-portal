# Connection Pool Fix - Testing Guide

## Implementation Status

✅ **DEPLOYED**: Optimized `withSalesSession` authentication (2025-01-13)

### Changes Made

1. **[src/lib/auth/sales.ts](../../src/lib/auth/sales.ts)**: Refactored authentication to avoid long-running transactions
2. Added `getTenantIdFromRequest()` helper for fast tenant resolution
3. Authentication queries now run directly against prisma client (no transaction wrapper)
4. Handlers receive prisma client and can create transactions only when needed

## Testing the Fix

### Quick Verification

**Server Status**: Dev server running on http://localhost:3002

**Look for these improvements in logs**:
- ✅ No "Timed out fetching connection" errors
- ✅ Authentication completes in < 200ms (was 1000-10000ms)
- ✅ Only write operations create transactions

### Test Scenarios

#### 1. Read-Only Endpoint Test (No Transaction Needed)

**Endpoint**: `GET /api/sales/customers`

**Expected Behavior**:
- No transaction created for authentication
- Query completes in < 200ms
- No connection pool timeouts

**Test**:
```bash
# Login first to get session cookie
# Then test customer list endpoint
curl -X GET http://localhost:3002/api/sales/customers \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
  -w "\nTime: %{time_total}s\n"
```

**Success Criteria**:
- Response time < 0.5s
- No P2024 errors in logs
- Log shows: "✅ [withSalesSession] Session validated successfully"

#### 2. Write Endpoint Test (Uses Transaction Properly)

**Endpoint**: `POST /api/sales/activities/quick-log`

**Expected Behavior**:
- Authentication: Quick queries, no transaction (~100ms)
- Business logic: Uses `withTenant` for write (~200ms)
- Total time: < 500ms

**Test**:
```bash
curl -X POST http://localhost:3002/api/sales/activities/quick-log \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"customerId":"...","activityType":"CALL","notes":"Test"}' \
  -w "\nTime: %{time_total}s\n"
```

**Success Criteria**:
- Response time < 1s
- No connection pool timeouts
- Write operation completes successfully

#### 3. Concurrent Load Test

**Test Multiple Requests Simultaneously**:

```bash
# Test with 20 concurrent requests (was failing at 17+ before)
for i in {1..20}; do
  curl -X GET http://localhost:3002/api/sales/dashboard \
    -H "Cookie: sales-session-id=YOUR_SESSION_ID" \
    -o /dev/null -s -w "%{http_code} %{time_total}s\n" &
done
wait
```

**Success Criteria**:
- All requests return 200 OK (not 500)
- No "connection pool timeout" errors in logs
- Average response time < 1s

#### 4. Monitor Connection Pool Usage

**Watch logs for connection issues**:
```bash
tail -f /tmp/dev-server.log | grep -E "(Timed out|connection pool|prisma:error)"
```

**Before fix** (expected errors):
```
prisma:error Timed out fetching a new connection from the connection pool
connection limit: 17
timeout: 10
```

**After fix** (should be silent):
```
(no errors)
```

## Performance Metrics

### Before Fix

| Metric | Value |
|--------|-------|
| Auth query time | 1,000-10,000ms (in transaction) |
| Concurrent capacity | 17 users (hard limit) |
| Connection hold time | 1-60 seconds |
| Timeout errors | Frequent (every 18+ concurrent requests) |

### After Fix (Expected)

| Metric | Value |
|--------|-------|
| Auth query time | 50-100ms (no transaction) |
| Concurrent capacity | 100+ users |
| Connection hold time | 10-50ms (quick queries) |
| Timeout errors | Zero |

## RLS Policy Verification

**IMPORTANT**: Verify Row-Level Security still works correctly.

The fix changes how tenant context is passed to queries. We must ensure RLS policies still enforce tenant isolation.

### Test RLS Protection

**Test 1: Can't Access Other Tenant's Data**

```bash
# Try to access customer from different tenant
curl -X GET "http://localhost:3002/api/sales/customers/OTHER_TENANT_CUSTOMER_ID" \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID"
```

**Expected**: 404 Not Found (customer filtered by RLS)

**Test 2: Queries Filtered by Tenant**

```bash
# Get all customers - should only return current tenant's customers
curl -X GET "http://localhost:3002/api/sales/customers" \
  -H "Cookie: sales-session-id=YOUR_SESSION_ID"
```

**Expected**: All customers have correct tenantId

### How RLS Still Works

The fix maintains RLS protection because:

1. **Tenant ID** is still validated in authentication
2. **Handlers** can use `withTenant(tenantId, (tx) => ...)` for RLS context
3. **Direct queries** still include `where: { tenantId }` filters

**Example Handler Pattern**:
```typescript
// READ operations - filter by tenantId
const customers = await db.customer.findMany({
  where: { tenantId } // ✅ Tenant filtering
});

// WRITE operations - use withTenant for RLS context
const result = await withTenant(tenantId, async (tx) => {
  return tx.customer.create({
    data: { ...data, tenantId } // ✅ RLS enforced
  });
});
```

## Migration Guide for Handlers

### Pattern 1: Simple Read (No Changes Needed)

**Before**:
```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const customers = await db.customer.findMany({ where: { tenantId } });
    return NextResponse.json(customers);
  });
}
```

**After**: ✅ Same code, now faster!

### Pattern 2: Write Operations (Add withTenant Wrapper)

**Before** (using db from session - was in long transaction):
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

**After** (wrap writes in withTenant):
```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const data = await request.json();

    // ✅ Use withTenant ONLY for write operations
    const customer = await withTenant(tenantId, async (tx) => {
      return tx.customer.create({
        data: { ...data, tenantId }
      });
    });

    return NextResponse.json(customer);
  });
}
```

### Pattern 3: Complex Multi-Step Writes

**Before**:
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const order = await db.order.create({ ... });
    await db.inventory.update({ ... });
    await db.invoice.create({ ... });
    return NextResponse.json(order);
  });
}
```

**After** (wrap ALL writes in single transaction):
```typescript
import { withTenant } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ✅ Single transaction around all writes
    const result = await withTenant(tenantId, async (tx) => {
      const order = await tx.order.create({ ... });
      await tx.inventory.update({ ... });
      await tx.invoice.create({ ... });
      return order;
    });

    return NextResponse.json(result);
  });
}
```

## Rollback Plan

If issues are discovered, you can rollback by:

1. Revert [src/lib/auth/sales.ts](../../src/lib/auth/sales.ts) to use `withTenantFromRequest`
2. Restore imports to use `getActiveSalesSession`
3. Remove `getTenantIdFromRequest` helper

**Git rollback**:
```bash
git diff HEAD src/lib/auth/sales.ts  # Review changes
git checkout HEAD -- src/lib/auth/sales.ts  # Rollback if needed
```

## Known Issues & Limitations

### Current Limitations

1. **Handlers must add withTenant for writes**: Write operations now need explicit transaction wrappers
2. **No auto-retry on connection errors**: If connection pool is still exhausted, queries fail immediately
3. **RLS requires manual tenantId filter**: Read queries must include `where: { tenantId }`

### Future Improvements

1. Add connection pool monitoring dashboard
2. Implement request queuing for high load
3. Add automated load testing to CI/CD
4. Consider read replicas for read-heavy endpoints

## Success Criteria

### Fix is successful if:

- ✅ Zero connection pool timeout errors under normal load
- ✅ Authentication completes in < 200ms
- ✅ Support for 50+ concurrent users
- ✅ All API endpoints return correct data
- ✅ No RLS policy violations
- ✅ Write operations still transactional

### Fix has issues if:

- ❌ Still seeing "Timed out fetching connection" errors
- ❌ RLS policies not enforcing tenant isolation
- ❌ Data integrity issues in write operations
- ❌ Authentication taking > 500ms

## Contact

For issues or questions about the connection pool fix, contact the development team or file an issue in the repository.

## Related Documentation

- [CONNECTION_POOL_TIMEOUT_ANALYSIS.md](../CONNECTION_POOL_TIMEOUT_ANALYSIS.md) - Root cause analysis
- [CONNECTION_POOL_FIX_PROPOSAL.md](../CONNECTION_POOL_FIX_PROPOSAL.md) - Detailed implementation plan
- [Prisma Connection Pool Docs](http://pris.ly/d/connection-pool)

# Prisma Connection Pool Timeout Analysis

**Date**: 2025-01-13
**Error Code**: P2024
**Severity**: CRITICAL

## Problem Summary

The application is experiencing Prisma connection pool timeouts with the following characteristics:

```
Error: Timed out fetching a new connection from the connection pool
Connection pool timeout: 10 seconds
Connection limit: 17
```

## Root Cause Analysis

### 1. **PgBouncer Transaction Mode with Long-Running Operations**

**Current Configuration**:
```
DATABASE_URL="postgresql://...@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=60..."
```

**Issue**: The application uses `pgbouncer=true` which enables PgBouncer in transaction pooling mode. However, the code has operations that hold transactions for extended periods:

**From [prisma.ts:65-78](src/lib/prisma.ts#L65-L78)**:
```typescript
export async function withTenant<T>(
  tenantId: string,
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `select set_config('app.current_tenant_id', '${sanitizedTenantId}', false)`,
    );
    return callback(tx);
  }, {
    timeout: 60000, // 60 seconds - holds connection for up to 1 minute!
  });
}
```

**Problem**: This function:
1. Starts a database transaction
2. Sets a Postgres session variable
3. Executes the entire handler callback within the transaction
4. Can hold a connection for up to 60 seconds

### 2. **Every Sales API Request Uses Long Transactions**

**From [sales.ts:48-124](src/lib/auth/sales.ts#L48-L124)**:
```typescript
await withTenantFromRequest(request, async (tenantId, db) => {
  // Session validation
  const session = await getActiveSalesSession(db, tenantId, sessionId);

  // Role/permission checks
  // ...

  // Handler execution
  const handlerResult = await handler({ tenantId, db, session, roles, permissions });
  return handlerResult;
});
```

This means:
- **Every authenticated sales request** holds a database connection for the entire request duration
- With 100+ sales API endpoints, concurrent users quickly exhaust the pool
- Complex operations (OpenAI calls, file exports, etc.) can hold connections for 10-60 seconds

### 3. **Connection Pool Size Too Small for Application Pattern**

**Current Limits**:
- Connection pool timeout: **10 seconds**
- Connection limit: **17 connections**
- Active API endpoints: **415 total**, **100+ using withSalesSession**

**Calculation**:
- If 17 concurrent requests each take 10+ seconds
- The 18th request waits 10 seconds then times out
- Under normal load with 5-10 active sales reps, this threshold is easily exceeded

### 4. **Nested Transaction Pattern**

The code flow creates a nested transaction pattern:

```
Request → withSalesSession
  → withTenantFromRequest
    → withTenant (starts transaction)
      → getActiveSalesSession (queries in transaction)
      → handler (entire business logic in transaction)
```

Every API call holds a connection from start to finish of request processing.

## Evidence from Logs

```
[withSalesSession] Calling withTenantFromRequest
[Tenant] Using default tenant slug: well-crafted
❌ Timed out fetching a new connection from the connection pool
 GET /api/sales/customers/7b482d59-3fbf-4353-9708-2506f7859aeb 500 in 11299ms
 GET /api/sales/catalog/export 500 in 10266ms
```

Multiple requests timing out simultaneously indicates pool exhaustion.

## Impact Assessment

**Severity**: CRITICAL
**User Impact**:
- API requests failing with 500 errors
- Session validation failures
- Unable to load customer data
- Unable to export catalogs
- Poor user experience during concurrent usage

**Affected Areas**:
- All sales portal API endpoints (100+)
- All authenticated user operations
- Multi-user concurrent access

## Solution Options

### Option 1: Increase Connection Pool Size ⚠️ LIMITED

**Action**: Increase Supabase connection limit

**Pros**:
- Quick fix
- No code changes

**Cons**:
- Supabase free tier has hard limits
- Only delays the problem
- Doesn't address root cause
- Costs money on paid plans

**Recommendation**: ❌ Not sustainable

### Option 2: Optimize Transaction Scope ✅ RECOMMENDED

**Action**: Minimize transaction duration by splitting authentication from business logic

**Changes Required**:

1. **Remove transaction from authentication** ([auth/sales.ts](src/lib/auth/sales.ts)):
```typescript
export async function withSalesSession(
  request: NextRequest,
  handler: SalesSessionHandler,
  options: SalesAuthorizationOptions = {},
) {
  // Step 1: Get session WITHOUT transaction
  const { sessionId } = readSalesSessionCookies(request);
  if (!sessionId) return unauthorized();

  // Step 2: Validate session WITHOUT long transaction
  const { tenantId } = await getTenantFromRequest(request); // No tx
  const session = await prisma.salesSession.findUnique({
    where: { id: sessionId, tenantId }
  }); // Quick query, no tx

  if (!session) return unauthorized();

  // Step 3: Handler gets transaction-capable db
  return handler({
    tenantId,
    db: prisma, // Handler can create tx if needed
    session,
    roles,
    permissions
  });
}
```

2. **Use transactions only where needed**:
```typescript
// Handler decides if it needs a transaction
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // Option A: Simple read - no transaction
    const customers = await db.customer.findMany({ where: { tenantId } });

    // Option B: Write operation - use withTenant
    const result = await withTenant(tenantId, async (tx) => {
      await tx.order.create({ ... });
      await tx.inventory.update({ ... });
      return result;
    });

    return NextResponse.json(result);
  });
}
```

**Pros**:
- Drastically reduces connection hold time
- Connections held only during actual database operations
- Authentication queries become fast (< 100ms)
- Handlers only use transactions when writing data
- Scales to many concurrent users

**Cons**:
- Requires code refactoring
- Need to ensure RLS still works correctly

**Recommendation**: ✅ **IMPLEMENT THIS**

### Option 3: Connection Pooling at Application Level

**Action**: Implement connection pool management in application

**Changes Required**:
- Add connection pool monitoring
- Implement request queuing
- Add connection pool health checks

**Pros**:
- Better visibility into connection usage
- Can add metrics and alerting

**Cons**:
- Adds complexity
- Doesn't solve root cause

**Recommendation**: ⚠️ Use in combination with Option 2

### Option 4: Migrate Away from PgBouncer Transaction Mode

**Action**: Use direct connection or session pooling

**Changes Required**:
- Remove `pgbouncer=true` from DATABASE_URL
- Use Supabase direct connection
- Or switch to session pooling mode

**Pros**:
- More connections available
- Better for long-running operations

**Cons**:
- Different connection limits
- May require Supabase plan upgrade
- Session pooling has other limitations

**Recommendation**: ⚠️ Consider after Option 2

## Implementation Plan

### Phase 1: Quick Mitigation (Today)
1. ✅ Document the issue
2. Add connection pool monitoring
3. Increase timeout temporarily (if possible)
4. Add request queuing for export endpoints

### Phase 2: Structural Fix (This Week) - PRIORITY
1. Refactor `withSalesSession` to avoid long transactions
2. Separate authentication queries from business logic
3. Use `withTenant` only for write operations
4. Test with concurrent load

### Phase 3: Long-term Optimization (Next Sprint)
1. Add connection pool metrics to monitoring
2. Implement graceful degradation for high load
3. Consider read replicas for read-heavy queries
4. Optimize slow queries

## Technical Debt

This issue reveals architectural debt:
- Over-use of transactions for operations that don't need them
- Authentication and authorization mixed with business logic
- No connection pool monitoring or alerting
- No load testing or concurrent user testing

## Testing Requirements

Before deploying fixes:
1. Load test with 20+ concurrent users
2. Monitor connection pool usage under load
3. Test session validation performance
4. Verify RLS policies still work correctly

## Related Files

- [src/lib/prisma.ts:65-78](src/lib/prisma.ts#L65-L78) - withTenant transaction
- [src/lib/auth/sales.ts:48-124](src/lib/auth/sales.ts#L48-L124) - withSalesSession
- [src/lib/tenant.ts:34-54](src/lib/tenant.ts#L34-L54) - withTenantFromRequest
- `.env` - DATABASE_URL configuration

## Monitoring Recommendations

Add these metrics:
- Connection pool utilization
- Transaction duration histogram
- Slow query log (> 1 second)
- Request timeout rate
- Concurrent user count

## References

- [Prisma Connection Pool](http://pris.ly/d/connection-pool)
- [Supabase PgBouncer](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Transaction Pooling Best Practices](https://www.pgbouncer.org/usage.html)

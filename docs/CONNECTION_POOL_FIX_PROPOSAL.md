# Connection Pool Fix - Implementation Proposal

## Overview

This document proposes code changes to fix the Prisma connection pool timeout issue by minimizing transaction duration and separating authentication from business logic.

## Core Problem

Current code holds database connections for entire request duration:
```
Request (0-60s) → withSalesSession → withTenantFromRequest → withTenant (TRANSACTION)
  → getActiveSalesSession (in transaction)
  → handler execution (in transaction) ← Business logic
  → return result
```

**Result**: Every API request holds a connection for 1-60 seconds, exhausting the 17-connection pool.

## Solution Architecture

Separate authentication (quick queries) from business logic (may need transactions):

```
Request → withSalesSession
  ├─ Quick auth queries (NO transaction, < 100ms)
  │  ├─ Get tenant
  │  ├─ Validate session
  │  └─ Check permissions
  └─ Handler execution
     ├─ Read operations: Direct queries (NO transaction)
     └─ Write operations: Use withTenant only when needed
```

## Implementation Changes

### 1. Refactor `withSalesSession` - Remove Long Transaction

**File**: `src/lib/auth/sales.ts`

**Current (SLOW)**:
```typescript
export async function withSalesSession(
  request: NextRequest,
  handler: SalesSessionHandler,
  options: SalesAuthorizationOptions = {},
) {
  const { sessionId } = readSalesSessionCookies(request);
  if (!sessionId) return unauthorized();

  // ❌ PROBLEM: Entire handler runs inside withTenantFromRequest transaction
  const { result } = await withTenantFromRequest(request, async (tenantId, db) => {
    const session = await getActiveSalesSession(db, tenantId, sessionId);
    // ... permission checks ...
    return await handler({ tenantId, db, session, roles, permissions });
  });

  return result;
}
```

**Proposed (FAST)**:
```typescript
export async function withSalesSession(
  request: NextRequest,
  handler: SalesSessionHandler,
  options: SalesAuthorizationOptions = {},
) {
  const { sessionId } = readSalesSessionCookies(request);
  if (!sessionId) return unauthorized();

  try {
    // ✅ Step 1: Get tenant (quick query, no transaction)
    const tenantId = await getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
    }

    // ✅ Step 2: Validate session (quick query, no transaction)
    const session = await prisma.salesSession.findUnique({
      where: {
        id: sessionId,
        tenantId: tenantId,
      },
      include: {
        user: {
          include: {
            salesRepProfile: true,
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({
        error: "Session expired. Please log in again.",
        code: "SESSION_EXPIRED",
      }, { status: 401 });
    }

    // ✅ Step 3: Permission checks (in-memory, no database)
    const roleCodes = session.user.roles.map((ur) => ur.role.code);
    const permissions = new Set<string>();
    session.user.roles.forEach((userRole) => {
      userRole.role.permissions.forEach((rp) => {
        permissions.add(rp.permission.code);
      });
    });

    // Check requireSalesRep
    const managerScope = hasSalesManagerPrivileges(roleCodes);
    if (options.requireSalesRep !== false && !session.user.salesRepProfile && !managerScope) {
      return NextResponse.json({
        error: "Sales representative profile required.",
        code: "MISSING_SALES_REP_PROFILE",
      }, { status: 403 });
    }

    // Check isActive
    if (session.user.salesRepProfile && !session.user.salesRepProfile.isActive) {
      return NextResponse.json({
        error: "Your sales account is inactive.",
        code: "INACTIVE_SALES_REP",
      }, { status: 403 });
    }

    // Check required roles/permissions
    if (options.requiredRoles?.length) {
      const hasRole = options.requiredRoles.some((role) => roleCodes.includes(role));
      if (!hasRole) {
        return NextResponse.json({ error: "Missing required role." }, { status: 403 });
      }
    }

    if (options.requiredPermissions?.length) {
      const hasPermission = options.requiredPermissions.every((p) => permissions.has(p));
      if (!hasPermission) {
        return NextResponse.json({ error: "Missing required permission." }, { status: 403 });
      }
    }

    // ✅ Step 4: Call handler with prisma client (handler decides if it needs transaction)
    return await handler({
      tenantId,
      db: prisma, // Handler can use withTenant if it needs a transaction
      session,
      roles: roleCodes,
      permissions,
    });
  } catch (error) {
    console.error("❌ [withSalesSession] Error:", error);
    return NextResponse.json({
      error: "Unable to validate session.",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
```

### 2. Add Helper Function for Tenant Resolution

**File**: `src/lib/auth/sales.ts` (add this function)

```typescript
/**
 * Fast tenant resolution without transaction
 */
async function getTenantIdFromRequest(request: NextRequest): Promise<string | null> {
  const TENANT_ID_HEADER = "x-tenant-id";
  const TENANT_SLUG_HEADER = "x-tenant-slug";

  const tenantIdHeader = request.headers.get(TENANT_ID_HEADER);
  if (tenantIdHeader) {
    return tenantIdHeader;
  }

  const tenantSlugHeader = request.headers.get(TENANT_SLUG_HEADER);
  if (tenantSlugHeader) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlugHeader },
      select: { id: true },
    });
    return tenant?.id || null;
  }

  // Use default tenant
  const defaultSlug = getDefaultTenantSlug();
  const tenant = await prisma.tenant.findUnique({
    where: { slug: defaultSlug },
    select: { id: true },
  });

  return tenant?.id || null;
}
```

### 3. Update SalesSessionContext Type

**File**: `src/lib/auth/sales.ts`

**No changes needed** - the type already uses `PrismaClient | Prisma.TransactionClient`:

```typescript
export type SalesSessionContext = {
  tenantId: string;
  db: PrismaClient | Prisma.TransactionClient;
  session: SalesSession;
  roles: string[];
  permissions: Set<string>;
};
```

### 4. Update Handlers to Use Transactions Only When Needed

**Pattern for READ operations** (most API endpoints):
```typescript
export async function GET(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    // ✅ Direct query - NO transaction needed for reads
    const customers = await db.customer.findMany({
      where: { tenantId },
    });

    return NextResponse.json(customers);
  });
}
```

**Pattern for WRITE operations** (create, update, delete):
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db }) => {
    const body = await request.json();

    // ✅ Use withTenant ONLY for write operations
    const result = await withTenant(tenantId, async (tx) => {
      const customer = await tx.customer.create({
        data: { ...body, tenantId },
      });

      await tx.auditLog.create({
        data: {
          action: "customer.created",
          entityId: customer.id,
          tenantId,
        },
      });

      return customer;
    });

    return NextResponse.json(result);
  });
}
```

**Pattern for COMPLEX operations** (multi-step writes):
```typescript
export async function POST(request: NextRequest) {
  return withSalesSession(request, async ({ tenantId, db, session }) => {
    const body = await request.json();

    // ✅ Transaction ONLY around write operations
    const result = await withTenant(tenantId, async (tx) => {
      // Create order
      const order = await tx.order.create({ data: { ...body, tenantId } });

      // Update inventory for each line item
      for (const item of body.items) {
        await tx.inventory.update({
          where: { skuId: item.skuId, tenantId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Create invoice
      const invoice = await tx.invoice.create({
        data: { orderId: order.id, tenantId },
      });

      return { order, invoice };
    });

    return NextResponse.json(result);
  });
}
```

## Migration Strategy

### Phase 1: Deploy New withSalesSession (Breaking Change Mitigation)
1. Create `withSalesSessionV2` alongside existing function
2. Test with a few low-traffic endpoints
3. Verify no RLS issues
4. Monitor connection pool usage

### Phase 2: Gradual Migration
1. Migrate READ-only endpoints first (lowest risk)
2. Test each migration with load testing
3. Monitor for errors

### Phase 3: Migrate WRITE endpoints
1. Add proper `withTenant` wrapping for write operations
2. Test transactional integrity
3. Verify audit logs still work

### Phase 4: Remove Old Code
1. Delete `withTenantFromRequest` (no longer needed)
2. Rename `withSalesSessionV2` to `withSalesSession`
3. Update all remaining handlers

## Expected Performance Improvements

### Before (Current)
- Connection hold time: **1-60 seconds per request**
- Concurrent capacity: **~17 users** (hard limit)
- Auth queries: **Inside transaction** (slow)

### After (Optimized)
- Auth queries: **50-100ms** (no transaction)
- Connection hold time for reads: **10-50ms** (no transaction)
- Connection hold time for writes: **100-500ms** (transaction only around write)
- Concurrent capacity: **100+ users** (connections cycle quickly)

### Estimated Improvements
- **10-100x faster** connection cycling
- **10x more** concurrent users supported
- **Zero** connection pool timeouts under normal load

## Testing Plan

### Unit Tests
- [ ] Test `getTenantIdFromRequest` with headers
- [ ] Test `getTenantIdFromRequest` with default tenant
- [ ] Test `withSalesSession` with valid session
- [ ] Test `withSalesSession` with expired session
- [ ] Test `withSalesSession` with missing session

### Integration Tests
- [ ] Test READ endpoint (no transaction)
- [ ] Test WRITE endpoint (with transaction)
- [ ] Test complex multi-step write
- [ ] Verify RLS policies still work
- [ ] Verify audit logs still work

### Load Tests
- [ ] 20 concurrent read requests
- [ ] 10 concurrent write requests
- [ ] Mixed read/write load (80/20 split)
- [ ] Monitor connection pool usage
- [ ] Monitor request latency

### Regression Tests
- [ ] All existing API tests pass
- [ ] No new 401/403 errors
- [ ] No data integrity issues
- [ ] Audit logs complete

## Rollback Plan

If issues are discovered:
1. Revert to `withSalesSession` (keep both versions during migration)
2. Restore `withTenantFromRequest` usage
3. Investigate specific failure
4. Fix and redeploy

## Risk Assessment

**Low Risk**:
- READ operations (no transaction needed anyway)
- Session validation logic (already tested)

**Medium Risk**:
- RLS policy enforcement (needs testing)
- Tenant context propagation

**High Risk**:
- WRITE operations with complex logic
- Multi-step transactions
- Audit logging

**Mitigation**:
- Extensive testing before production
- Gradual rollout (read → write)
- Keep old code during migration
- Monitor closely after deployment

## Files to Modify

1. **src/lib/auth/sales.ts** - Main refactoring
2. **src/lib/tenant.ts** - Add fast helper function
3. **All API route handlers** - Update to use transactions properly
4. **Tests** - Update to match new patterns

## Success Criteria

- [ ] Zero connection pool timeout errors
- [ ] Auth requests complete in < 100ms
- [ ] Read requests complete in < 200ms
- [ ] Write requests complete in < 1s
- [ ] Support 50+ concurrent users
- [ ] All tests pass
- [ ] No RLS policy violations
- [ ] No data integrity issues

## Timeline

- **Day 1**: Implement `withSalesSessionV2` and helper functions
- **Day 2**: Migrate and test 10 read-only endpoints
- **Day 3**: Migrate and test 5 write endpoints
- **Day 4**: Load testing and monitoring
- **Day 5**: Full migration if metrics look good

## Monitoring Post-Deployment

Add these metrics:
- Connection pool utilization (should drop to < 50%)
- Auth query duration (should be < 100ms)
- Transaction duration (should be < 500ms)
- Request timeout rate (should be 0%)
- Concurrent user count (should support 50+)

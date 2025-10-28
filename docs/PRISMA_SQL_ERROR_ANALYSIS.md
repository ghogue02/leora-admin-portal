# Prisma SQL Syntax Error Analysis

## Executive Summary

**Root Cause**: Incorrect nested relation filtering in `groupBy()` queries causing PostgreSQL parameter syntax errors.

**Location**: `src/app/api/sales/insights/route.ts:38-150`

**Error Pattern**: `ERROR: syntax error at or near '$3'`

---

## Problem Details

### 1. The Core Issue

The code attempts to use **nested relation filtering** in `groupBy()` queries, which is NOT supported by Prisma:

```typescript
// ❌ INCORRECT - Line 25
const salesRepFilter = salesRep ? { salesRepId: salesRep.id } : {};

// ❌ INCORRECT - Line 44
db.order.groupBy({
  where: {
    tenantId,
    customer: salesRepFilter,  // ← Nested relation filter in groupBy!
    status: { not: 'CANCELLED' },
  },
  // ...
})
```

### 2. Why This Fails

**Prisma Limitation**: `groupBy()` does NOT support nested relation filters like `customer: { salesRepId: '...' }`

When Prisma tries to generate SQL for this query, it creates malformed SQL with incorrect parameter binding, resulting in:
- `ERROR: syntax error at or near '$3'`
- SQL parameter count mismatches
- Query execution failures

### 3. Affected Queries

All these queries in the `Promise.all()` array fail:

1. **Line 40-51**: Top 10 Customers by Revenue
   - `db.order.groupBy()` with `customer: salesRepFilter`

2. **Line 54-61**: Order Status Distribution
   - `db.order.groupBy()` with `customer: salesRepFilter`

3. **Line 64-72**: Customer Risk Breakdown
   - `db.customer.groupBy()` with spread `...salesRepFilter`

4. **Line 75-88**: Top Products
   - `db.orderLine.groupBy()` with nested `order: { customer: salesRepFilter }`

5. **Line 103-118**: Sample Usage Stats
   - `db.sampleUsage.aggregate()` with spread `...salesRepFilter`

6. **Line 129-133**: Cart Stats
   - `db.cart.groupBy()` - might work, no salesRepFilter

7. **Line 136-149**: Monthly Order Trend
   - `db.$queryRaw()` with unsafe SQL injection vulnerability

---

## Solution

### Option A: Direct Field Filtering (Recommended)

Replace nested relation filters with direct field comparisons:

```typescript
// ✅ CORRECT
const salesRepFilter = salesRep
  ? { customerId: { in: await getCustomerIdsBySalesRep(salesRep.id) } }
  : {};
```

### Option B: Use Direct salesRepId Field

For models that have `salesRepId` directly:

```typescript
// ✅ CORRECT for Customer, SampleUsage
const salesRepFilter = salesRep ? { salesRepId: salesRep.id } : {};

// Use in groupBy
db.customer.groupBy({
  where: {
    tenantId,
    salesRepId: salesRep?.id,  // Direct field comparison
    isPermanentlyClosed: false,
  },
  // ...
})
```

### Option C: Separate Query for Customer IDs

Pre-fetch customer IDs, then use `in` operator:

```typescript
// Get customer IDs first
const customerIds = salesRep
  ? (await db.customer.findMany({
      where: { tenantId, salesRepId: salesRep.id },
      select: { id: true }
    })).map(c => c.id)
  : undefined;

// Use in groupBy
db.order.groupBy({
  where: {
    tenantId,
    ...(customerIds ? { customerId: { in: customerIds } } : {}),
    status: { not: 'CANCELLED' },
  },
  // ...
})
```

---

## Security Issues

### SQL Injection Vulnerability (Line 146)

```typescript
// 🚨 CRITICAL SECURITY ISSUE
${salesRep ? db.$queryRawUnsafe(`AND "customerId" IN (SELECT id FROM "Customer" WHERE "salesRepId" = '${salesRep.id}')`) : db.$queryRawUnsafe('')}
```

**Problems**:
1. Mixing `$queryRaw` (parameterized) with `$queryRawUnsafe` (string interpolation)
2. Direct string interpolation of `salesRep.id` opens SQL injection
3. Incorrect Prisma API usage - cannot nest raw queries

**Fixed Version**:
```typescript
// ✅ SECURE
const monthlyTrend = await db.$queryRaw<
  Array<{ month: string; order_count: bigint; total_revenue: number }>
>`
  SELECT
    TO_CHAR(DATE_TRUNC('month', "orderedAt"), 'YYYY-MM') as month,
    COUNT(*) as order_count,
    COALESCE(SUM(total), 0) as total_revenue
  FROM "Order"
  WHERE "orderedAt" >= ${sixMonthsAgo}
    AND "tenantId" = ${tenantId}::uuid
    ${salesRep ? Prisma.sql`AND "customerId" IN (
      SELECT id FROM "Customer" WHERE "salesRepId" = ${salesRep.id}::uuid
    )` : Prisma.empty}
  GROUP BY DATE_TRUNC('month', "orderedAt")
  ORDER BY month DESC
`
```

---

## Database Schema Status

The schema appears to be **out of sync** with the database:

```bash
Error: Environment variable not found: DIRECT_URL.
```

This suggests:
1. Missing `.env` configuration for `DIRECT_URL`
2. Possible migration drift between schema and database
3. Need to run `npx prisma migrate deploy` or `npx prisma db push`

---

## Recommended Fix Sequence

1. **Immediate**: Add missing environment variable
   ```bash
   # Add to .env
   DIRECT_URL="${DATABASE_URL}"
   ```

2. **Schema Sync**: Verify database matches schema
   ```bash
   npx prisma migrate status
   npx prisma migrate deploy  # If migrations are pending
   ```

3. **Code Fix**: Update `src/app/api/sales/insights/route.ts`
   - Replace nested relation filters
   - Fix SQL injection vulnerability
   - Add proper parameter binding

4. **Testing**: Verify all queries execute successfully
   ```bash
   # Test the insights endpoint
   curl http://localhost:3000/api/sales/insights
   ```

---

## Additional Findings

### Unused Variables (Non-Critical)
```typescript
Line 3:  'subWeeks' is defined but never used
Line 10: 'currentWeekStart' is assigned but never used
Line 11: 'currentWeekEnd' is assigned but never used
```

These can be removed or used for future features.

---

## Prisma Limitations Reference

**Do NOT use in `groupBy()`:**
- ❌ Nested relation filters: `customer: { salesRepId: id }`
- ❌ Relation traversal: `order: { customer: { ... } }`
- ❌ Deep filtering through relations

**DO use in `groupBy()`:**
- ✅ Direct field comparisons: `salesRepId: id`
- ✅ Scalar field operators: `status: { not: 'CANCELLED' }`
- ✅ `in` operator with pre-fetched IDs: `customerId: { in: [...] }`

---

## Testing Checklist

- [ ] Verify `DIRECT_URL` environment variable is set
- [ ] Run `npx prisma migrate status` to check migration state
- [ ] Fix nested relation filters in all 5+ affected queries
- [ ] Replace SQL injection vulnerable query with parameterized version
- [ ] Test each insight query individually
- [ ] Verify sales rep filtering works correctly
- [ ] Confirm admin users (no salesRep) see all data
- [ ] Load test with multiple concurrent requests

---

## References

- [Prisma groupBy Limitations](https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#groupby-limitations)
- [Prisma Raw Queries](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access)
- [Prisma SQL Injection Prevention](https://www.prisma.io/docs/concepts/components/prisma-client/raw-database-access#sql-injection)

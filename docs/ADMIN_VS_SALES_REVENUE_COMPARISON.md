# Admin vs Sales Revenue Calculation Comparison

## Side-by-Side Comparison

### Before Fix

| Aspect | Admin Dashboard | Sales Dashboard | Status |
|--------|----------------|-----------------|--------|
| **Date Field** | `orderedAt` | `deliveredAt` | ❌ MISMATCH |
| **Date Range** | `gte: weekStart` only | `gte: weekStart, lte: weekEnd` | ❌ INCOMPLETE |
| **Week Start** | Sunday-based | Monday-based | ❌ INCONSISTENT |
| **Query Method** | `findMany` + reduce | `aggregate` | ❌ INEFFICIENT |
| **Result** | $0.00 (wrong) | Correct revenue | ❌ BROKEN |

### After Fix

| Aspect | Admin Dashboard | Sales Dashboard | Status |
|--------|----------------|-----------------|--------|
| **Date Field** | `deliveredAt` | `deliveredAt` | ✅ ALIGNED |
| **Date Range** | `gte: weekStart, lte: weekEnd` | `gte: weekStart, lte: weekEnd` | ✅ COMPLETE |
| **Week Start** | Monday-based | Monday-based | ✅ CONSISTENT |
| **Query Method** | `aggregate` | `aggregate` | ✅ EFFICIENT |
| **Result** | Correct revenue | Correct revenue | ✅ FIXED |

## Code Comparison

### Week Calculation

#### Admin (Before)
```typescript
const now = new Date();
const weekStart = new Date(now);
weekStart.setDate(now.getDate() - now.getDay()); // Sunday-based
weekStart.setHours(0, 0, 0, 0);
// No weekEnd defined
```

#### Admin (After)
```typescript
const now = new Date();
const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
```

#### Sales (Reference)
```typescript
const now = new Date();
const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
```

✅ **Now identical approach**

### Revenue Query

#### Admin (Before)
```typescript
db.order.findMany({
  where: {
    tenantId,
    orderedAt: { gte: weekStart },  // Wrong field, no upper bound
    status: { not: "CANCELLED" },
  },
  select: { total: true },
}),

// Then reduce:
const weeklyRevenue = weeklyOrders.reduce((sum, order) => {
  return sum + (order.total ? Number(order.total) : 0);
}, 0);
```

#### Admin (After)
```typescript
db.order.aggregate({
  where: {
    tenantId,
    deliveredAt: {
      gte: weekStart,
      lte: weekEnd,
    },
    status: { not: "CANCELLED" },
  },
  _sum: { total: true },
}),

// Direct result:
const weeklyRevenue = Number(weeklyOrders._sum.total ?? 0);
```

#### Sales (Reference)
```typescript
db.order.aggregate({
  where: {
    tenantId,
    customer: { salesRepId: salesRep.id },  // Additional filter
    deliveredAt: {
      gte: currentWeekStart,
      lte: currentWeekEnd,
    },
    status: { not: "CANCELLED" },
  },
  _sum: { total: true },
}),

const currentRevenue = Number(currentWeekRevenue._sum.total ?? 0);
```

✅ **Now consistent pattern** (admin just omits salesRep filter for all-tenant view)

## Why orderedAt vs deliveredAt Matters

### orderedAt (Wrong)
- When customer places order
- May be in future (scheduled orders)
- Order might be cancelled before delivery
- **Not realized revenue**

### deliveredAt (Correct)
- When order is actually fulfilled
- Represents completed transaction
- Matches accounting period
- **Actual realized revenue**

### Example Scenario

```
Order placed Monday (orderedAt: Mon)
Order delivered Friday (deliveredAt: Fri)
```

**Admin Before Fix**:
- Counted Monday in revenue (when placed)
- Might count orders never delivered

**Admin After Fix**:
- Counts Friday in revenue (when delivered)
- Only counts completed transactions

**Sales Dashboard**:
- Always counted Friday (correct)

## Performance Impact

### Query Efficiency

**Before (findMany + reduce)**:
```typescript
// 1. Fetch all records from DB
const orders = await db.order.findMany({ ... });

// 2. Calculate sum in JavaScript
const total = orders.reduce((sum, o) => sum + Number(o.total), 0);

// Network: Transfer all order data
// Memory: Load all orders into memory
```

**After (aggregate)**:
```typescript
// 1. Calculate sum in database
const result = await db.order.aggregate({ _sum: { total: true } });

// 2. Use result directly
const total = Number(result._sum.total ?? 0);

// Network: Transfer only sum
// Memory: Minimal (single number)
```

### Estimated Savings

| Metric | findMany + reduce | aggregate | Improvement |
|--------|------------------|-----------|-------------|
| Network bytes | ~50 KB (100 orders) | ~100 bytes | 500x reduction |
| Memory usage | ~5 MB | ~1 KB | 5000x reduction |
| Query time | 100-500ms | 20-50ms | 5-10x faster |

## Testing Scenarios

### Scenario 1: Normal Week with Orders

**Database**:
- 50 orders delivered this week
- Total: $12,345.67

**Expected**:
- Admin: $12,345.67
- Sales (all reps combined): $12,345.67

### Scenario 2: Week with Cancelled Orders

**Database**:
- 45 delivered orders: $11,000.00
- 5 cancelled orders: $1,345.67

**Expected**:
- Admin: $11,000.00 (excludes cancelled)
- Sales: $11,000.00 (excludes cancelled)

### Scenario 3: Week with Future/Past Orders

**Database**:
- This week deliveries: $8,000.00
- Last week deliveries: $9,000.00
- Next week deliveries: $7,000.00

**Expected**:
- Admin: $8,000.00 (only this week)
- Sales: $8,000.00 (only this week)

### Scenario 4: Empty Week

**Database**:
- No deliveries this week

**Expected**:
- Admin: $0.00
- Sales: $0.00

## Alignment Checklist

- [x] Both use `deliveredAt` field
- [x] Both use Monday-based weeks
- [x] Both use complete date ranges (gte + lte)
- [x] Both exclude cancelled orders
- [x] Both use efficient aggregate queries
- [x] Both handle null totals with ?? 0
- [x] Both convert Decimal to Number

## Future Improvements

1. **Shared utility function**:
   ```typescript
   // lib/utils/revenue.ts
   export async function getWeeklyRevenue(
     db: PrismaClient,
     tenantId: string,
     salesRepId?: string
   ) {
     // Single source of truth for revenue calculation
   }
   ```

2. **Type safety**:
   ```typescript
   export interface WeeklyRevenueQuery {
     weekStart: Date;
     weekEnd: Date;
     tenantId: string;
     salesRepId?: string;
   }
   ```

3. **Caching**:
   - Cache revenue calculations for 5 minutes
   - Invalidate on new order delivery

4. **Monitoring**:
   - Alert if admin vs sales revenue diverges
   - Track query performance

---

**Status**: ✅ ALIGNED
**Last Updated**: 2025-10-27

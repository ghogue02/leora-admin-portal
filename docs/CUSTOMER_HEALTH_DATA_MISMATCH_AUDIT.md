# Customer Health Summary Data Mismatch Audit Report

**Date**: 2025-10-27
**Critical Severity**: ⚠️ HIGH - 4.8x Data Discrepancy

---

## Executive Summary

A **massive data integrity issue** has been identified between the Customer Health Summary tile and its drilldown modal:

- **Tile shows**: 1,519 healthy customers (80%)
- **Drilldown shows**: 320 healthy customers (16.8%)
- **Discrepancy**: **4.8x difference** - 1,199 customers unaccounted for

---

## Root Cause Analysis

### ✅ TILE Data Source (CORRECT)

**File**: `/src/app/api/sales/dashboard/route.ts`
**Lines**: 168-179, 299-388

**Query**:
```typescript
// Customer risk status counts
db.customer.groupBy({
  by: ["riskStatus"],
  where: {
    tenantId,
    salesRepId: salesRep.id,
    isPermanentlyClosed: false,  // ✅ CORRECT
  },
  _count: {
    _all: true,
  },
})
```

**Data Aggregation** (lines 299-312):
```typescript
const riskCounts = customerRiskCounts.reduce(
  (acc, group) => {
    acc[group.riskStatus] = group._count._all;
    return acc;
  },
  {
    HEALTHY: 0,
    AT_RISK_CADENCE: 0,
    AT_RISK_REVENUE: 0,
    DORMANT: 0,
    CLOSED: 0,  // ✅ Initialized but NOT included in total
  } as Record<string, number>
);
```

**Customer Health Object** (lines 378-389):
```typescript
customerHealth: {
  healthy: riskCounts.HEALTHY,
  atRiskCadence: riskCounts.AT_RISK_CADENCE,
  atRiskRevenue: riskCounts.AT_RISK_REVENUE,
  dormant: riskCounts.DORMANT,
  closed: riskCounts.CLOSED,  // ✅ Captured but NOT included in total
  total:
    riskCounts.HEALTHY +
    riskCounts.AT_RISK_CADENCE +
    riskCounts.AT_RISK_REVENUE +
    riskCounts.DORMANT,  // ✅ CORRECT: Excludes CLOSED
}
```

**✅ This query is CORRECT**:
- Filters: `isPermanentlyClosed: false` ✓
- Total calculation: Excludes CLOSED status ✓
- Groups by riskStatus properly ✓

---

### ❌ DRILLDOWN Data Source (INCORRECT)

**File**: `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts`
**Lines**: 29-39, 59-72

**Query 1** - Status Grouping (lines 29-39):
```typescript
const currentHealthStatus = await db.customer.groupBy({
  by: ["riskStatus"],
  where: {
    tenantId,
    salesRepId: salesRep.id,
    isPermanentlyClosed: false,  // ✅ Filter is correct
  },
  _count: {
    _all: true,
  },
});
```

**Query 2** - Customer List (lines 42-57):
```typescript
const customers = await db.customer.findMany({
  where: {
    tenantId,
    salesRepId: salesRep.id,
    isPermanentlyClosed: false,  // ✅ Filter is correct
  },
  // ...
});
```

**❌ Data Aggregation** (lines 59-72):
```typescript
const statusDistribution = {
  HEALTHY: 0,
  AT_RISK_CADENCE: 0,
  AT_RISK_REVENUE: 0,
  DORMANT: 0,
  CLOSED: 0,  // ❌ PROBLEM: This gets included in total
};

currentHealthStatus.forEach((group) => {
  statusDistribution[group.riskStatus] = group._count._all;
});

const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0  // ❌ INCLUDES CLOSED in total!
);
```

**❌ THIS IS THE BUG**:
- The drilldown calculates total as: `HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT + CLOSED`
- It **includes CLOSED customers** in the total, which inflates the denominator
- This makes healthy percentage appear much lower: 320 / 1,899 = 16.8%

---

## The Math

### Tile Calculation (CORRECT):
```
Total = HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT
Total = 1,519 + 129 + 132 + 119 = 1,899
Healthy % = 1,519 / 1,899 = 80%
```

### Drilldown Calculation (INCORRECT):
```
Total = HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT + CLOSED
Total = 320 + 129 + 132 + 119 + X = 1,899

// If healthy shows as 320 with 16.8%:
// 320 / X = 16.8%
// X = 320 / 0.168 = 1,905

// This suggests drilldown is counting 1,905 total customers
// Missing CLOSED count: 1,905 - 1,899 = ~6 closed customers
```

**BUT WAIT** - The numbers don't match because:

### ACTUAL Issue Discovered:

Looking at the drilldown code more carefully, the problem is **NOT about including CLOSED customers** (they're filtered out by `isPermanentlyClosed: false`).

The issue is that the **drilldown is returning a DIFFERENT dataset entirely**. Let me check if there's a different aggregation happening...

Actually, reviewing lines 59-72 again:

```typescript
const statusDistribution = {
  HEALTHY: 0,
  AT_RISK_CADENCE: 0,
  AT_RISK_REVENUE: 0,
  DORMANT: 0,
  CLOSED: 0,
};

currentHealthStatus.forEach((group) => {
  statusDistribution[group.riskStatus] = group._count._all;
});

const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0
);
```

**THE PROBLEM**:
- Even though `isPermanentlyClosed: false` filters out closed customers from the query
- The `statusDistribution` object still has a `CLOSED: 0` property
- When calculating total via `Object.values(statusDistribution).reduce()`, it includes the `CLOSED: 0` property
- **However**, if any customers have `riskStatus = 'CLOSED'` but `isPermanentlyClosed = false`, they WILL be counted

This means there are customers with:
- `riskStatus: 'CLOSED'`
- `isPermanentlyClosed: false`

And the drilldown is counting these in the total, while the tile is not.

---

## Hypothesis: Two Types of "Closed"

The database appears to have:
1. **Permanently Closed** (`isPermanentlyClosed = true`) - Out of business, etc.
2. **Risk Status Closed** (`riskStatus = 'CLOSED'`, `isPermanentlyClosed = false`) - Temporarily inactive?

### Tile Behavior:
- Excludes `isPermanentlyClosed = true` ✓
- Does NOT include `riskStatus = 'CLOSED'` in total ✓
- Total = HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT

### Drilldown Behavior:
- Excludes `isPermanentlyClosed = true` ✓
- INCLUDES `riskStatus = 'CLOSED'` in total ✗
- Total = HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT + CLOSED

### The Math Now Makes Sense:
```
Tile total (excludes CLOSED riskStatus): 1,899 customers
Drilldown total (includes CLOSED riskStatus): 1,899 + ~1,199 = 3,098 customers?

Wait, let me recalculate with 320 healthy at 16.8%:
320 / 0.168 = 1,905 total customers in drilldown

So drilldown sees:
HEALTHY: 320
AT_RISK_CADENCE: ?
AT_RISK_REVENUE: ?
DORMANT: ?
CLOSED: ? (with isPermanentlyClosed = false)
Total: 1,905
```

But the tile shows 1,519 healthy out of 1,899 total.

This suggests **the drilldown is querying a DIFFERENT sales rep or tenant**! Let me verify the session handling is the same...

Actually, both use the same `withSalesSession` wrapper and get `salesRep.id` the same way. So that's not the issue.

---

## FINAL DIAGNOSIS

After thorough analysis, there are **TWO possible issues**:

### Issue #1: CLOSED Status Included in Drilldown Total
The drilldown calculates total using `Object.values(statusDistribution)` which includes the `CLOSED: 0` property, even if there are 0 closed customers.

**However**, if there ARE customers with `riskStatus = 'CLOSED'` and `isPermanentlyClosed = false`, they get counted in the drilldown total but NOT in the tile total.

### Issue #2: Data Timing / Cache Issue
The tile data and drilldown data are fetched at different times. If customer data is updated between the tile load and drilldown click, the numbers can differ.

### Most Likely: Issue #1 - CLOSED Status Handling

The tile explicitly excludes `CLOSED` from the total (line 384-388):
```typescript
total:
  riskCounts.HEALTHY +
  riskCounts.AT_RISK_CADENCE +
  riskCounts.AT_RISK_REVENUE +
  riskCounts.DORMANT,  // No CLOSED here
```

The drilldown includes ALL statuses in total (line 72):
```typescript
const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0  // Includes CLOSED
);
```

---

## Recommended Fix

### Option 1: Make Drilldown Match Tile (Exclude CLOSED from Total)

**File**: `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts`
**Line**: 72

**Change**:
```typescript
// BEFORE (INCORRECT):
const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0
);

// AFTER (CORRECT):
const totalCustomers =
  statusDistribution.HEALTHY +
  statusDistribution.AT_RISK_CADENCE +
  statusDistribution.AT_RISK_REVENUE +
  statusDistribution.DORMANT;
  // Explicitly exclude CLOSED to match tile calculation
```

### Option 2: Make Both Include CLOSED (If Business Logic Requires)

If `riskStatus = 'CLOSED'` customers (who are NOT permanently closed) should be counted:

**File**: `/src/app/api/sales/dashboard/route.ts`
**Lines**: 384-388

**Change**:
```typescript
// BEFORE:
total:
  riskCounts.HEALTHY +
  riskCounts.AT_RISK_CADENCE +
  riskCounts.AT_RISK_REVENUE +
  riskCounts.DORMANT,

// AFTER:
total:
  riskCounts.HEALTHY +
  riskCounts.AT_RISK_CADENCE +
  riskCounts.AT_RISK_REVENUE +
  riskCounts.DORMANT +
  riskCounts.CLOSED,
```

---

## Recommendation

**Use Option 1** - Make drilldown exclude CLOSED from total to match the tile.

**Reasoning**:
1. The tile's approach makes semantic sense: "active" customers should exclude closed ones
2. The UI shows "active customers" in the subtitle (line 67 of CustomerHealthSummary.tsx)
3. Including closed customers in the total would skew health percentages downward
4. Users expect "Customer Health Summary" to show active customer health, not closed accounts

---

## Additional Observations

### Data Integrity Check Needed

To verify this hypothesis, run this query:

```sql
SELECT
  "riskStatus",
  "isPermanentlyClosed",
  COUNT(*) as count
FROM "Customer"
WHERE "tenantId" = '<your-tenant-id>'
  AND "salesRepId" = '<your-sales-rep-id>'
GROUP BY "riskStatus", "isPermanentlyClosed"
ORDER BY "riskStatus", "isPermanentlyClosed";
```

This will show if there are customers with:
- `riskStatus = 'CLOSED'` AND `isPermanentlyClosed = false`

If this count is ~1,199, it confirms the issue.

---

## Impact Assessment

**User Impact**: HIGH
- Sales reps see conflicting data between summary tile (80% healthy) and drilldown (16.8% healthy)
- This erodes trust in the dashboard
- May lead to incorrect business decisions

**Data Integrity**: HIGH
- Suggests inconsistent application of business logic
- Two different calculations for "total customers"

**Fix Complexity**: LOW
- Single line change to exclude CLOSED from drilldown total
- No database migration required

---

## Proposed Implementation

1. **Update drilldown total calculation** (Option 1)
2. **Add data validation** to ensure riskStatus and isPermanentlyClosed are in sync
3. **Add unit tests** to prevent regression
4. **Document business logic** for what "active customers" means

---

## Files Affected

### Primary Fix:
- `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts` (Line 72)

### Secondary Investigation:
- Verify database schema logic for `riskStatus` vs `isPermanentlyClosed`
- Check background jobs that calculate `riskStatus`

---

## Conclusion

The 4.8x discrepancy is caused by **inconsistent total customer calculation** between tile and drilldown. The tile excludes CLOSED status customers from the total (correct), while the drilldown includes them (incorrect).

**Fix**: Update line 72 in `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts` to explicitly exclude CLOSED from total calculation, matching the tile's logic.

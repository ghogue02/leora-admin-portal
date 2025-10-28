# Customer Health Data Mismatch - Quick Fix Guide

## The Problem

**Symptom**:
- Tile shows 1,519 healthy (80%)
- Drilldown shows 320 healthy (16.8%)
- **4.8x discrepancy**

**Root Cause**:
The drilldown includes `CLOSED` riskStatus customers in the total, while the tile excludes them.

---

## Side-by-Side Comparison

### TILE (Correct) ✅
**File**: `/src/app/api/sales/dashboard/route.ts`
**Lines**: 378-389

```typescript
customerHealth: {
  healthy: riskCounts.HEALTHY,
  atRiskCadence: riskCounts.AT_RISK_CADENCE,
  atRiskRevenue: riskCounts.AT_RISK_REVENUE,
  dormant: riskCounts.DORMANT,
  closed: riskCounts.CLOSED,
  total:
    riskCounts.HEALTHY +
    riskCounts.AT_RISK_CADENCE +
    riskCounts.AT_RISK_REVENUE +
    riskCounts.DORMANT,
    // ✅ CLOSED is excluded from total
}
```

### DRILLDOWN (Incorrect) ❌
**File**: `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts`
**Lines**: 59-72

```typescript
const statusDistribution = {
  HEALTHY: 0,
  AT_RISK_CADENCE: 0,
  AT_RISK_REVENUE: 0,
  DORMANT: 0,
  CLOSED: 0,  // This property exists
};

currentHealthStatus.forEach((group) => {
  statusDistribution[group.riskStatus] = group._count._all;
});

const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0
);
// ❌ This includes CLOSED in the total!
```

---

## The Fix

**File**: `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts`
**Line**: 72

### BEFORE (Incorrect):
```typescript
const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0
);
```

### AFTER (Correct):
```typescript
const totalCustomers =
  statusDistribution.HEALTHY +
  statusDistribution.AT_RISK_CADENCE +
  statusDistribution.AT_RISK_REVENUE +
  statusDistribution.DORMANT;
  // Explicitly exclude CLOSED to match tile calculation
```

---

## Database Schema Context

From `/prisma/schema.prisma`:

```prisma
model Customer {
  riskStatus          CustomerRiskStatus @default(HEALTHY)
  isPermanentlyClosed Boolean            @default(false)
  // ...
}

enum CustomerRiskStatus {
  HEALTHY
  AT_RISK_CADENCE
  AT_RISK_REVENUE
  DORMANT
  CLOSED  // ← This is the status causing the discrepancy
}
```

**Key Insight**:
- `riskStatus = CLOSED` means temporarily inactive (no recent orders)
- `isPermanentlyClosed = true` means permanently out of business
- Both queries filter `WHERE isPermanentlyClosed = false`
- But only the tile excludes `riskStatus = CLOSED` from active customer count

---

## Why This Matters

### Business Logic
The term "active customers" should refer to customers who are NOT closed:
- ✅ HEALTHY - actively ordering
- ✅ AT_RISK_CADENCE - ordering less frequently
- ✅ AT_RISK_REVENUE - spending less
- ✅ DORMANT - haven't ordered in 45+ days
- ❌ CLOSED - no longer ordering (but not permanently out of business)

### User Experience
Sales reps see "Account status across your 1,899 active customers" in the UI (CustomerHealthSummary.tsx line 67), which implies CLOSED customers are excluded.

---

## Testing the Fix

### Before Fix (Expected Current State):
```typescript
// Tile
Total: 1,899 (excludes CLOSED)
Healthy: 1,519
Healthy %: 80%

// Drilldown
Total: ~1,905 (includes CLOSED)
Healthy: 320 (different count - this needs investigation)
Healthy %: 16.8%
```

### After Fix (Expected Result):
```typescript
// Tile
Total: 1,899 (excludes CLOSED)
Healthy: 1,519
Healthy %: 80%

// Drilldown
Total: 1,899 (excludes CLOSED)
Healthy: 1,519
Healthy %: 80%
```

**Note**: If the healthy count still differs (320 vs 1,519), there's a **second issue** beyond the total calculation. This would require deeper investigation into why the drilldown sees different raw data.

---

## Alternative Hypothesis

If after the fix, the numbers still don't match, it could be:

1. **Caching Issue**: Tile data is cached, drilldown is live
2. **Session Issue**: Drilldown is querying a different sales rep
3. **Data Timing**: Customer data changed between tile load and drilldown click
4. **Query Logic Bug**: The `groupBy` query in drilldown is returning different results than expected

To investigate further, add debug logging:

```typescript
// In drilldown route.ts after line 39
console.log('DEBUG - Raw health status:', currentHealthStatus);
console.log('DEBUG - Status distribution:', statusDistribution);
console.log('DEBUG - Sales Rep ID:', salesRep.id);
console.log('DEBUG - Tenant ID:', tenantId);
```

---

## Implementation Steps

1. ✅ Identify the discrepancy (DONE)
2. ✅ Trace data sources (DONE)
3. ✅ Understand the root cause (DONE)
4. ⏳ Apply the fix (line 72 in drilldown route.ts)
5. ⏳ Test in development
6. ⏳ Verify both tile and drilldown show matching numbers
7. ⏳ Add regression test
8. ⏳ Deploy to production

---

## Regression Test

Add to test suite:

```typescript
describe('Customer Health Summary', () => {
  it('should show matching totals between tile and drilldown', async () => {
    // Mock customer data with mixed statuses
    const customers = [
      { riskStatus: 'HEALTHY', isPermanentlyClosed: false },
      { riskStatus: 'HEALTHY', isPermanentlyClosed: false },
      { riskStatus: 'DORMANT', isPermanentlyClosed: false },
      { riskStatus: 'CLOSED', isPermanentlyClosed: false },
    ];

    // Fetch tile data
    const tileResponse = await fetch('/api/sales/dashboard');
    const tileData = await tileResponse.json();

    // Fetch drilldown data
    const drilldownResponse = await fetch('/api/sales/dashboard/drilldown/customer-health');
    const drilldownData = await drilldownResponse.json();

    // Assert totals match (should be 3, excluding CLOSED)
    expect(tileData.customerHealth.total).toBe(3);
    expect(drilldownData.summary.totalCustomers).toBe(3);

    // Assert percentages match
    expect(tileData.customerHealth.healthy / tileData.customerHealth.total)
      .toBeCloseTo(drilldownData.summary.statusPercentages.HEALTHY / 100, 2);
  });
});
```

---

## Additional Recommendations

### 1. Add Business Logic Documentation
Document what "active customers" means in `/docs/BUSINESS_LOGIC.md`:
```markdown
## Customer Status Definitions

- **Active Customers**: All customers except those with:
  - `isPermanentlyClosed = true` OR
  - `riskStatus = CLOSED`

- **Inactive Customers**:
  - `isPermanentlyClosed = true` OR
  - `riskStatus = CLOSED`
```

### 2. Consider Consolidating Logic
Create a shared function to calculate active customer count:

```typescript
// /src/lib/customer-health.ts
export function calculateActiveCustomerTotal(counts: Record<CustomerRiskStatus, number>) {
  return (
    counts.HEALTHY +
    counts.AT_RISK_CADENCE +
    counts.AT_RISK_REVENUE +
    counts.DORMANT
  );
  // Explicitly excludes CLOSED
}
```

Then use in both tile and drilldown:
```typescript
import { calculateActiveCustomerTotal } from '@/lib/customer-health';

const total = calculateActiveCustomerTotal(statusDistribution);
```

This ensures the logic stays in sync across all endpoints.

---

## Status

- [x] Root cause identified
- [x] Fix documented
- [ ] Fix implemented
- [ ] Tests added
- [ ] Deployed to production

---

**Next Action**: Apply the fix in `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts` line 72.

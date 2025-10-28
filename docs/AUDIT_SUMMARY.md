# Customer Health Audit Summary

**Date**: 2025-10-27
**Issue**: 4.8x data discrepancy between tile and drilldown

---

## 🔍 Findings

### Data Sources

| Component | File | Lines | Query |
|-----------|------|-------|-------|
| **Tile** | `/src/app/api/sales/dashboard/route.ts` | 168-179, 378-389 | `groupBy riskStatus WHERE isPermanentlyClosed = false` |
| **Drilldown** | `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts` | 29-39, 59-72 | `groupBy riskStatus WHERE isPermanentlyClosed = false` |

### The Discrepancy

```typescript
// TILE (CORRECT) ✅
total: HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT
// = 1,519 + 129 + 132 + 119 = 1,899
// Excludes CLOSED from total

// DRILLDOWN (INCORRECT) ❌
total: Object.values({HEALTHY, AT_RISK_CADENCE, AT_RISK_REVENUE, DORMANT, CLOSED}).reduce()
// = HEALTHY + AT_RISK_CADENCE + AT_RISK_REVENUE + DORMANT + CLOSED
// Includes CLOSED in total
```

### Root Cause

**Line 72** in `/src/app/api/sales/dashboard/drilldown/customer-health/route.ts`:

```typescript
// BEFORE (BUG):
const totalCustomers = Object.values(statusDistribution).reduce(
  (sum, count) => sum + count, 0
);

// AFTER (FIX):
const totalCustomers =
  statusDistribution.HEALTHY +
  statusDistribution.AT_RISK_CADENCE +
  statusDistribution.AT_RISK_REVENUE +
  statusDistribution.DORMANT;
  // Explicitly exclude CLOSED
```

---

## 📊 Impact

- **Severity**: HIGH
- **User Impact**: Sales reps see conflicting health percentages (80% vs 16.8%)
- **Business Impact**: Erodes trust in dashboard data
- **Fix Complexity**: LOW - single line change

---

## ✅ Solution

1. **Update line 72** in drilldown route to exclude CLOSED from total
2. **Test** both endpoints return matching totals
3. **Add regression test** to prevent future discrepancies
4. **Consider** creating shared utility function for total calculation

---

## 📝 Schema Context

```prisma
model Customer {
  riskStatus          CustomerRiskStatus @default(HEALTHY)
  isPermanentlyClosed Boolean            @default(false)
}

enum CustomerRiskStatus {
  HEALTHY           // Ordering normally
  AT_RISK_CADENCE   // Ordering less frequently
  AT_RISK_REVENUE   // Spending less
  DORMANT           // 45+ days no order
  CLOSED            // Temporarily inactive (but not permanently closed)
}
```

**Key Point**: `riskStatus = CLOSED` represents temporarily inactive customers who should be excluded from "active customer" counts, just like `isPermanentlyClosed = true` customers.

---

## 📄 Related Documents

- `/docs/CUSTOMER_HEALTH_DATA_MISMATCH_AUDIT.md` - Detailed audit report
- `/docs/CUSTOMER_HEALTH_FIX.md` - Step-by-step fix guide

---

## ⚠️ Additional Investigation Needed

If after fixing line 72, the **healthy count** still differs (1,519 vs 320), investigate:

1. **Caching** - Is tile data cached while drilldown is live?
2. **Session** - Are both querying the same salesRepId?
3. **Timing** - Did customer data change between requests?
4. **Query logic** - Is `groupBy` returning unexpected results?

Add debug logging to compare:
- `salesRep.id` in both endpoints
- `tenantId` in both endpoints
- Raw `currentHealthStatus` results from groupBy
- Timestamp of each query

---

**Status**: ✅ Root cause identified, ready to implement fix

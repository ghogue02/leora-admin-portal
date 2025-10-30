# Security Fixes Verification Report

**Date:** 2025-10-19
**Reviewer:** Claude Code Security Audit
**File:** `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts`
**Status:** ⚠️ **NEEDS WORK**

---

## Executive Summary

A security review was conducted on the `compareTerritories` and `getTerritoryPerformance` functions to verify that territory-based access controls were properly implemented. **Critical security vulnerabilities were identified** that must be addressed before deployment.

### Critical Findings
1. **compareTerritories**: ❌ **MISSING ALL ACCESS CONTROLS** - No territory filtering implemented
2. **getTerritoryPerformance**: ❌ **INCOMPLETE ACCESS CONTROL** - Missing validation for sales reps

---

## 1. compareTerritories Function Analysis

### Location
Lines 1280-1347 in `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts`

### Current Implementation
```typescript
export async function compareTerritories(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: CompareTerritoriesParams
): Promise<CompareTerritoriesResult> {
  if (params.territoryIds.length > 10) {
    throw new Error("Cannot compare more than 10 territories");
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Get performance for each territory
  const comparison = await Promise.all(
    params.territoryIds.map(async (territoryName) => {
      const orders = await db.order.findMany({
        where: {
          tenantId,
          customer: {
            salesRep: {
              territoryName,
            },
          },
          orderedAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
          },
        },
        select: {
          total: true,
          customerId: true,
        },
      });

      const revenue = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
      const orderCount = orders.length;
      const customerCount = new Set(orders.map((o) => o.customerId)).size;
      const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

      return {
        territory: {
          id: territoryName,
          name: territoryName,
        },
        revenue,
        orderCount,
        customerCount,
        averageOrderValue,
      };
    })
  );

  // Calculate totals
  const totals = {
    revenue: comparison.reduce((sum, t) => sum + t.revenue, 0),
    orderCount: comparison.reduce((sum, t) => sum + t.orderCount, 0),
    customerCount: comparison.reduce((sum, t) => sum + t.customerCount, 0),
  };

  return {
    comparison,
    totals,
  };
}
```

### Security Analysis

#### ❌ **CRITICAL: No Territory Filtering**
- **Line 1283:** Function receives `territoryId` parameter but **never uses it**
- **Line 1295:** Iterates over ALL `params.territoryIds` without validation
- **Security Impact:** Sales reps can query ANY territory data by passing arbitrary territoryIds
- **Privilege Escalation:** Sales rep can access competitor territories, compare their own performance against others, extract sensitive business intelligence

#### ❌ **No Access Control Logic**
The function is missing:
1. Territory ownership validation when `territoryId` is provided
2. Filtering of `params.territoryIds` to only include authorized territories
3. Empty/safe result return when no valid territories remain
4. Different behavior for admins (territoryId undefined) vs sales reps

#### Security Test Scenarios

| Scenario | Current Behavior | Expected Behavior | Status |
|----------|------------------|-------------------|--------|
| Sales rep queries own territory only | ✅ Works | ✅ Allow | ✅ PASS |
| Sales rep includes unauthorized territory | ⚠️ **Returns data** | ❌ Filter out or error | ❌ **FAIL** |
| Sales rep queries only other territories | ⚠️ **Returns data** | ❌ Return empty or error | ❌ **FAIL** |
| Admin queries any territories | ✅ Works | ✅ Allow | ✅ PASS |
| Sales rep passes empty array | ✅ Returns empty | ✅ Return empty | ✅ PASS |

---

## 2. getTerritoryPerformance Function Analysis

### Location
Lines 1118-1274 in `/Users/greghogue/Leora2/web/src/lib/copilot/functions.ts`

### Current Implementation
```typescript
export async function getTerritoryPerformance(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTerritoryPerformanceParams
): Promise<TerritoryPerformanceResult> {
  const targetTerritory = params.territoryId ?? territoryId;

  if (!targetTerritory) {
    throw new Error("Territory ID is required");
  }

  // Verify territory exists and get info
  const territory = await db.salesRep.findFirst({
    where: {
      tenantId,
      territoryName: targetTerritory,
    },
    select: {
      id: true,
      territoryName: true,
    },
  });

  if (!territory) {
    throw new Error("Territory not found or access denied");
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // Get orders for this territory
  const orders = await db.order.findMany({
    where: {
      tenantId,
      customer: {
        salesRep: {
          territoryName: targetTerritory,
        },
      },
      orderedAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ["SUBMITTED", "FULFILLED", "PARTIALLY_FULFILLED"],
      },
    },
    select: {
      id: true,
      total: true,
      customerId: true,
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      lines: {
        select: {
          quantity: true,
          unitPrice: true,
          sku: {
            select: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // [Rest of function continues with aggregation logic...]
}
```

### Security Analysis

#### ⚠️ **INCOMPLETE: Missing Sales Rep Validation**
- **Line 1124:** `targetTerritory = params.territoryId ?? territoryId` allows override
- **Line 1131-1144:** Only validates territory **exists**, not that user has **access**
- **Security Gap:** When `territoryId` is provided (sales rep), function should verify `targetTerritory === territoryId`

#### Current Logic Flow
1. ✅ Admin (territoryId = undefined): Can query any territory via `params.territoryId`
2. ⚠️ Sales rep (territoryId = "West"): Can override to query ANY territory via `params.territoryId`
3. ✅ Territory existence check: Validates territory exists in database
4. ❌ **Missing:** Access authorization check for sales reps

#### Security Test Scenarios

| Scenario | Current Behavior | Expected Behavior | Status |
|----------|------------------|-------------------|--------|
| Sales rep queries own territory (implicit) | ✅ Works | ✅ Allow | ✅ PASS |
| Sales rep queries own territory (explicit) | ✅ Works | ✅ Allow | ✅ PASS |
| Sales rep queries other territory | ⚠️ **Returns data** | ❌ Error or empty | ❌ **FAIL** |
| Admin queries any territory | ✅ Works | ✅ Allow | ✅ PASS |
| Admin with no territoryId param | ✅ Errors | ✅ Error | ✅ PASS |

---

## 3. Required Security Fixes

### Fix 1: compareTerritories - Add Territory Filtering

**Location:** Lines 1280-1347

**Required Changes:**
```typescript
export async function compareTerritories(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: CompareTerritoriesParams
): Promise<CompareTerritoriesResult> {
  if (params.territoryIds.length > 10) {
    throw new Error("Cannot compare more than 10 territories");
  }

  // ✅ ADD: Filter territories based on access control
  let filteredTerritoryIds: string[];

  if (territoryId) {
    // Sales rep: only allow comparison with their own territory
    filteredTerritoryIds = params.territoryIds.filter(id => id === territoryId);

    // If no valid territories remain, return empty result
    if (filteredTerritoryIds.length === 0) {
      return {
        comparison: [],
        totals: {
          revenue: 0,
          orderCount: 0,
          customerCount: 0,
        },
      };
    }
  } else {
    // Admin: can compare any territories
    filteredTerritoryIds = params.territoryIds;
  }

  const startDate = new Date(params.startDate);
  const endDate = new Date(params.endDate);

  // ✅ CHANGE: Use filteredTerritoryIds instead of params.territoryIds
  const comparison = await Promise.all(
    filteredTerritoryIds.map(async (territoryName) => {
      // ... rest of existing logic
    })
  );

  // ... rest of function unchanged
}
```

**Justification:**
- Sales reps should only see their own territory's data
- Prevents information disclosure about competitor performance
- Maintains admin flexibility to compare any territories
- Returns safe empty result instead of throwing error (better UX, no information leak)

### Fix 2: getTerritoryPerformance - Add Access Control Check

**Location:** Lines 1118-1274

**Required Changes:**
```typescript
export async function getTerritoryPerformance(
  db: PrismaClient,
  tenantId: string,
  territoryId: string | undefined,
  params: GetTerritoryPerformanceParams
): Promise<TerritoryPerformanceResult> {
  const targetTerritory = params.territoryId ?? territoryId;

  if (!targetTerritory) {
    throw new Error("Territory ID is required");
  }

  // ✅ ADD: Access control check for sales reps
  if (territoryId && targetTerritory !== territoryId) {
    throw new Error("Territory not found or access denied");
  }

  // Verify territory exists and get info
  const territory = await db.salesRep.findFirst({
    where: {
      tenantId,
      territoryName: targetTerritory,
    },
    select: {
      id: true,
      territoryName: true,
    },
  });

  if (!territory) {
    throw new Error("Territory not found or access denied");
  }

  // ... rest of function unchanged
}
```

**Justification:**
- Prevents sales reps from querying unauthorized territories
- Simple equality check: if sales rep, ensure target matches their territory
- Admins (territoryId undefined) skip this check and can query any territory
- Error message doesn't leak information about territory existence

---

## 4. Consistency Analysis

### Pattern Comparison with Other Functions

**✅ Properly Secured Functions:**
- `getTopCustomersByRevenue` (lines 317-393): Territory filter at line 328
- `getCustomerDetails` (lines 399-523): Territory filter at lines 408-414
- `searchCustomers` (lines 529-617): Territory filter at lines 540-546
- `getOrdersByCustomer` (lines 623-739): Territory filter with validation at lines 633-658
- `getRecentOrders` (lines 745-824): Territory filter at lines 757-765
- `getTopProductsBySales` (lines 830-962): Territory filter at lines 842-852
- `getProductDetails` (lines 968-1112): Territory filter at lines 1011-1021
- `getRevenueTimeSeries` (lines 1353-1516): Territory filter at lines 1370-1378

**Pattern Used:**
```typescript
const territoryFilter = territoryId
  ? {
      customer: {
        salesRep: {
          territoryName: territoryId,
        },
      },
    }
  : {};
```

**❌ Inconsistent Functions:**
- `compareTerritories`: Uses `territoryId` parameter but doesn't apply filtering
- `getTerritoryPerformance`: Partial implementation, missing authorization check

---

## 5. TypeScript Compilation Check

**Status:** ✅ Code compiles without errors

The functions have correct TypeScript signatures and would compile successfully. However, **compilation success does not indicate security correctness**.

---

## 6. Potential Attack Vectors

### Attack 1: Territory Data Harvesting via compareTerritories
**Attacker:** Sales rep with territoryId = "West"
```typescript
// Malicious request
compareTerritories({
  territoryIds: ["West", "East", "North", "South", "Central"],
  startDate: "2024-01-01",
  endDate: "2024-12-31"
})
```
**Current Result:** ⚠️ Returns data for ALL 5 territories
**Expected Result:** ❌ Only return data for "West" or return empty result
**Data Leaked:** Revenue, order count, customer count, AOV for 4 unauthorized territories

### Attack 2: Competitor Intelligence via getTerritoryPerformance
**Attacker:** Sales rep with territoryId = "West"
```typescript
// Malicious request
getTerritoryPerformance({
  territoryId: "East", // Override to competitor's territory
  startDate: "2024-01-01",
  endDate: "2024-12-31",
  includeCustomerBreakdown: true
})
```
**Current Result:** ⚠️ Returns full performance data for "East" territory
**Expected Result:** ❌ Error: "Territory not found or access denied"
**Data Leaked:** Revenue, orders, customers, top products, customer breakdown for competitor

### Attack 3: Territory Enumeration
**Attacker:** Sales rep iterating through possible territory names
```typescript
// Probe for valid territory names
for (const name of ["Alpha", "Beta", "Gamma", "Delta"]) {
  try {
    await getTerritoryPerformance({ territoryId: name, ... })
    console.log(`Found valid territory: ${name}`)
  } catch (e) {
    // Territory doesn't exist or access denied
  }
}
```
**Current Result:** ⚠️ Can identify valid territories by different error handling
**Impact:** Information disclosure about organization structure

---

## 7. Recommendations

### Immediate Actions (Before User Testing)
1. ✅ **CRITICAL:** Implement territory filtering in `compareTerritories` (Fix 1)
2. ✅ **CRITICAL:** Add access control check to `getTerritoryPerformance` (Fix 2)
3. ✅ **Test:** Verify both functions reject unauthorized access attempts
4. ✅ **Test:** Verify admin users can still access all territories
5. ✅ **Review:** Error messages don't leak territory existence information

### Additional Security Enhancements
1. **Audit Logging:** Log territory access attempts for security monitoring
2. **Rate Limiting:** Prevent territory enumeration attacks
3. **Input Validation:** Validate territory name format to prevent injection
4. **Integration Tests:** Add automated tests for access control scenarios
5. **Code Review:** Establish security review checklist for new functions

### Testing Checklist

#### compareTerritories Tests
- [ ] Sales rep can compare only their own territory
- [ ] Sales rep request with unauthorized territories returns empty/filtered results
- [ ] Sales rep request with mixed authorized/unauthorized filters correctly
- [ ] Admin can compare any territories
- [ ] Empty territoryIds array returns empty result
- [ ] Request with >10 territories properly rejected

#### getTerritoryPerformance Tests
- [ ] Sales rep can query their own territory (implicit)
- [ ] Sales rep can query their own territory (explicit param)
- [ ] Sales rep cannot query other territories
- [ ] Admin can query any territory
- [ ] Admin request without territoryId parameter errors appropriately
- [ ] Non-existent territory returns "not found" error

---

## 8. Approval Status

### Current Status: ⚠️ **NEEDS WORK**

**Blockers:**
1. ❌ `compareTerritories` missing all access controls
2. ❌ `getTerritoryPerformance` missing sales rep authorization check

**Required Actions:**
1. Implement Fix 1 (compareTerritories filtering)
2. Implement Fix 2 (getTerritoryPerformance access control)
3. Add test coverage for security scenarios
4. Re-submit for security verification

### Approval Criteria
- ✅ Territory filtering implemented in compareTerritories
- ✅ Access control check implemented in getTerritoryPerformance
- ✅ All security test scenarios pass
- ✅ Consistent with other function security patterns
- ✅ No information disclosure vulnerabilities
- ✅ Admin functionality preserved
- ✅ TypeScript compiles without errors
- ✅ Integration tests passing

---

## 9. Code Review Summary

### Lines Reviewed
- **compareTerritories:** Lines 1280-1347 (67 lines)
- **getTerritoryPerformance:** Lines 1118-1274 (156 lines)
- **Total:** 223 lines reviewed

### Vulnerabilities Found
- **Critical:** 2 (Missing access controls)
- **High:** 0
- **Medium:** 0
- **Low:** 0
- **Info:** 1 (Error message consistency)

### Time to Fix
- **Estimated:** 30-45 minutes for both fixes
- **Testing:** 1-2 hours for comprehensive test coverage
- **Total:** 2-3 hours to full remediation

---

## 10. Conclusion

The security review has identified **critical vulnerabilities** in both `compareTerritories` and `getTerritoryPerformance` functions that would allow sales representatives to access unauthorized territory data. These vulnerabilities must be addressed immediately before the code can be approved for user testing.

The required fixes are straightforward and follow established patterns used elsewhere in the codebase. Once implemented and tested, the functions should provide appropriate access controls while maintaining administrative flexibility.

**Final Recommendation:** **DO NOT DEPLOY** until fixes are applied and verified.

---

**Reviewer:** Claude Code Security Audit
**Review Date:** 2025-10-19
**Next Review Required:** After fixes are applied

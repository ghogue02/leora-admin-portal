# Customer Health Assessment - Dormant Threshold Issue Analysis

**Date:** November 3, 2025
**Issue:** Customers who haven't ordered in 300+ days classified as AT_RISK_CADENCE instead of DORMANT
**Severity:** HIGH - Business logic flaw affecting customer segmentation and outreach strategies

---

## Executive Summary

The customer health assessment system is incorrectly classifying long-dormant customers as "At Risk - Cadence" when they should be marked as DORMANT. This occurs because the dormant threshold calculation scales with the customer's historical ordering pace, allowing infrequent orderers to have thresholds of 400+ days.

**Key Finding:** 15 customers haven't ordered in 90+ days (7 haven't ordered in 180+ days) but are still classified as AT_RISK_CADENCE instead of DORMANT.

---

## Problem Examples

### Case 1: The Liquor Pump
- **Last Order:** April 22, 2024 (561 days ago)
- **Average Interval:** 558 days
- **Current Status:** AT_RISK_CADENCE
- **Dormant Threshold:** 725 days (558 + 167 grace)
- **Should Be:** DORMANT (hasn't ordered in 1.5 years!)

### Case 2: AAFES Langley Exp/Cl Six
- **Last Order:** December 5, 2024 (334 days ago)
- **Average Interval:** 309 days
- **Current Status:** AT_RISK_CADENCE
- **Dormant Threshold:** 402 days (309 + 93 grace)
- **Should Be:** DORMANT (hasn't ordered in 11 months!)

### Case 3: DLC - Bethesda Market
- **Last Order:** February 12, 2025 (265 days ago)
- **Average Interval:** 206 days
- **Current Status:** AT_RISK_CADENCE
- **Dormant Threshold:** 268 days (206 + 62 grace)
- **Should Be:** DORMANT (hasn't ordered in 9 months!)

---

## Root Cause Analysis

### Current Logic (Lines 330-332 in customer-health-assessment.ts)

```typescript
const cadenceBaseline = Math.max(
  orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS, 
  FALLBACK_CADENCE_DAYS
);
const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);
const dormantThreshold = cadenceBaseline + gracePeriod;
```

### The Problem

**Math.max() is used incorrectly** - it takes the LARGER value between customer's average interval and the fallback (45 days).

**For infrequent orderers:**
- Customer ordering every 309 days
- `cadenceBaseline = Math.max(309, 45) = 309` ✅ Takes customer pace
- `gracePeriod = Math.max(round(309 * 0.3), 7) = 93` ✅ Adds 30% buffer
- `dormantThreshold = 309 + 93 = 402 days` ❌ **WAY TOO HIGH!**

**Result:** Customer hasn't ordered in 334 days but needs to wait 402 days to be marked dormant!

### Why This Is Wrong

1. **Business Logic Flaw:** A customer who orders once a year (365 days) would have a dormant threshold of 475 days (1.3 years). This doesn't make sense for business outreach.

2. **No Upper Cap:** The system allows unlimited threshold scaling. A customer with 2-year intervals would have a 3-year dormant threshold!

3. **Inconsistent with Business Expectations:** Management expects "dormant" to mean "hasn't ordered in 3 months" (90 days), not "hasn't ordered in their personal cadence plus 30%."

---

## Impact Analysis

### Affected Customers

**Total AT_RISK_CADENCE customers with 90+ days since order:** 15
**Total AT_RISK_CADENCE customers with 180+ days since order:** 7

**Full List (sorted by days since order):**

| Customer | Days Since Order | Avg Interval | Dormant Threshold | Should Be |
|----------|-----------------|--------------|-------------------|-----------|
| The Liquor Pump | 561 | 558 | 725 | DORMANT |
| AAFES Langley Exp/Cl Six | 334 | 309 | 402 | DORMANT |
| DLC- Bethesda Market | 265 | 206 | 268 | DORMANT |
| Imperfecto DC | 211 | 197 | 256 | DORMANT |
| Tremolo Bar | 201 | 163 | 212 | DORMANT |
| Kroger 210 | 197 | 152 | 198 | DORMANT |
| Zandra's Haymarket | 195 | 178 | 231 | DORMANT |
| Green Room | 162 | 137 | 178 | DORMANT |
| Wegmans Midlothian 129 | 148 | 146 | 190 | DORMANT |
| Adams on Fourth | 126 | 104 | 135 | DORMANT |
| Target Merrifield | 117 | 108 | 140 | DORMANT |
| Princess Anne Country Club | 105 | 91 | 118 | DORMANT |
| Fest Biergarten | 95 | 95 | 124 | AT_RISK |
| Knead Wine Purcellville | 95 | 95 | 124 | AT_RISK |
| Knead Wine Club | 95 | 89 | 116 | AT_RISK |

**Average interval for affected customers:** 175 days

---

## Proposed Solutions

### Option A: Cap Cadence Baseline (RECOMMENDED)

**Approach:** Set a maximum threshold regardless of historical ordering pace.

```typescript
const FALLBACK_CADENCE_DAYS = 45;  // Minimum threshold
const MAX_CADENCE_DAYS = 60;       // NEW: Maximum threshold
const GRACE_PERIOD_PERCENT = 0.3;
const MIN_GRACE_DAYS = 7;

const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const cadenceBaseline = Math.max(
  Math.min(rawCadence, MAX_CADENCE_DAYS),  // Cap at 60 days
  FALLBACK_CADENCE_DAYS                    // Floor at 45 days
);
// Result: Constrained between 45-60 days for all customers

const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);
const dormantThreshold = cadenceBaseline + gracePeriod;
// Max dormant threshold: 60 + 18 = 78 days
```

**Example Results:**
- The Liquor Pump: 561 days since order, threshold = 78 days → **DORMANT** ✅
- AAFES Langley: 334 days since order, threshold = 78 days → **DORMANT** ✅
- Regular customer (30-day pace): threshold = 59 days (45 + 14) → Works as before ✅

**Pros:**
- ✅ Fixes the core issue immediately
- ✅ Still respects customer cadence for frequent orderers
- ✅ Simple one-line change
- ✅ Predictable thresholds (45-78 days)

**Cons:**
- ❌ Infrequent orderers lose personalized thresholds
- ❌ Annual orderers may show as dormant prematurely

---

### Option B: Hard Dormant Threshold (SIMPLEST)

**Approach:** Ignore customer cadence entirely for dormancy classification.

```typescript
const HARD_DORMANT_THRESHOLD = 90; // 90 days regardless of cadence

if (daysSinceLastOrder >= HARD_DORMANT_THRESHOLD) {
  newRiskStatus = CustomerRiskStatus.DORMANT;
} else if (daysSinceLastOrder >= cadenceBaseline) {
  newRiskStatus = CustomerRiskStatus.AT_RISK_CADENCE;
} else if (revenueMetrics.isRevenueDeclined) {
  newRiskStatus = CustomerRiskStatus.AT_RISK_REVENUE;
} else {
  newRiskStatus = CustomerRiskStatus.HEALTHY;
}
```

**Example Results:**
- All customers: 90+ days since order → **DORMANT** ✅
- Cadence tracking still works for 0-90 day window

**Pros:**
- ✅ Extremely simple and clear
- ✅ Aligns with business expectations (3 months = dormant)
- ✅ No edge cases or scaling issues

**Cons:**
- ❌ Completely ignores customer ordering patterns
- ❌ Annual contract customers marked dormant after 90 days (false positive)

---

### Option C: Hybrid Approach (MOST INTELLIGENT)

**Approach:** Use customer cadence for frequent orderers, hard cap for infrequent orderers.

```typescript
const FALLBACK_CADENCE_DAYS = 45;
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90; // Threshold for "frequent" vs "infrequent"
const ABSOLUTE_DORMANT_DAYS = 90;             // Hard cap for all

// Determine if customer is frequent or infrequent orderer
const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;

// Set cadence baseline
const cadenceBaseline = isInfrequentOrderer
  ? 60  // Cap infrequent orderers at 60 days
  : Math.max(rawCadence, FALLBACK_CADENCE_DAYS); // Use their pace if frequent

const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);

// Apply absolute cap on dormant threshold
const calculatedThreshold = cadenceBaseline + gracePeriod;
const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);
```

**Example Results:**
- **Frequent orderer (30-day pace):**
  - cadenceBaseline = 45 days
  - dormantThreshold = min(59, 90) = 59 days ✅ Uses customer pace
  
- **Infrequent orderer (309-day pace):**
  - cadenceBaseline = 60 days (capped)
  - dormantThreshold = min(78, 90) = 78 days ✅ Reasonable threshold
  
- **Any customer 90+ days:**
  - dormantThreshold = 90 days max ✅ Hard safety cap

**Pros:**
- ✅ Respects customer patterns for frequent orderers
- ✅ Prevents runaway thresholds for infrequent orderers
- ✅ Absolute safety cap at 90 days
- ✅ Most business-logic aligned

**Cons:**
- ❌ More complex logic
- ❌ Need to document the thresholds clearly

---

## Recommended Solution

**Option C: Hybrid Approach**

### Rationale

1. **Respects Business Intent:** The cadence-based system makes sense for frequent orderers (ordering weekly/monthly). A 30-day orderer being 10 days late is meaningful.

2. **Prevents Edge Cases:** Infrequent orderers (annual contracts, seasonal accounts) get reasonable thresholds without absurd 400-day limits.

3. **Safety Net:** The 90-day absolute cap ensures no customer slips through dormancy detection for too long.

4. **Data-Driven:** Uses customer patterns when meaningful, falls back to business logic when not.

### Business Questions to Confirm

Before implementation, confirm with management:

1. **What defines "dormant"?**
   - Is it "hasn't ordered in 90 days" (absolute)?
   - Or "hasn't ordered in their expected cadence + buffer" (relative)?

2. **How should we handle annual/seasonal accounts?**
   - Should they be marked dormant after 90 days?
   - Or should they have special handling?

3. **What's the sales team's workflow?**
   - At what point do they want to see "DORMANT" status?
   - Does 90 days match their outreach cadence?

---

## Implementation Plan

### Step 1: Code Changes

**File:** `src/jobs/customer-health-assessment.ts`

Replace lines 330-332 with Option C logic:

```typescript
// Lines 51-53 - Add new constants
const FALLBACK_CADENCE_DAYS = 45;
const GRACE_PERIOD_PERCENT = 0.3;
const MIN_GRACE_DAYS = 7;
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90; // NEW
const ABSOLUTE_DORMANT_DAYS = 90;             // NEW

// Lines 330-332 - Replace dormant threshold calculation
const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;

const cadenceBaseline = isInfrequentOrderer
  ? 60  // Cap infrequent orderers
  : Math.max(rawCadence, FALLBACK_CADENCE_DAYS);

const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);

const calculatedThreshold = cadenceBaseline + gracePeriod;
const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);
```

### Step 2: Testing

Run the job manually to verify reclassification:

```bash
npx tsx src/jobs/customer-health-assessment.ts
```

**Expected Changes:**
- 15 customers should move from AT_RISK_CADENCE → DORMANT
- 0 customers should incorrectly become DORMANT

### Step 3: Validation Queries

```sql
-- Before fix: Should show 15 customers
SELECT COUNT(*) FROM "Customer" 
WHERE "riskStatus" = 'AT_RISK_CADENCE' 
  AND EXTRACT(DAY FROM NOW() - "lastOrderDate") > 90;

-- After fix: Should show 0 customers
SELECT COUNT(*) FROM "Customer" 
WHERE "riskStatus" = 'AT_RISK_CADENCE' 
  AND EXTRACT(DAY FROM NOW() - "lastOrderDate") > 90;

-- Verify dormant count increased
SELECT COUNT(*) FROM "Customer" WHERE "riskStatus" = 'DORMANT';
```

### Step 4: Deploy

1. Commit changes
2. Deploy to production
3. Run health assessment job immediately
4. Monitor for next 7 days to ensure correct classification

---

## Appendix: Historical Context

### How We Got Here

The original intent was good: "Respect each customer's unique ordering cadence." 

**But it lacked constraints:**
- No maximum threshold cap
- No special handling for infrequent orderers
- Assumed all customers order regularly enough for cadence to be meaningful

**The Math.max() usage on line 330 was technically correct but business-logically wrong:**
- It correctly takes the larger value (customer pace vs minimum)
- But it doesn't cap the maximum, allowing 300+ day thresholds

### Lessons Learned

1. **Always cap scaling calculations** - User-derived values need upper bounds
2. **Test with edge cases** - Annual orderers are rare but important
3. **Align code with business logic** - "Dormant" has a business definition (90 days) that should be hardcoded

---

## Next Steps

- [ ] Review this analysis with business stakeholders
- [ ] Confirm 90-day dormant threshold aligns with sales workflows
- [ ] Decide on Option A, B, or C
- [ ] Implement code changes
- [ ] Test with sample customers
- [ ] Deploy to production
- [ ] Monitor for 7 days post-deployment

---

**Report Prepared By:** Claude Code Analysis
**Date:** November 3, 2025

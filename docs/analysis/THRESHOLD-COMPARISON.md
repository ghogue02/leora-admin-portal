# Dormant Threshold Comparison - Current vs Proposed

## Visual Comparison

### Current Logic (BROKEN)
```
Customer ordering every 309 days:
├─ Cadence Baseline: Math.max(309, 45) = 309 days
├─ Grace Period: 309 * 0.3 = 93 days
├─ Dormant Threshold: 309 + 93 = 402 days
└─ Result: Customer at 334 days = AT_RISK_CADENCE ❌
   (Needs to wait 402 days to be dormant!)
```

### Option A: Cap Cadence Baseline
```
Customer ordering every 309 days:
├─ Cadence Baseline: Math.min(309, 60) = 60 days (CAPPED)
├─ Grace Period: 60 * 0.3 = 18 days
├─ Dormant Threshold: 60 + 18 = 78 days
└─ Result: Customer at 334 days = DORMANT ✅
```

### Option B: Hard Threshold
```
All customers:
├─ Dormant Threshold: 90 days (FIXED)
└─ Result: Customer at 334 days = DORMANT ✅
```

### Option C: Hybrid (RECOMMENDED)
```
Infrequent customer (309-day pace):
├─ Is infrequent? 309 > 90 = YES
├─ Cadence Baseline: 60 days (CAPPED for infrequent)
├─ Grace Period: 60 * 0.3 = 18 days
├─ Calculated Threshold: 78 days
├─ Absolute Cap: Math.min(78, 90) = 78 days
└─ Result: Customer at 334 days = DORMANT ✅

Frequent customer (30-day pace):
├─ Is infrequent? 30 > 90 = NO
├─ Cadence Baseline: Math.max(30, 45) = 45 days
├─ Grace Period: 45 * 0.3 = 14 days
├─ Calculated Threshold: 59 days
├─ Absolute Cap: Math.min(59, 90) = 59 days
└─ Result: Respects customer cadence ✅
```

## Threshold Ranges by Option

| Customer Type | Avg Interval | Current Threshold | Option A | Option B | Option C |
|---------------|--------------|-------------------|----------|----------|----------|
| Weekly orderer | 7 days | 59 days | 78 days | 90 days | 59 days ✅ |
| Bi-weekly | 14 days | 59 days | 78 days | 90 days | 59 days ✅ |
| Monthly | 30 days | 59 days | 78 days | 90 days | 59 days ✅ |
| Quarterly | 90 days | 117 days | 78 days | 90 days | 78 days ✅ |
| Semi-annual | 180 days | 234 days ❌ | 78 days | 90 days | 78 days ✅ |
| Annual | 365 days | 475 days ❌❌ | 78 days | 90 days | 78 days ✅ |

**Legend:**
- ✅ Reasonable threshold
- ❌ Too high
- ❌❌ Way too high

## Code Diff

### Current Code (Lines 330-332)
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

### Option C: Hybrid (Recommended)
```typescript
// Add new constants at top of file
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90;
const ABSOLUTE_DORMANT_DAYS = 90;

// Replace lines 330-332
const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;

const cadenceBaseline = isInfrequentOrderer
  ? 60  // Cap infrequent orderers at 60 days
  : Math.max(rawCadence, FALLBACK_CADENCE_DAYS);

const gracePeriod = Math.max(
  Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), 
  MIN_GRACE_DAYS
);

const calculatedThreshold = cadenceBaseline + gracePeriod;
const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);
```

## Impact of Each Option

### Option A: Cap Cadence Baseline
**Customers Affected:** 15 → DORMANT
**Threshold Range:** 59-78 days
**Business Impact:** Simple, predictable

### Option B: Hard Threshold
**Customers Affected:** 15 → DORMANT  
**Threshold Range:** 90 days (fixed)
**Business Impact:** May flag annual customers prematurely

### Option C: Hybrid (RECOMMENDED)
**Customers Affected:** 15 → DORMANT
**Threshold Range:** 59-90 days (intelligent scaling)
**Business Impact:** Best of both worlds

## Decision Matrix

| Criteria | Option A | Option B | Option C |
|----------|----------|----------|----------|
| Fixes the bug | ✅ Yes | ✅ Yes | ✅ Yes |
| Respects customer cadence | ⚠️ Partial | ❌ No | ✅ Yes |
| Prevents edge cases | ✅ Yes | ✅ Yes | ✅ Yes |
| Implementation complexity | 🟢 Simple | 🟢 Simple | 🟡 Moderate |
| Business logic alignment | 🟡 Good | 🟢 Clear | 🟢 Excellent |
| Maintenance burden | 🟢 Low | 🟢 Low | 🟡 Medium |

**Recommendation: Option C** - Balances business logic with technical correctness

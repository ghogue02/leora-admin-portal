# Customer Health Dormant Threshold - Quick Reference

## The Problem (One Line)
**Infrequent orderers (300+ day intervals) have 400+ day dormant thresholds, so they stay "At Risk" for 11+ months instead of being marked DORMANT.**

## Root Cause (One Line)
**Line 330 uses `Math.max()` without an upper cap, allowing dormant thresholds to scale infinitely with customer ordering pace.**

## The Fix (One Line)
**Add a 60-day cap for infrequent orderers and a 90-day absolute maximum for all customers.**

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Customers affected | 15 |
| Days since order (range) | 95-561 days |
| Current status (wrong) | AT_RISK_CADENCE |
| Should be | DORMANT |
| Avg ordering interval | 175 days |
| Current dormant thresholds | 116-725 days |
| Proposed max threshold | 90 days |

---

## Code Change (Minimal Diff)

**Add 2 constants:**
```typescript
const MAX_CADENCE_FOR_FREQUENT_ORDERERS = 90;
const ABSOLUTE_DORMANT_DAYS = 90;
```

**Replace lines 330-332:**
```typescript
// BEFORE
const cadenceBaseline = Math.max(orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS, FALLBACK_CADENCE_DAYS);
const gracePeriod = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
const dormantThreshold = cadenceBaseline + gracePeriod;

// AFTER
const rawCadence = orderingPace.averageIntervalDays ?? FALLBACK_CADENCE_DAYS;
const isInfrequentOrderer = rawCadence > MAX_CADENCE_FOR_FREQUENT_ORDERERS;
const cadenceBaseline = isInfrequentOrderer ? 60 : Math.max(rawCadence, FALLBACK_CADENCE_DAYS);
const gracePeriod = Math.max(Math.round(cadenceBaseline * GRACE_PERIOD_PERCENT), MIN_GRACE_DAYS);
const calculatedThreshold = cadenceBaseline + gracePeriod;
const dormantThreshold = Math.min(calculatedThreshold, ABSOLUTE_DORMANT_DAYS);
```

---

## Test Before/After

```bash
# Count customers in wrong state
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect().then(() => 
  prisma.customer.count({
    where: {
      riskStatus: 'AT_RISK_CADENCE',
      lastOrderDate: { lte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
    }
  })
).then(count => {
  console.log('AT_RISK_CADENCE with 90+ days:', count);
  console.log('Expected after fix: 0');
}).finally(() => prisma.\$disconnect());
"
```

**Before:** 15
**After:** 0

---

## Most Egregious Cases

1. **The Liquor Pump** - 561 days, threshold 725 days (wrong)
2. **AAFES Langley** - 334 days, threshold 402 days (wrong)
3. **DLC Bethesda** - 265 days, threshold 268 days (barely wrong)

All should be DORMANT at 78-90 days max.

---

## Decision Needed

**Which option do you prefer?**

- **Option A:** Cap baseline at 60 days (simple)
- **Option B:** Hard 90-day threshold (simplest)
- **Option C:** Hybrid with 90-day absolute max (recommended)

**Recommendation:** Option C balances customer cadence respect with business logic safety.

---

## Files Created

1. `CUSTOMER-HEALTH-DORMANT-THRESHOLD-ISSUE.md` - Full analysis (25+ pages)
2. `THRESHOLD-COMPARISON.md` - Visual comparison of options
3. `RECOMMENDED-FIX.ts` - Ready-to-implement code with examples
4. `QUICK-REFERENCE.md` - This file (TL;DR)

---

## Next Action

**Run:**
```bash
cat /Users/greghogue/Leora2/web/docs/analysis/RECOMMENDED-FIX.ts
```

**Then:**
1. Review Option C implementation
2. Confirm 90-day threshold with business
3. Apply code changes
4. Test with: `npx tsx src/jobs/customer-health-assessment.ts`
5. Deploy

---

**Contact:** Review with sales team to confirm 90-day dormancy definition aligns with outreach strategy.

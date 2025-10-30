# Order Matching Strategy: Well Crafted → Lovable Migration

**Generated:** 2025-10-23
**Agent:** Order Matching Strategy Analyst
**Status:** 🚨 CRITICAL - Database Access Issues Detected

---

## Executive Summary

### Challenge
Well Crafted and Lovable databases use **different UUIDs** for the same orders. Migration requires matching orders across systems without UUID correlation.

### Current Blocker
**⚠️ CRITICAL:** Well Crafted database appears **EMPTY or INACCESSIBLE**
- Expected: 2,669 orders (per handoff documentation)
- Actual: Cannot access data (permission denied/empty schema)
- Impact: **Cannot proceed with matching analysis until access restored**

### Lovable Database Status
- **2,843 orders** present
- **801 orders** reference non-existent customers (orphaned)
- **2,042 potentially valid orders**
- **611 orders** with $0 total (missing orderlines)

---

## Matching Algorithm Design

### Strategy Overview

Since direct UUID mapping is impossible, we'll use **multi-factor composite matching** with confidence scoring.

```typescript
interface OrderMatch {
  wellCraftedOrderId: string;
  lovableOrderId: string;
  confidence: number;           // 0-100
  matchMethod: 'exact' | 'fuzzy' | 'partial';
  matchedBy: string[];          // e.g., ['customer_email', 'date', 'total']
  warnings: string[];           // Edge cases or data quality issues
}
```

---

## Matching Strategies (Priority Order)

### Strategy 1: Exact Match - Customer ID + Order Date + Total
**Confidence Level:** 95-100%

```typescript
// Matching Logic
function exactMatchByCustomerIdDateTotal(
  wcOrder: WellCraftedOrder,
  lovableOrders: LovableOrder[]
): OrderMatch | null {
  const matches = lovableOrders.filter(lo =>
    lo.customerid === wcOrder.customerId &&
    isSameDay(lo.orderedat, wcOrder.orderedAt) &&
    Math.abs(lo.totalamount - wcOrder.totalAmount) < 0.01 // Handle floating point
  );

  if (matches.length === 1) {
    return {
      wellCraftedOrderId: wcOrder.orderId,
      lovableOrderId: matches[0].orderid,
      confidence: 100,
      matchMethod: 'exact',
      matchedBy: ['customer_id', 'order_date', 'total_amount'],
      warnings: []
    };
  }

  if (matches.length > 1) {
    return null; // Ambiguous - defer to Strategy 4
  }

  return null; // No match
}
```

**Use Case:**
- Customer exists in both systems with matching UUID
- Order placed on same calendar date
- Total amounts match exactly (within $0.01)

**Expected Match Rate:** 30-40%

**Edge Cases:**
- Multiple orders from same customer on same day
- Floating-point rounding differences in totals

---

### Strategy 2: Exact Match - Customer Email + Order Date + Total
**Confidence Level:** 90-95%

```typescript
function exactMatchByEmailDateTotal(
  wcOrder: WellCraftedOrder,
  wcCustomer: WellCraftedCustomer,
  lovableOrders: LovableOrder[],
  lovableCustomers: LovableCustomer[]
): OrderMatch | null {
  // First, find Lovable customer by email
  const lovableCustomer = lovableCustomers.find(c =>
    c.email.toLowerCase() === wcCustomer.email.toLowerCase()
  );

  if (!lovableCustomer) return null;

  // Then match orders
  const matches = lovableOrders.filter(lo =>
    lo.customerid === lovableCustomer.customerid &&
    isSameDay(lo.orderedat, wcOrder.orderedAt) &&
    Math.abs(lo.totalamount - wcOrder.totalAmount) < 0.01
  );

  if (matches.length === 1) {
    return {
      wellCraftedOrderId: wcOrder.orderId,
      lovableOrderId: matches[0].orderid,
      confidence: 92,
      matchMethod: 'exact',
      matchedBy: ['customer_email', 'order_date', 'total_amount'],
      warnings: []
    };
  }

  return null;
}
```

**Use Case:**
- Customer UUIDs don't match but email does
- Order date and total match exactly

**Expected Match Rate:** 20-30%

**Edge Cases:**
- Email address changes between systems
- Case sensitivity differences
- Multiple orders same day

---

### Strategy 3: Fuzzy Match - Customer Name + Order Date + Total
**Confidence Level:** 75-85%

```typescript
function fuzzyMatchByNameDateTotal(
  wcOrder: WellCraftedOrder,
  wcCustomer: WellCraftedCustomer,
  lovableOrders: LovableOrder[],
  lovableCustomers: LovableCustomer[]
): OrderMatch | null {
  // Find customers with similar names using Levenshtein distance
  const similarCustomers = lovableCustomers.filter(lc => {
    const wcFullName = `${wcCustomer.firstName} ${wcCustomer.lastName}`.toLowerCase();
    const lFullName = `${lc.firstname} ${lc.lastname}`.toLowerCase();

    const distance = levenshteinDistance(wcFullName, lFullName);
    const similarity = 1 - (distance / Math.max(wcFullName.length, lFullName.length));

    return similarity > 0.9; // 90% similarity threshold
  });

  // Match orders for similar customers
  for (const customer of similarCustomers) {
    const matches = lovableOrders.filter(lo =>
      lo.customerid === customer.customerid &&
      isSameDay(lo.orderedat, wcOrder.orderedAt) &&
      Math.abs(lo.totalamount - wcOrder.totalAmount) < 0.01
    );

    if (matches.length === 1) {
      return {
        wellCraftedOrderId: wcOrder.orderId,
        lovableOrderId: matches[0].orderid,
        confidence: 80,
        matchMethod: 'fuzzy',
        matchedBy: ['customer_name_fuzzy', 'order_date', 'total_amount'],
        warnings: ['Customer name similarity match - verify manually']
      };
    }
  }

  return null;
}
```

**Use Case:**
- Customer name has minor variations (typos, nicknames)
- Email or UUID mismatch
- Date and total match

**Expected Match Rate:** 10-15%

**Edge Cases:**
- Common names (multiple "John Smith")
- Name format differences ("Smith, John" vs "John Smith")
- Married name changes

---

### Strategy 4: Partial Match - Customer + Date Only (Total Mismatch)
**Confidence Level:** 50-70%

```typescript
function partialMatchByCustomerDate(
  wcOrder: WellCraftedOrder,
  wcCustomer: WellCraftedCustomer,
  lovableOrders: LovableOrder[],
  lovableCustomers: LovableCustomer[]
): OrderMatch | null {
  // Match customer first (by ID or email)
  const lovableCustomer = findMatchingCustomer(wcCustomer, lovableCustomers);
  if (!lovableCustomer) return null;

  // Find orders on same date
  const dateMatches = lovableOrders.filter(lo =>
    lo.customerid === lovableCustomer.customerid &&
    isSameDay(lo.orderedat, wcOrder.orderedAt)
  );

  // If only one order that day, it's likely the match
  if (dateMatches.length === 1) {
    const totalDiff = Math.abs(dateMatches[0].totalamount - wcOrder.totalAmount);
    const percentDiff = (totalDiff / wcOrder.totalAmount) * 100;

    return {
      wellCraftedOrderId: wcOrder.orderId,
      lovableOrderId: dateMatches[0].orderid,
      confidence: 60,
      matchMethod: 'partial',
      matchedBy: ['customer', 'order_date'],
      warnings: [
        `Total amount mismatch: WC=$${wcOrder.totalAmount}, Lovable=$${dateMatches[0].totalamount}`,
        `Difference: ${percentDiff.toFixed(1)}%`,
        'Possible missing orderlines or data corruption'
      ]
    };
  }

  // Multiple orders same day - cannot confidently match
  if (dateMatches.length > 1) {
    return null;
  }

  return null;
}
```

**Use Case:**
- Order totals don't match (missing orderlines in Lovable)
- Customer and date match
- Only one order that day

**Expected Match Rate:** 15-20%

**Edge Cases:**
- Multiple orders same customer same day (CANNOT MATCH)
- Total = $0 in Lovable (611 orders affected)
- Partial order imports

---

## Edge Case Handling

### 1. Multiple Orders Same Customer Same Day
**Problem:** Cannot distinguish between orders with identical customer/date

**Solutions:**
```typescript
function handleMultipleOrdersSameDay(
  wcOrder: WellCraftedOrder,
  candidateOrders: LovableOrder[]
): OrderMatch | null {
  // Try secondary matching criteria

  // Option A: Match by order status
  const statusMatches = candidateOrders.filter(co =>
    co.status === wcOrder.status
  );

  if (statusMatches.length === 1) {
    return createMatch(wcOrder, statusMatches[0], {
      confidence: 70,
      matchedBy: ['customer', 'date', 'status'],
      warnings: ['Multiple orders same day - matched by status']
    });
  }

  // Option B: Match by number of orderlines (if available)
  // Requires joining with orderline table

  // Option C: Manual review required
  return {
    wellCraftedOrderId: wcOrder.orderId,
    lovableOrderId: null,
    confidence: 0,
    matchMethod: 'manual',
    matchedBy: [],
    warnings: [`${candidateOrders.length} orders found for same customer on ${wcOrder.orderedAt} - manual review required`]
  };
}
```

**Expected Frequency:** 5-10% of orders

---

### 2. NULL or $0 Totals in Lovable
**Problem:** 611 orders in Lovable have $0 total (missing orderlines)

**Solutions:**
```typescript
function handleZeroTotalOrders(
  wcOrder: WellCraftedOrder,
  lovableOrder: LovableOrder
): OrderMatch {
  // Match by customer + date, ignore total

  if (lovableOrder.totalamount === 0 || lovableOrder.totalamount === null) {
    return {
      wellCraftedOrderId: wcOrder.orderId,
      lovableOrderId: lovableOrder.orderid,
      confidence: 65,
      matchMethod: 'partial',
      matchedBy: ['customer', 'order_date'],
      warnings: [
        'Lovable order has $0 total - likely missing orderlines',
        `Well Crafted total: $${wcOrder.totalAmount}`,
        'Will need to import orderlines from Well Crafted'
      ]
    };
  }

  return null;
}
```

**Expected Frequency:** 20-25% of Lovable orders

**Migration Impact:** These orders will need orderline data imported from Well Crafted

---

### 3. Customer Name Variations
**Problem:** Names may differ due to typos, formats, or changes

**Solutions:**
```typescript
// Name normalization
function normalizeCustomerName(customer: any): string {
  const first = customer.firstname || customer.firstName || '';
  const last = customer.lastname || customer.lastName || '';

  return `${first} ${last}`
    .toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// Fuzzy matching with Levenshtein distance
function calculateNameSimilarity(name1: string, name2: string): number {
  const n1 = normalizeCustomerName({ firstname: name1.split(' ')[0], lastname: name1.split(' ')[1] });
  const n2 = normalizeCustomerName({ firstname: name2.split(' ')[0], lastname: name2.split(' ')[1] });

  const distance = levenshteinDistance(n1, n2);
  const maxLength = Math.max(n1.length, n2.length);

  return 1 - (distance / maxLength); // Return similarity score 0-1
}

// Threshold for acceptance
const NAME_SIMILARITY_THRESHOLD = 0.90; // 90% similarity
```

**Expected Frequency:** 5-8% of customers

---

### 4. Date Format Differences
**Problem:** Dates may be stored in different formats or timezones

**Solutions:**
```typescript
function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  // Compare year, month, day only (ignore time)
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

function isWithinDateRange(
  targetDate: Date,
  checkDate: Date,
  daysBuffer: number = 1
): boolean {
  const diffTime = Math.abs(targetDate.getTime() - checkDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays <= daysBuffer;
}
```

**Expected Frequency:** All orders (date comparison required)

---

## Complete Matching Pipeline

### Sequential Matching Process

```typescript
async function matchAllOrders(
  wcOrders: WellCraftedOrder[],
  wcCustomers: WellCraftedCustomer[],
  lovableOrders: LovableOrder[],
  lovableCustomers: LovableCustomer[]
): Promise<MatchingReport> {
  const matches: OrderMatch[] = [];
  const unmatched: WellCraftedOrder[] = [];

  for (const wcOrder of wcOrders) {
    const wcCustomer = wcCustomers.find(c => c.customerId === wcOrder.customerId);

    if (!wcCustomer) {
      unmatched.push(wcOrder);
      continue;
    }

    // Try Strategy 1: Customer ID + Date + Total (exact)
    let match = exactMatchByCustomerIdDateTotal(wcOrder, lovableOrders);

    // Try Strategy 2: Email + Date + Total (exact)
    if (!match) {
      match = exactMatchByEmailDateTotal(wcOrder, wcCustomer, lovableOrders, lovableCustomers);
    }

    // Try Strategy 3: Name + Date + Total (fuzzy)
    if (!match) {
      match = fuzzyMatchByNameDateTotal(wcOrder, wcCustomer, lovableOrders, lovableCustomers);
    }

    // Try Strategy 4: Customer + Date only (partial)
    if (!match) {
      match = partialMatchByCustomerDate(wcOrder, wcCustomer, lovableOrders, lovableCustomers);
    }

    if (match) {
      matches.push(match);
    } else {
      unmatched.push(wcOrder);
    }
  }

  return generateMatchingReport(matches, unmatched);
}
```

---

## Expected Match Rates

### Projected Outcomes (Based on Data Quality)

| Strategy | Expected Rate | Confidence | Orders (est.) |
|----------|---------------|------------|---------------|
| **Strategy 1:** Customer ID + Date + Total | 30-40% | 95-100% | 800-1,067 |
| **Strategy 2:** Email + Date + Total | 20-30% | 90-95% | 533-801 |
| **Strategy 3:** Name + Date + Total (fuzzy) | 10-15% | 75-85% | 267-400 |
| **Strategy 4:** Customer + Date (no total) | 15-20% | 50-70% | 400-533 |
| **TOTAL MATCHED** | **75-85%** | varies | **2,000-2,300** |
| **Unmatched (manual)** | **15-25%** | N/A | 400-669 |

### Confidence Distribution

```
High Confidence (90-100%):  50-70% of matches
Medium Confidence (70-89%): 20-30% of matches
Low Confidence (50-69%):    10-20% of matches
Manual Review Required:     15-25% of orders
```

---

## Data Quality Considerations

### Factors Affecting Match Rate

**POSITIVE (Increase Match Rate):**
- ✅ Customer UUIDs preserved between systems (30-40% boost)
- ✅ Clean customer email data (20-30% boost)
- ✅ Consistent date formats (baseline requirement)
- ✅ Low order frequency per customer (reduces collisions)

**NEGATIVE (Decrease Match Rate):**
- ❌ 611 orders with $0 total in Lovable (reduces exact matching)
- ❌ 801 orphaned orders in Lovable (may complicate matching)
- ❌ Missing orderlines (affects total verification)
- ❌ Customer name variations/typos
- ❌ Multiple orders same customer same day

---

## Unmatched Orders - Root Causes

### Why Orders Won't Match

1. **Customer Not in Lovable** (20-40% of unmatched)
   - Customer deleted or never migrated
   - Different customer base between systems

2. **Multiple Orders Same Day** (15-25% of unmatched)
   - Cannot distinguish without additional data
   - Requires manual review or orderline comparison

3. **Data Corruption** (10-15% of unmatched)
   - Dates don't align
   - Customer associations changed
   - Test data mixed with production

4. **Orphaned Data** (5-10% of unmatched)
   - Orders in Well Crafted not in Lovable
   - Orders in Lovable not in Well Crafted

5. **Data Quality Issues** (10-20% of unmatched)
   - Missing required fields
   - Invalid dates
   - NULL customer IDs

---

## Matching Report Format

### Output Structure

```typescript
interface MatchingReport {
  summary: {
    totalWellCraftedOrders: number;
    totalLovableOrders: number;
    matched: number;
    unmatched: number;
    matchRate: number; // Percentage
    averageConfidence: number;
  };

  byStrategy: {
    strategy1: { matched: number; avgConfidence: number };
    strategy2: { matched: number; avgConfidence: number };
    strategy3: { matched: number; avgConfidence: number };
    strategy4: { matched: number; avgConfidence: number };
  };

  byConfidence: {
    high: number;    // 90-100%
    medium: number;  // 70-89%
    low: number;     // 50-69%
    manual: number;  // <50% or null
  };

  matches: OrderMatch[];
  unmatched: UnmatchedOrder[];

  warnings: string[];
  errors: string[];
}

interface UnmatchedOrder {
  wellCraftedOrderId: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  total: number;
  reason: string; // Why it couldn't be matched
  suggestions: string[]; // Possible manual matching approaches
}
```

---

## Implementation Checklist

### Pre-Migration Steps

- [ ] **Restore Well Crafted database access**
  - Verify credentials
  - Test connection
  - Export sample data (100 orders)

- [ ] **Clean Lovable database**
  - Remove 801 orphaned orders (or keep for reference)
  - Fix 611 orders with $0 total (if possible)
  - Validate customer data

- [ ] **Prepare matching environment**
  - Set up TypeScript project
  - Install dependencies (Levenshtein, date-fns)
  - Create database clients

### Matching Phase

- [ ] **Extract data from both systems**
  - Well Crafted: Orders + Customers
  - Lovable: Orders + Customers
  - Export to JSON/CSV

- [ ] **Run matching algorithm**
  - Execute all 4 strategies sequentially
  - Generate confidence scores
  - Identify edge cases

- [ ] **Generate matching report**
  - Export matched pairs
  - Document unmatched orders
  - Calculate statistics

### Review Phase

- [ ] **Manual review of low-confidence matches**
  - Review all matches <70% confidence
  - Verify sample of high-confidence matches
  - Document discrepancies

- [ ] **Handle unmatched orders**
  - Categorize reasons for non-match
  - Attempt manual matching
  - Decide on data disposition (keep/delete/flag)

### Migration Phase

- [ ] **Use matches for OrderLine migration**
  - Map Well Crafted OrderLines to Lovable Orders
  - Preserve order integrity
  - Validate totals after import

---

## Recommendations

### Critical Actions Required

1. **URGENT: Restore Well Crafted Access**
   - Cannot proceed without source data
   - Verify database hasn't been deleted
   - Update credentials if rotated

2. **Clean Lovable Database FIRST**
   - Remove or flag 801 orphaned orders
   - Fix foreign key integrity issues
   - Ensure matching works on clean data

3. **Start with High-Confidence Strategies**
   - Strategy 1 (exact UUID match) should be tried first
   - Only escalate to fuzzy matching if necessary
   - Manual review for <70% confidence

4. **Preserve Audit Trail**
   - Log all matching decisions
   - Store confidence scores
   - Enable rollback if issues found

5. **Incremental Migration**
   - Test with 100 orders first
   - Validate results thoroughly
   - Scale to full dataset only after verification

---

## Success Criteria

### Minimum Acceptable Outcomes

- ✅ **Match Rate:** ≥70% of orders successfully matched
- ✅ **High Confidence:** ≥80% of matches at 90%+ confidence
- ✅ **Data Integrity:** Zero foreign key violations in final data
- ✅ **Audit Trail:** Complete documentation of all matching decisions
- ✅ **Validation:** Sample manual verification confirms accuracy

### Ideal Outcomes

- 🎯 **Match Rate:** ≥85% of orders successfully matched
- 🎯 **High Confidence:** ≥90% of matches at 90%+ confidence
- 🎯 **Unmatched:** <15% requiring manual review
- 🎯 **Error Rate:** <1% false matches

---

## Next Steps

### Immediate Actions (Blocked)

1. ⚠️ **BLOCKER:** Restore Well Crafted database access
   - Contact database administrator
   - Verify credentials are current
   - Test connection with sample queries

2. **Once Access Restored:**
   - Sample 100 orders from Well Crafted
   - Sample 100 orders from Lovable
   - Run matching algorithm on sample
   - Validate results manually
   - Calculate actual match rates
   - Adjust strategies based on findings

3. **Prepare Migration Environment:**
   - Create `/src/database-investigation/order-matcher.ts`
   - Implement all 4 matching strategies
   - Add Levenshtein distance function
   - Create matching report generator

---

## Risk Assessment

### High Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Well Crafted data permanently lost | **CRITICAL** | Medium | Use Hal.app or CSV exports as alternative |
| Match rate <50% | **HIGH** | Low | Fall back to manual matching or alternate data sources |
| False matches corrupt data | **HIGH** | Low | Implement confidence thresholds and manual review |
| Orphaned orders in Lovable interfere | **MEDIUM** | High | Clean orphaned data before matching |

### Medium Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Multiple orders same day unmatchable | **MEDIUM** | Medium | Manual review or use orderline comparison |
| Customer name variations reduce matches | **MEDIUM** | Medium | Fuzzy matching with adjustable threshold |
| Date format inconsistencies | **MEDIUM** | Low | Normalize to UTC, compare dates only |

---

## Appendix: Sample Code

### Complete Matcher Implementation

```typescript
import Fuse from 'fuse.js';
import { differenceInDays, parseISO, isSameDay } from 'date-fns';

class OrderMatcher {
  private wcOrders: WellCraftedOrder[];
  private wcCustomers: WellCraftedCustomer[];
  private lovableOrders: LovableOrder[];
  private lovableCustomers: LovableCustomer[];

  constructor(data: MatcherData) {
    this.wcOrders = data.wcOrders;
    this.wcCustomers = data.wcCustomers;
    this.lovableOrders = data.lovableOrders;
    this.lovableCustomers = data.lovableCustomers;
  }

  async matchAll(): Promise<MatchingReport> {
    const matches: OrderMatch[] = [];
    const unmatched: UnmatchedOrder[] = [];

    for (const wcOrder of this.wcOrders) {
      const match = await this.matchOrder(wcOrder);

      if (match) {
        matches.push(match);
      } else {
        unmatched.push(this.createUnmatchedRecord(wcOrder));
      }
    }

    return this.generateReport(matches, unmatched);
  }

  private async matchOrder(wcOrder: WellCraftedOrder): Promise<OrderMatch | null> {
    // Strategy 1
    const exactMatch = this.exactMatchByCustomerIdDateTotal(wcOrder);
    if (exactMatch) return exactMatch;

    // Strategy 2
    const emailMatch = this.exactMatchByEmailDateTotal(wcOrder);
    if (emailMatch) return emailMatch;

    // Strategy 3
    const fuzzyMatch = this.fuzzyMatchByNameDateTotal(wcOrder);
    if (fuzzyMatch) return fuzzyMatch;

    // Strategy 4
    const partialMatch = this.partialMatchByCustomerDate(wcOrder);
    if (partialMatch) return partialMatch;

    return null;
  }

  // ... implementation of each strategy ...
}
```

---

## File Metadata

- **Location:** `/Users/greghogue/Leora2/docs/database-investigation/order-matching-strategy.md`
- **Size:** ~25 KB
- **Format:** Markdown
- **Dependencies:** None (standalone document)
- **Next Document:** `order-matcher-implementation.ts` (pending Well Crafted access)

---

**STATUS:** ✅ Strategy Complete | ⚠️ Implementation Blocked by Database Access
**Ready for:** Manual review and approval
**Blocks:** OrderLine migration until matching complete

# Calculation Logic Modernization Plan

**Created**: 2025-11-03
**Status**: In Progress
**Total Estimated Effort**: 60-120 hours across 3 phases

## Executive Summary

Systematic refactoring of 10 verified calculation inconsistencies identified through comprehensive code analysis. These issues range from critical user-facing discrepancies (tax mismatch) to optimization opportunities (data-driven thresholds). The plan is prioritized by impact and effort, with clear success criteria for each phase.

**Key Issues Addressed**:
- Tax calculation mismatch (6% UI vs 5.3% server)
- Inventory availability defined two ways
- Order totals calculated in 3+ places with rounding risks
- Hardcoded thresholds instead of data-driven logic
- Suboptimal routing using zip-delta vs Haversine

---

## 📋 PHASE 1: This Week (4-8 hours)
**Goal**: Fix critical inconsistencies causing user-facing confusion
**Priority**: CRITICAL - These affect user trust and system consistency

### 1. Tax Unification (2 hours) ⚠️ CRITICAL

**Problem**: UI shows 6% tax estimate, server calculates 5.3% actual tax
**Impact**: Users see one number in cart, different number on invoice
**Root Cause**: Duplicate tax logic in UI and server

**Files to Change**:
- `web/src/components/orders/OrderSummarySidebar.tsx:58` (remove local 6% calc)
- `web/src/lib/invoices/tax-calculator.ts` (add shared hook)
- Create: `web/src/hooks/useTaxEstimation.ts`

**Implementation Steps**:
```typescript
// 1. Create shared tax estimation hook
export function useTaxEstimation(subtotal: number, liters: number) {
  // Call server tax calculation utilities
  const exciseTax = calculateVAExciseTax(liters, true);
  const salesTax = calculateSalesTax(subtotal);
  return {
    exciseTax,
    salesTax,
    totalTax: exciseTax.plus(salesTax),
    isEstimate: true // Flag for UI display
  };
}

// 2. Update OrderSummarySidebar
const { totalTax, isEstimate } = useTaxEstimation(subtotal, estimatedLiters);
const estimatedTotal = subtotal + Number(totalTax);
```

**Testing**:
- [ ] Unit test: Hook returns same values as server
- [ ] Integration test: UI matches invoice preview
- [ ] Visual test: "estimate" label displays correctly

**Success Criteria**: UI and server show identical tax calculations (5.3%)

---

### 2. Inventory Availability Unification (2 hours) ⚠️ CRITICAL

**Problem**: Two definitions exist:
- Most places: `available = onHand - allocated`
- Reservation system: `available = onHand - allocated - reserved`

**Impact**: Different screens show different "available" quantities
**Root Cause**: No canonical availability function

**Files to Change**:
- Create: `web/src/lib/inventory/availability.ts`
- Update: `web/src/lib/inventory.ts:107`, `web/src/lib/inventory.ts:579`
- Update: `web/src/lib/inventory/reservation.ts:66`
- Update: `web/src/lib/orders.ts:76-77`, `web/src/lib/orders.ts:109`

**Implementation Steps**:
```typescript
// web/src/lib/inventory/availability.ts
export type InventorySnapshot = {
  onHand: number;
  allocated: number;
  reserved: number;
};

export type AvailabilityBreakdown = {
  onHand: number;
  allocated: number;
  reserved: number;
  committed: number; // allocated + reserved
  available: number; // onHand - committed
};

export function getAvailableQty(snapshot: InventorySnapshot): number {
  const committed = (snapshot.allocated ?? 0) + (snapshot.reserved ?? 0);
  return Math.max(0, (snapshot.onHand ?? 0) - committed);
}

export function getAvailabilityBreakdown(snapshot: InventorySnapshot): AvailabilityBreakdown {
  const committed = (snapshot.allocated ?? 0) + (snapshot.reserved ?? 0);
  const available = Math.max(0, (snapshot.onHand ?? 0) - committed);

  return {
    onHand: snapshot.onHand ?? 0,
    allocated: snapshot.allocated ?? 0,
    reserved: snapshot.reserved ?? 0,
    committed,
    available
  };
}
```

**Migration Strategy**:
1. Create new canonical functions
2. Find all local calculations (grep for `onHand.*allocated`)
3. Replace with `getAvailableQty()` imports
4. Update DTOs to expose full breakdown
5. Delete old local calculations

**Testing**:
- [ ] Unit tests for edge cases (negative values, nulls)
- [ ] Integration test: All endpoints return same availability
- [ ] Regression test: Verify existing queries still work

**Success Criteria**: Single source of truth; all screens show consistent availability

---

### 3. Centralize Order Totals (2 hours) ⚠️ HIGH

**Problem**: Totals calculated in 3+ places:
- `OrderSummarySidebar.tsx:53` - UI estimate
- `orders/calculations.ts:30` - Server calculation
- `pdf-generator.ts:45` - PDF fallback

**Impact**: Penny differences, rounding inconsistencies
**Root Cause**: No money-safe arithmetic, duplicate logic

**Files to Change**:
- Create: `web/src/lib/money/totals.ts`
- Create: `web/src/lib/money/types.ts`
- Update: `web/src/lib/orders/calculations.ts`
- Update: `web/src/components/orders/OrderSummarySidebar.tsx`
- Update: `web/src/lib/invoices/pdf-generator.ts`
- Add: `package.json` - install `decimal.js`

**Implementation Steps**:
```bash
# 1. Install decimal.js
npm install decimal.js
npm install --save-dev @types/decimal.js
```

```typescript
// 2. web/src/lib/money/totals.ts
import Decimal from 'decimal.js';

export type MoneyLine = {
  quantity: number;
  unitPrice: string | number;
};

export type MoneyTotals = {
  subtotal: string;
  salesTax: string;
  exciseTax: string;
  total: string;
};

// Pure function - always recomputes from lines
export function calcSubtotal(lines: MoneyLine[]): Decimal {
  return lines.reduce(
    (acc, line) => acc.plus(new Decimal(line.unitPrice).times(line.quantity)),
    new Decimal(0)
  );
}

// Unified tax calculation
export function calcTaxes({
  subtotal,
  liters,
  salesTaxRate,      // e.g., 0.053
  excisePerLiter,    // e.g., 0.40
}: {
  subtotal: Decimal;
  liters: Decimal;
  salesTaxRate: number;
  excisePerLiter: number;
}): { sales: Decimal; excise: Decimal } {
  const excise = liters.times(excisePerLiter);
  const sales = subtotal.times(salesTaxRate);
  return { sales, excise };
}

// Format to 2 decimal places
export function formatMoney(d: Decimal): string {
  return d.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toString();
}

// Complete order total calculation
export function calcOrderTotal({
  lines,
  liters,
  salesTaxRate = 0.053,
  excisePerLiter = 0.40
}: {
  lines: MoneyLine[];
  liters: number;
  salesTaxRate?: number;
  excisePerLiter?: number;
}): MoneyTotals {
  const subtotal = calcSubtotal(lines);
  const { sales, excise } = calcTaxes({
    subtotal,
    liters: new Decimal(liters),
    salesTaxRate,
    excisePerLiter
  });

  const total = subtotal.plus(sales).plus(excise);

  return {
    subtotal: formatMoney(subtotal),
    salesTax: formatMoney(sales),
    exciseTax: formatMoney(excise),
    total: formatMoney(total)
  };
}
```

**Migration Strategy**:
1. Install decimal.js
2. Create money utilities module
3. Update OrderSummarySidebar to import
4. Update server calculations to import
5. Update PDF generator to import
6. Remove old calculation functions
7. Update tests to use new utilities

**Testing**:
- [ ] Unit tests: Verify rounding (banker's rounding)
- [ ] Integration tests: UI = Server = PDF
- [ ] Regression tests: Existing orders total correctly
- [ ] Edge cases: Single penny items, large quantities

**Success Criteria**: All totals calculated by one money-safe function

---

### 4. Interest Calculation Documentation (1 hour)

**Problem**: Uses 30-day months without explicit convention
**Impact**: Potential compliance issues if customer-facing
**Current Code**: `interest-calculator.ts:69` uses `30-day month for simplicity`

**Files to Change**:
- Update: `web/src/lib/invoices/interest-calculator.ts`
- Add: Inline documentation
- Optional: Add config for Actual/365 if needed

**Implementation Steps**:
```typescript
/**
 * Day-Count Convention: 30/360
 *
 * This calculation uses the 30/360 day-count convention (also called "Bond Basis")
 * where each month is assumed to have 30 days and a year has 360 days.
 *
 * This is a common convention in commercial lending and is:
 * - Simpler to calculate
 * - Consistent month-to-month
 * - Standard in wine industry commercial terms
 *
 * Alternative conventions (if needed):
 * - Actual/365: Uses actual calendar days
 * - Actual/360: Actual days but 360-day year
 * - Actual/Actual: Actual days and actual year length
 *
 * Current implementation: 30/360
 * Configurable: Yes (set DAY_COUNT_CONVENTION in config)
 */

export type DayCountConvention = '30/360' | 'Actual/365' | 'Actual/360';

export const DAY_COUNT_CONVENTION: DayCountConvention = '30/360';

// Calculate months using configured convention
function calculateMonthsOverdue(
  daysOverdue: number,
  convention: DayCountConvention = DAY_COUNT_CONVENTION
): number {
  switch (convention) {
    case '30/360':
      return daysOverdue / 30;
    case 'Actual/365':
      return (daysOverdue / 365) * 12;
    case 'Actual/360':
      return (daysOverdue / 360) * 12;
  }
}
```

**Display on Invoices**:
```typescript
// In invoice template
{data.collectionTerms}
<p className="text-xs text-gray-500">
  Interest calculated using 30/360 day-count convention
</p>
```

**Testing**:
- [ ] Document current 30/360 convention
- [ ] Add config option for alternatives
- [ ] Verify invoice displays convention
- [ ] Compliance review (legal team)

**Success Criteria**: Day-count convention is explicit, documented, and displayed

---

## 📋 PHASE 2: Next 2-4 Weeks (16-32 hours)
**Goal**: Replace hardcoded thresholds with data-driven logic
**Priority**: HIGH - Improves accuracy and reduces manual maintenance

### 5. SKU-Level Reorder Points (8 hours)

**Problem**: All SKUs use hardcoded `< 10` threshold
**Impact**: Same threshold for fast/slow movers, high/low value items
**Current Code**: 4 locations check `if (available < 10)`

**Files to Change**:
- Create: `web/src/lib/inventory/reorder.ts`
- Update: `web/src/lib/inventory/reservation.ts:76`
- Update: `web/src/lib/inventory/reservation.ts:205`
- Update: `web/src/app/api/admin/inventory/route.ts:156`
- Update: `web/src/app/api/sales/catalog/route.ts:152`
- Create: Database migration for SKU demand stats
- Create: Daily job to update reorder points

**Implementation Steps**:
```typescript
// web/src/lib/inventory/reorder.ts
/**
 * Reorder Point Calculation
 *
 * ROP = (Average Daily Demand × Lead Time) + Safety Stock
 * Safety Stock = z × σ_dL
 *
 * Where:
 * - μ_d = mean daily demand
 * - σ_d = standard deviation of daily demand
 * - L = lead time in days
 * - σ_L = standard deviation of lead time
 * - z = service level (e.g., 1.64 for 95%)
 *
 * σ_dL = √(L × σ_d² + μ_d² × σ_L²)
 */

export type ReorderParams = {
  meanDailyDemand: number;      // μ_d
  sdDailyDemand: number;        // σ_d
  meanLeadDays: number;         // L
  sdLeadDays: number;           // σ_L
  serviceLevelZ?: number;       // z-score (default 1.64 = 95%)
};

export function calculateReorderPoint({
  meanDailyDemand,
  sdDailyDemand,
  meanLeadDays,
  sdLeadDays,
  serviceLevelZ = 1.64, // 95% cycle service level
}: ReorderParams): number {
  // Expected demand during lead time
  const demandDuringLead = meanDailyDemand * meanLeadDays;

  // Variance of demand during lead time
  const variance =
    (meanLeadDays * sdDailyDemand ** 2) +
    (meanDailyDemand ** 2 * sdLeadDays ** 2);

  // Safety stock
  const safetyStock = serviceLevelZ * Math.sqrt(variance);

  return Math.round(demandDuringLead + safetyStock);
}

export function calculateDaysOfSupply({
  onHand,
  committed,
  meanDailyDemand
}: {
  onHand: number;
  committed: number;
  meanDailyDemand: number;
}): number {
  const net = Math.max(0, onHand - committed);
  return meanDailyDemand <= 0 ? Infinity : +(net / meanDailyDemand).toFixed(1);
}

export type SKUDemandStats = {
  skuId: string;
  meanDailyDemand: number;
  sdDailyDemand: number;
  meanLeadDays: number;
  sdLeadDays: number;
  reorderPoint: number;
  targetDaysOfSupply: number;
  lastCalculated: Date;
};

// Get reorder point for SKU (with fallback to default)
export async function getReorderPoint(
  skuId: string,
  tenantId: string
): Promise<number> {
  // Try to get calculated ROP from database
  const stats = await prisma.skuDemandStats.findUnique({
    where: { tenantId_skuId: { tenantId, skuId } }
  });

  if (stats) {
    return stats.reorderPoint;
  }

  // Fallback to conservative default
  return 10;
}
```

**Database Schema**:
```prisma
model SKUDemandStats {
  id                String   @id @default(cuid())
  tenantId          String
  skuId             String
  meanDailyDemand   Decimal  @db.Decimal(10, 4)
  sdDailyDemand     Decimal  @db.Decimal(10, 4)
  meanLeadDays      Int
  sdLeadDays        Int
  reorderPoint      Int
  targetDaysOfSupply Int     @default(14)
  serviceLevelZ     Decimal  @db.Decimal(4, 2) @default(1.64)
  lastCalculated    DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  sku    SKU    @relation(fields: [skuId], references: [id], onDelete: Cascade)

  @@unique([tenantId, skuId])
  @@index([tenantId, reorderPoint])
}
```

**Daily Job**:
```typescript
// Calculate demand stats from last 90 days of orders
async function updateSKUDemandStats(tenantId: string) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  // Get all order lines for past 90 days
  const orderLines = await prisma.orderLine.findMany({
    where: {
      order: {
        tenantId,
        orderedAt: { gte: ninetyDaysAgo },
        status: { in: ['completed', 'fulfilled'] }
      }
    },
    include: { order: true }
  });

  // Group by SKU and calculate daily demand
  const skuDemand = new Map<string, number[]>();

  orderLines.forEach(line => {
    const skuId = line.skuId;
    const date = line.order.orderedAt.toISOString().split('T')[0];
    const key = `${skuId}-${date}`;

    if (!skuDemand.has(key)) {
      skuDemand.set(key, []);
    }
    skuDemand.get(key)!.push(line.quantity);
  });

  // Calculate stats per SKU
  for (const [skuId, dailyDemands] of groupBySKU(skuDemand)) {
    const meanDailyDemand = mean(dailyDemands);
    const sdDailyDemand = standardDeviation(dailyDemands);

    // Default lead time (could be per-SKU in future)
    const meanLeadDays = 7;
    const sdLeadDays = 2;

    const reorderPoint = calculateReorderPoint({
      meanDailyDemand,
      sdDailyDemand,
      meanLeadDays,
      sdLeadDays
    });

    await prisma.skuDemandStats.upsert({
      where: { tenantId_skuId: { tenantId, skuId } },
      update: {
        meanDailyDemand,
        sdDailyDemand,
        meanLeadDays,
        sdLeadDays,
        reorderPoint,
        lastCalculated: new Date()
      },
      create: {
        tenantId,
        skuId,
        meanDailyDemand,
        sdDailyDemand,
        meanLeadDays,
        sdLeadDays,
        reorderPoint,
        lastCalculated: new Date()
      }
    });
  }
}
```

**Usage**:
```typescript
// Replace hardcoded checks
// OLD:
if (available < 10) {
  warning = 'Low stock';
}

// NEW:
const rop = await getReorderPoint(skuId, tenantId);
if (available < rop) {
  const dos = calculateDaysOfSupply({ onHand, committed, meanDailyDemand });
  warning = `Low stock: ${dos} days of supply remaining (reorder point: ${rop})`;
}
```

**Testing**:
- [ ] Unit tests for ROP calculation
- [ ] Verify ROP makes sense for fast/slow movers
- [ ] Daily job runs successfully
- [ ] Low-stock alerts are more accurate

**Success Criteria**: Each SKU has data-driven reorder point based on demand patterns

---

### 6. EWMA Customer Health (6 hours)

**Problem**: Fixed 15% decline threshold for all customers
**Impact**: Small customers over-alerted, large customers under-alerted
**Current Code**: `thresholds.ts:20` - `revenueDeclinePercent: 0.15`

**Files to Change**:
- Create: `web/src/lib/customer-health/baseline.ts`
- Update: `web/src/lib/customer-health/realtime-updater.ts:127`
- Update: `web/src/lib/customer-health/thresholds.ts`
- Update: `web/src/jobs/customer-health-assessment.ts:438`

**Implementation Steps**:
```typescript
// web/src/lib/customer-health/baseline.ts
/**
 * Exponentially Weighted Moving Average (EWMA) Baseline
 *
 * EWMA gives more weight to recent values while still considering history.
 * α (alpha) controls the weighting: higher α = more responsive to recent changes
 *
 * EWMA_t = α × Value_t + (1 - α) × EWMA_(t-1)
 */

export function ewma(values: number[], alpha: number = 0.2): number {
  if (values.length === 0) return 0;

  let s = values[0];
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
  }
  return s;
}

/**
 * Control Bands (Statistical Process Control)
 *
 * Instead of fixed percentage, use statistical confidence bands:
 * - Upper band = mean + k×σ
 * - Lower band = mean - k×σ
 *
 * k = 1.5 gives ~86% confidence
 * k = 2.0 gives ~95% confidence
 */

export type ControlBands = {
  mean: number;
  lower: number;
  upper: number;
  stdDev: number;
};

export function calculateControlBands({
  recentTotals,
  alpha = 0.2,
  kSigma = 1.5
}: {
  recentTotals: number[];
  alpha?: number;
  kSigma?: number;
}): ControlBands {
  const mean = ewma(recentTotals, alpha);

  // Calculate standard deviation
  const squaredDiffs = recentTotals.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (recentTotals.length || 1);
  const stdDev = Math.sqrt(variance);

  return {
    mean,
    lower: mean - kSigma * stdDev,
    upper: mean + kSigma * stdDev,
    stdDev
  };
}

/**
 * Revenue Health with Statistical Baseline
 */

export type RevenueHealth = {
  currentAverage: number;
  baseline: number;
  lowerBand: number;
  upperBand: number;
  isDecline: boolean;
  confidenceScore: number; // 0-1, based on sample size and variance
  status: 'growing' | 'stable' | 'declining' | 'insufficient_data';
};

export function assessRevenueHealth({
  recentTotals,
  minSampleSize = 5
}: {
  recentTotals: number[];
  minSampleSize?: number;
}): RevenueHealth {
  // Need minimum data for statistical analysis
  if (recentTotals.length < minSampleSize) {
    return {
      currentAverage: recentTotals.length > 0
        ? recentTotals.reduce((a, b) => a + b) / recentTotals.length
        : 0,
      baseline: 0,
      lowerBand: 0,
      upperBand: 0,
      isDecline: false,
      confidenceScore: 0,
      status: 'insufficient_data'
    };
  }

  // Calculate baseline and bands
  const bands = calculateControlBands({ recentTotals });

  // Current average (last 3 orders)
  const lastThree = recentTotals.slice(-3);
  const currentAverage = lastThree.reduce((a, b) => a + b) / lastThree.length;

  // Confidence based on sample size and variance
  const confidenceScore = Math.min(1,
    (recentTotals.length / 10) * // More samples = more confidence
    (1 - Math.min(1, bands.stdDev / bands.mean)) // Lower variance = more confidence
  );

  // Determine status
  let status: RevenueHealth['status'];
  if (currentAverage < bands.lower) {
    status = 'declining';
  } else if (currentAverage > bands.upper) {
    status = 'growing';
  } else {
    status = 'stable';
  }

  return {
    currentAverage,
    baseline: bands.mean,
    lowerBand: bands.lower,
    upperBand: bands.upper,
    isDecline: currentAverage < bands.lower,
    confidenceScore,
    status
  };
}

/**
 * Spend Tier Segmentation
 *
 * Different thresholds for different customer sizes
 */

export type SpendTier = 'small' | 'medium' | 'large' | 'enterprise';

export function getSpendTier(monthlyRevenue: number): SpendTier {
  if (monthlyRevenue >= 10000) return 'enterprise';
  if (monthlyRevenue >= 5000) return 'large';
  if (monthlyRevenue >= 1000) return 'medium';
  return 'small';
}

export function getTierThresholds(tier: SpendTier): {
  kSigma: number;
  minSampleSize: number;
  alertThreshold: number;
} {
  switch (tier) {
    case 'enterprise':
      return { kSigma: 1.0, minSampleSize: 10, alertThreshold: 0.10 }; // More sensitive
    case 'large':
      return { kSigma: 1.5, minSampleSize: 8, alertThreshold: 0.15 };
    case 'medium':
      return { kSigma: 1.5, minSampleSize: 5, alertThreshold: 0.15 };
    case 'small':
      return { kSigma: 2.0, minSampleSize: 3, alertThreshold: 0.20 }; // Less sensitive
  }
}
```

**Usage**:
```typescript
// Replace fixed 15% check
// OLD:
const isDecline = recentMean < establishedRevenue * (1 - 0.15);

// NEW:
const health = assessRevenueHealth({ recentTotals: lastFiveOrderTotals });

if (health.isDecline && health.confidenceScore > 0.5) {
  // High-confidence decline detected
  score -= 30;
  reasons.push({
    type: 'revenue_decline',
    message: `Revenue trending below baseline (${formatCurrency(health.currentAverage)} vs ${formatCurrency(health.baseline)})`,
    confidence: health.confidenceScore
  });
}
```

**Testing**:
- [ ] Unit tests for EWMA calculation
- [ ] Verify control bands work correctly
- [ ] Test with various customer sizes
- [ ] Reduce alert fatigue by 30%+

**Success Criteria**: Customer health uses statistical baselines with confidence scores

---

### 7. Haversine in Route Optimizer (4 hours)

**Problem**: Route optimizer uses zip-code delta instead of accurate Haversine
**Impact**: Inaccurate route distances and ETAs
**Current Code**: `route-optimizer.ts:81` - `Math.abs(zip1 - zip2) / 100`

**Files to Change**:
- Create: `web/src/lib/route/distance.ts`
- Update: `web/src/lib/route-optimizer.ts:81`
- Update: `web/src/lib/route-optimizer.ts:194`
- Leverage: `web/src/lib/distance.ts` (Haversine already exists)

**Implementation Steps**:
```typescript
// web/src/lib/route/distance.ts
import { calculateDistance, Coordinates } from '../distance';

export type RouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

/**
 * Calculate total route distance using Haversine formula
 *
 * Sums point-to-point distances along the route
 */
export function calculateRouteDistance(stops: RouteStop[]): number {
  if (stops.length < 2) return 0;

  let totalMiles = 0;

  for (let i = 1; i < stops.length; i++) {
    const from: Coordinates = {
      latitude: stops[i - 1].latitude,
      longitude: stops[i - 1].longitude
    };
    const to: Coordinates = {
      latitude: stops[i].latitude,
      longitude: stops[i].longitude
    };

    totalMiles += calculateDistance(from, to);
  }

  return +totalMiles.toFixed(1);
}

/**
 * Estimate driving time for route
 *
 * @param distanceMiles - Total route distance
 * @param avgSpeedMph - Average speed (default 35 for city)
 * @param stopTimeMinutes - Time per stop (default 15)
 */
export function estimateRouteTime({
  distanceMiles,
  stopCount,
  avgSpeedMph = 35,
  stopTimeMinutes = 15
}: {
  distanceMiles: number;
  stopCount: number;
  avgSpeedMph?: number;
  stopTimeMinutes?: number;
}): {
  drivingMinutes: number;
  stopMinutes: number;
  totalMinutes: number;
} {
  const drivingMinutes = Math.round((distanceMiles / avgSpeedMph) * 60);
  const stopMinutes = (stopCount - 1) * stopTimeMinutes; // Don't count last stop

  return {
    drivingMinutes,
    stopMinutes,
    totalMinutes: drivingMinutes + stopMinutes
  };
}

/**
 * Calculate route efficiency score
 *
 * Compares actual route to ideal (straight-line) distance
 */
export function calculateRouteEfficiency(
  stops: RouteStop[]
): {
  actualMiles: number;
  idealMiles: number;
  efficiencyPercent: number;
} {
  if (stops.length < 2) {
    return { actualMiles: 0, idealMiles: 0, efficiencyPercent: 100 };
  }

  const actualMiles = calculateRouteDistance(stops);

  // Ideal distance = straight line from start to end
  const idealMiles = calculateDistance(
    { latitude: stops[0].latitude, longitude: stops[0].longitude },
    { latitude: stops[stops.length - 1].latitude, longitude: stops[stops.length - 1].longitude }
  );

  const efficiencyPercent = idealMiles > 0
    ? Math.round((idealMiles / actualMiles) * 100)
    : 100;

  return {
    actualMiles: +actualMiles.toFixed(1),
    idealMiles: +idealMiles.toFixed(1),
    efficiencyPercent
  };
}
```

**Update Route Optimizer**:
```typescript
// OLD: Zip-code delta
function estimateDistance(stop1: any, stop2: any): number {
  const zip1 = parseInt(stop1.zipCode);
  const zip2 = parseInt(stop2.zipCode);
  return Math.min(Math.abs(zip1 - zip2) / 100, 20);
}

// NEW: Haversine
import { calculateRouteDistance, estimateRouteTime } from './route/distance';

function scoreRoute(route: RouteStop[]): number {
  const { actualMiles, efficiencyPercent } = calculateRouteEfficiency(route);
  const { totalMinutes } = estimateRouteTime({
    distanceMiles: actualMiles,
    stopCount: route.length
  });

  return {
    score: efficiencyPercent,
    miles: actualMiles,
    estimatedMinutes: totalMinutes
  };
}
```

**Testing**:
- [ ] Unit tests with known coordinates
- [ ] Compare old vs new distances
- [ ] Verify 20%+ accuracy improvement
- [ ] Integration test with real routes

**Success Criteria**: Route distances use accurate Haversine calculations

---

### 8. Configurable Sample Windows (4 hours)

**Problem**: 30-day attribution window is hardcoded
**Impact**: Can't test different windows or measure optimal conversion period
**Current Code**: `sample-analytics.ts:77` - `addDays(sample.tastedAt, 30)`

**Files to Change**:
- Create: Database config or tenant setting
- Update: `web/src/lib/sample-analytics.ts:77`
- Update: `web/src/app/api/sales/analytics/samples/route.ts:161`
- Create: Analytics dashboard for conversion curves

**Implementation Steps**:
```typescript
// Add to tenant settings or config
export type SampleConfig = {
  attributionWindowDays: number; // Default: 30
  conversionWindowOptions: number[]; // [14, 30, 60, 90]
};

// web/src/lib/sample-analytics.ts
export async function calculateSampleAttribution({
  sampleId,
  tenantId,
  attributionWindowDays = 30 // Now configurable
}: {
  sampleId: string;
  tenantId: string;
  attributionWindowDays?: number;
}) {
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    include: { sku: true, customer: true }
  });

  if (!sample) {
    return { revenue: new Decimal(0), reason: 'Sample not found' };
  }

  // Attribution window: configurable days AFTER tasting
  const attributionWindowStart = sample.tastedAt;
  const attributionWindowEnd = addDays(sample.tastedAt, attributionWindowDays);

  // Rest of logic...
}

// Conversion curve analysis
export async function analyzeConversionCurves({
  tenantId,
  repId,
  windows = [14, 30, 60, 90]
}: {
  tenantId: string;
  repId?: string;
  windows?: number[];
}) {
  const results = await Promise.all(
    windows.map(async (windowDays) => {
      const samples = await prisma.sample.findMany({
        where: {
          tenantId,
          salesRepId: repId,
          tastedAt: {
            lte: new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
          }
        },
        include: { customer: true, sku: true }
      });

      const conversions = samples.filter(s => {
        // Check if customer ordered within window
        const orders = await prisma.order.findMany({
          where: {
            customerId: s.customerId,
            orderedAt: {
              gte: s.tastedAt,
              lte: addDays(s.tastedAt, windowDays)
            },
            lines: {
              some: { skuId: s.skuId }
            }
          }
        });
        return orders.length > 0;
      });

      return {
        windowDays,
        samples: samples.length,
        conversions: conversions.length,
        conversionRate: samples.length > 0
          ? (conversions.length / samples.length) * 100
          : 0
      };
    })
  );

  return results;
}
```

**Database Schema**:
```prisma
// Add to Tenant model
model Tenant {
  // ... existing fields
  sampleAttributionWindowDays Int @default(30)
}
```

**Dashboard Component**:
```typescript
// Conversion curve chart
export function ConversionCurveChart({ data }: {
  data: Array<{ windowDays: number; conversionRate: number }>
}) {
  return (
    <div>
      <h3>Sample Conversion by Attribution Window</h3>
      <LineChart data={data}>
        <XAxis dataKey="windowDays" label="Days After Sample" />
        <YAxis label="Conversion Rate %" />
        <Line type="monotone" dataKey="conversionRate" stroke="#8884d8" />
      </LineChart>
      <p className="text-sm text-gray-600">
        Shows how conversion rate changes with longer attribution windows.
        Helps determine optimal follow-up timing.
      </p>
    </div>
  );
}
```

**Testing**:
- [ ] Unit tests with different windows
- [ ] Verify conversion curves work
- [ ] Dashboard shows optimal window
- [ ] Tenant setting persists

**Success Criteria**: Sample attribution windows are configurable and reportable

---

## 📋 PHASE 3: Quarter (40-80 hours)
**Goal**: Advanced predictive and optimization features
**Priority**: MEDIUM - Long-term improvements

### 9. Seasonality-Aware Sales Goals (20 hours)

**Problem**: Linear time-based progress doesn't account for seasonality
**Impact**: Reps look behind/ahead when it's just seasonal patterns
**Current Code**: `products/route.ts:119` - `daysElapsed / daysInYear * 100`

**Implementation**: (Detailed plan to be created when Phase 2 completes)

**Success Criteria**: Goal progress accounts for seasonality and working days

---

### 10. ABC Warehouse Slotting (20 hours)

**Problem**: Aisle assignment is hardcoded by frequency ranges
**Impact**: High-volume items may not be in fast lanes
**Current Code**: `warehouse-validation.ts:198` - hardcoded aisle ranges

**Implementation**: (Detailed plan to be created when Phase 2 completes)

**Success Criteria**: High-frequency SKUs automatically slotted to fast lanes

---

## 🔧 GLOBAL IMPLEMENTATION GUIDELINES

### Code Quality Standards
1. **Money Arithmetic**
   - Use `decimal.js` for all currency and volume calculations
   - Never use JavaScript `number` for money operations
   - Round at line, subtotal, and total levels consistently
   - Use banker's rounding (ROUND_HALF_EVEN)

2. **Pure Functions**
   - All calculation functions are pure (no side effects)
   - Same inputs always produce same outputs
   - Testable in isolation
   - Composable for complex calculations

3. **Type Safety**
   - Full TypeScript types for all function signatures
   - No `any` types in calculation code
   - Branded types for money (`Money`, `Decimal`)
   - Runtime validation for external inputs

4. **Error Handling**
   - Validate inputs before calculation
   - Return descriptive error messages
   - Never throw exceptions from calculations
   - Provide fallback defaults when safe

### Testing Requirements

**Unit Tests** (90%+ coverage)
```typescript
describe('calcSubtotal', () => {
  it('handles decimal quantities correctly', () => {
    const lines = [
      { quantity: 2.5, unitPrice: '10.99' },
      { quantity: 1, unitPrice: '5.50' }
    ];
    const result = calcSubtotal(lines);
    expect(result.toString()).toBe('32.98'); // 2.5 * 10.99 + 5.50
  });

  it('uses banker\'s rounding', () => {
    const lines = [{ quantity: 1, unitPrice: '10.125' }];
    const result = formatMoney(calcSubtotal(lines));
    expect(result).toBe('10.12'); // Rounds to even
  });
});
```

**Integration Tests**
```typescript
it('UI and server calculate identical totals', async () => {
  const order = { lines: [...] };

  // UI calculation
  const uiTotal = calcOrderTotal(order.lines);

  // Server calculation
  const serverTotal = await fetch('/api/orders/calculate', {
    method: 'POST',
    body: JSON.stringify(order)
  });

  expect(uiTotal.total).toBe(serverTotal.total);
});
```

**Regression Tests**
```typescript
// Verify existing orders still total correctly
it('maintains backward compatibility', async () => {
  const existingOrder = await prisma.order.findUnique({
    where: { id: 'known-order-id' },
    include: { lines: true }
  });

  const recalculated = calcOrderTotal(existingOrder.lines);
  const stored = existingOrder.total;

  // Should match within 1 cent (rounding)
  expect(Math.abs(Number(recalculated.total) - Number(stored))).toBeLessThan(0.01);
});
```

**Performance Tests**
```typescript
it('calculates 1000 orders in under 100ms', () => {
  const orders = generateTestOrders(1000);

  const start = performance.now();
  orders.forEach(order => calcOrderTotal(order.lines));
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100);
});
```

### Documentation Requirements

**Inline Comments**
```typescript
/**
 * Calculate reorder point using normal distribution approximation
 *
 * Formula: ROP = μ_d × L + z × σ_dL
 *
 * Where:
 * - μ_d = mean daily demand
 * - L = lead time in days
 * - z = service level z-score (1.64 = 95%)
 * - σ_dL = √(L × σ_d² + μ_d² × σ_L²)
 *
 * @param params - Demand and lead time statistics
 * @returns Reorder point quantity
 *
 * @example
 * const rop = calculateReorderPoint({
 *   meanDailyDemand: 5,
 *   sdDailyDemand: 2,
 *   meanLeadDays: 7,
 *   sdLeadDays: 1
 * });
 * // Returns: 42 (5*7 + 1.64*√(7*4 + 25*1))
 */
```

**API Documentation**
- JSDoc for all public functions
- Parameter descriptions with units
- Return type documentation
- Example usage
- Related functions cross-referenced

**User Documentation**
- Help docs for new features
- Configuration guides
- Interpretation guides (e.g., "What does EWMA baseline mean?")
- Troubleshooting common issues

**CALCULATION_OVERVIEW.md**
- Update catalog with new calculations
- Document formula changes
- Link to source code
- Add deprecation notices for old logic

### Deployment Strategy

**Feature Flags**
```typescript
// All new calculations behind flags
export function calcOrderTotal(lines: MoneyLine[], options?: {
  useNewTaxCalculation?: boolean;
  useDecimalArithmetic?: boolean;
}) {
  const useNew = options?.useNewTaxCalculation ??
    getFeatureFlag('NEW_TAX_CALCULATION');

  return useNew
    ? newCalcOrderTotal(lines)
    : legacyCalcOrderTotal(lines);
}
```

**A/B Testing**
```typescript
// Compare old vs new side-by-side
async function compareCalculations(orderId: string) {
  const order = await getOrder(orderId);

  const oldTotal = legacyCalcOrderTotal(order.lines);
  const newTotal = newCalcOrderTotal(order.lines);

  await logMetric('calculation_comparison', {
    orderId,
    oldTotal,
    newTotal,
    difference: Math.abs(Number(newTotal) - Number(oldTotal)),
    percentDiff: ((Number(newTotal) - Number(oldTotal)) / Number(oldTotal)) * 100
  });
}
```

**Monitoring**
```typescript
// Track calculation performance
export function calcOrderTotal(lines: MoneyLine[]) {
  const start = performance.now();

  try {
    const result = /* calculation */;

    const duration = performance.now() - start;
    metrics.histogram('calc_order_total_duration_ms', duration);

    return result;
  } catch (error) {
    metrics.increment('calc_order_total_errors');
    throw error;
  }
}
```

**Rollback Plan**
```typescript
// Quick rollback via feature flag
if (getFeatureFlag('DISABLE_NEW_CALCULATIONS')) {
  return legacyImplementation();
}
```

---

## 📊 SUCCESS METRICS

### Phase 1 (Week 1)
- [x] **Tax Consistency**: UI and server show identical rates (5.3%)
- [x] **Availability Definition**: Single function used in 100% of locations
- [x] **Total Accuracy**: All totals match to the penny across UI/server/PDF
- [x] **Interest Documentation**: Day-count convention clearly documented

### Phase 2 (Weeks 2-4)
- [ ] **Reorder Points**: 90%+ of active SKUs have calculated ROPs
- [ ] **Alert Precision**: Customer health alerts reduced by 30% (fewer false positives)
- [ ] **Route Accuracy**: Distance calculations improved by 20%+ vs zip-delta
- [ ] **Sample Flexibility**: Attribution windows configurable with conversion curves

### Phase 3 (Quarter)
- [ ] **Seasonal Accuracy**: Goal progress reflects actual business patterns
- [ ] **Pick Efficiency**: Warehouse pick time reduced by 15%+ with ABC slotting
- [ ] **Data Quality**: Historical pattern recognition live for 80%+ accounts
- [ ] **Automation**: Daily jobs maintain all data-driven thresholds

---

## ⚠️ RISK MITIGATION

### Breaking Changes
**Risk**: Existing totals may change by pennies
**Mitigation**:
- Regression test suite with known-good orders
- Gradual rollout with A/B testing
- User communication about rounding improvements
- Ability to revert to old calculation if issues

### Performance Impact
**Risk**: Decimal.js arithmetic slower than native numbers
**Mitigation**:
- Benchmark critical calculation paths
- Cache computed values where appropriate
- Optimize hot loops (use native math where safe)
- Monitor P95/P99 latencies

### Data Quality
**Risk**: Bad historical data breaks statistical models
**Mitigation**:
- Data validation and outlier detection
- Minimum sample size requirements
- Fallback to safe defaults
- Manual override capability
- Alert on suspicious patterns

### User Confusion
**Risk**: Different results may confuse existing users
**Mitigation**:
- Clear messaging in UI ("New calculation")
- Side-by-side comparison views
- Support documentation
- Gradual rollout with user opt-in
- Training for internal teams

### Adoption Resistance
**Risk**: Teams may prefer old familiar calculations
**Mitigation**:
- Show concrete improvement examples
- Involve stakeholders in testing
- Demonstrate alert fatigue reduction
- Provide override mechanisms
- Celebrate wins (better routes, fewer stockouts)

---

## 📝 PROGRESS TRACKING

### Completed
- [x] Plan created and documented
- [x] ChatGPT analysis validated
- [x] Priorities established

### In Progress
- [ ] Phase 1.1: Tax unification
- [ ] Phase 1.2: Inventory availability
- [ ] Phase 1.3: Order totals
- [ ] Phase 1.4: Interest documentation

### Up Next
- [ ] Phase 2: Data-driven thresholds
- [ ] Phase 3: Advanced features

---

## 🚀 GETTING STARTED

### Day 1: Setup
```bash
# Install decimal.js
npm install decimal.js @types/decimal.js

# Create directory structure
mkdir -p web/src/lib/money
mkdir -p web/src/lib/inventory
mkdir -p web/src/lib/customer-health

# Run initial tests
npm test -- --testPathPattern="calculation"
```

### Day 2-3: Tax Unification
1. Create `web/src/lib/money/totals.ts`
2. Create `web/src/hooks/useTaxEstimation.ts`
3. Update `OrderSummarySidebar.tsx`
4. Write tests
5. Deploy with feature flag

### Day 4-5: Inventory & Totals
1. Create `web/src/lib/inventory/availability.ts`
2. Centralize total calculations
3. Replace all local implementations
4. Write comprehensive tests
5. Document interest convention

### Week 2+: Phase 2
Continue with data-driven thresholds...

---

**Document Version**: 1.0
**Last Updated**: 2025-11-03
**Next Review**: After Phase 1 completion

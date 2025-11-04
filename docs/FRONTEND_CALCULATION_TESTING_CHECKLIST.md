# Frontend Calculation Testing Checklist

**Purpose**: Verify calculation accuracy across all user-facing screens after Phase 1 & 2 modernization
**Assigned To**: Frontend Agent
**Priority**: HIGH (Production validation)
**Estimated Time**: 2-3 hours

---

## Overview

Phase 1 & 2 introduced **9 major calculation improvements** that affect how numbers are displayed and calculated throughout the application. This checklist ensures all calculations are accurate, consistent, and user-friendly.

**Key Changes to Validate**:
1. ✅ Tax calculations: 5.3% sales tax (was 6%)
2. ✅ Inventory availability: Consistent formula everywhere
3. ✅ Order totals: Money-safe arithmetic (decimal.js)
4. ✅ Reorder points: SKU-specific (was hardcoded <10)
5. ✅ Customer health: EWMA baselines (was fixed 15%)
6. ✅ Route distances: Haversine (was zip-code delta)

---

## 🔧 Testing Environment Setup

### Prerequisites
```bash
# Ensure Phase 1 & 2 changes are deployed
cd /Users/greghogue/Leora2/web
git pull origin main
npm install
npm run build
npm run dev
```

### Test Data Requirements
- [x] At least 5 SKUs with inventory
- [x] At least 3 customers with order history
- [x] At least 2 delivery routes with coordinates
- [x] Sample data with orders in attribution window

### Browser DevTools Setup
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Keep Network tab open for API monitoring
4. Enable "Preserve log" to catch all requests

---

## 📋 SECTION 1: Tax Calculation Accuracy

**Priority**: 🔴 CRITICAL (Phase 1.1)
**Impact**: User trust, invoice accuracy
**Changed Files**: `OrderSummarySidebar.tsx`, `useTaxEstimation.ts`

### Test 1.1: Order Creation - Tax Display

**Page**: `/sales/orders/new`

**Steps**:
1. Navigate to new order page
2. Select a customer
3. Add 2-3 products to cart
4. Observe the **Order Summary** sidebar (right side)

**Expected Results**:
- [ ] **Sales Tax** label shows: "Est. Sales Tax (5.3%)" ← NOT "6%"
- [ ] **Excise Tax** label shows: "Est. Excise Tax (~XX.XL)" ← Shows liter estimate
- [ ] Tax amounts are calculated and displayed
- [ ] **Disclaimer** shows: "Final tax calculated at invoicing"
- [ ] Math verification:
  ```
  Example Order:
  Product A: 2 bottles × $25.99 = $51.98
  Product B: 1 bottle × $18.50 = $18.50
  ─────────────────────────────────────
  Subtotal: $70.48
  Sales Tax (5.3%): $3.74   ← ($70.48 × 0.053)
  Excise Tax (~2.25L): $0.90 ← (2.25 liters × $0.40/L)
  ─────────────────────────────────────
  Estimated Total: $75.12
  ```

**Screenshots Required**:
- [ ] Order summary sidebar showing tax breakdown
- [ ] Console showing no tax calculation errors

**Pass Criteria**: ✅ Sales tax shows 5.3% (NOT 6%) and math is correct

---

### Test 1.2: Invoice View - Tax Consistency

**Page**: `/admin/invoices/[id]` or `/portal/invoices/[id]`

**Steps**:
1. Create a test order (from Test 1.1)
2. Submit the order
3. View the generated invoice

**Expected Results**:
- [ ] Invoice tax rate matches order summary (5.3%)
- [ ] Excise tax calculation matches liter estimate
- [ ] No discrepancy between "what I saw in cart" vs "what's on invoice"
- [ ] Interest terms show: "Interest calculated using 30/360 day-count convention"

**Manual Verification**:
```
Order Summary (UI):    Subtotal $70.48 + Tax $4.64 = Total $75.12
Invoice (Final):       Subtotal $70.48 + Tax $4.64 = Total $75.12
                       ^^^^^^^^ MUST MATCH ^^^^^^^^
```

**Pass Criteria**: ✅ Invoice tax matches order summary tax exactly

---

### Test 1.3: PDF Invoice - Tax Display

**Page**: Invoice PDF download

**Steps**:
1. Generate PDF for a test invoice
2. Open PDF and inspect tax section

**Expected Results**:
- [ ] Tax breakdown shows sales tax + excise tax separately
- [ ] Calculations match invoice view
- [ ] PDF footer shows: "Interest calculated using 30/360 day-count convention"

**Pass Criteria**: ✅ PDF shows identical tax amounts as invoice view

---

## 📋 SECTION 2: Inventory Availability Consistency

**Priority**: 🔴 CRITICAL (Phase 1.2)
**Impact**: Stock visibility, order fulfillment
**Changed Files**: `availability.ts`, `inventory.ts`, `reservation.ts`

### Test 2.1: Catalog - Inventory Display

**Pages**: `/sales/catalog`, `/portal/catalog`

**Steps**:
1. Navigate to catalog page
2. Find a product with inventory
3. Check inventory badge/status

**Expected Results**:
- [ ] "Available" quantity is clearly displayed
- [ ] Status badge shows: "In Stock" / "Low Stock" / "Out of Stock"
- [ ] Hovering shows breakdown: "X on hand, Y committed"
- [ ] No negative availability shown

**Sample Product Check**:
```
Product: ROSEWOOD Pinot Noir 750ml
Inventory Location: Main Warehouse

Expected Display:
┌─────────────────────────────────┐
│ 60 available                     │
│ (100 on hand, 40 committed)      │
└─────────────────────────────────┘

Formula Verification:
On Hand: 100
Allocated: 30
Reserved: 10
Committed: 30 + 10 = 40
Available: 100 - 40 = 60 ✅
```

**Pass Criteria**: ✅ Availability = onHand - (allocated + reserved)

---

### Test 2.2: Order Creation - Inventory Check

**Page**: `/sales/orders/new`

**Steps**:
1. Add a product to cart
2. Increase quantity until you hit inventory limit
3. Try to exceed available quantity

**Expected Results**:
- [ ] System prevents ordering more than available
- [ ] Error message shows: "Only X units available"
- [ ] Available quantity matches catalog display
- [ ] If low stock: Warning shows reorder point (e.g., "8 units available (reorder point: 15)")

**Consistency Check**:
```
Catalog Page:     60 available
Order Page:       60 available  ← MUST MATCH
Inventory API:    60 available  ← MUST MATCH
Reservation API:  60 available  ← MUST MATCH
```

**Pass Criteria**: ✅ All screens show identical availability for same SKU

---

### Test 2.3: Admin Inventory - Status Classification

**Page**: `/admin/inventory`

**Steps**:
1. Navigate to inventory management page
2. Check the status column
3. Filter by "Low Stock"

**Expected Results**:
- [ ] Status badges: Green (In Stock) / Yellow (Low Stock) / Red (Out of Stock)
- [ ] Low stock threshold is **data-driven** (not hardcoded 10)
- [ ] Fast-moving products may show "Low Stock" at higher quantities
- [ ] Slow-moving products may be "In Stock" with fewer units

**Phase 2 Enhancement Validation**:
```
Fast Mover (5 units/day):
  Available: 35
  Reorder Point: 42 (calculated)
  Status: ⚠️ Low Stock ✅ (35 < 42)

Slow Mover (0.5 units/day):
  Available: 12
  Reorder Point: 8 (calculated)
  Status: ✓ In Stock ✅ (12 > 8)
```

**Pass Criteria**: ✅ Status reflects SKU-specific reorder points (not hardcoded 10)

---

## 📋 SECTION 3: Order Total Accuracy

**Priority**: 🔴 CRITICAL (Phase 1.3)
**Impact**: Pricing accuracy, customer trust
**Changed Files**: `orders/calculations.ts`, `money/totals.ts`

### Test 3.1: Order Summary - Total Calculation

**Page**: `/sales/orders/new`

**Steps**:
1. Create order with decimal quantities/prices:
   - Product A: 2.5 cases × $10.99/case = $27.48
   - Product B: 1 case × $5.50/case = $5.50
2. Verify subtotal calculation
3. Check tax calculation
4. Verify grand total

**Expected Results**:
- [ ] Subtotal: $32.98 (not $32.97 or $32.99 due to rounding)
- [ ] Uses banker's rounding (ROUND_HALF_EVEN)
- [ ] Tax calculated on exact subtotal
- [ ] Total = Subtotal + Sales Tax + Excise Tax

**Banker's Rounding Test**:
```
Test Case 1: $10.125 → $10.12 (rounds to even)
Test Case 2: $10.135 → $10.14 (rounds to even)
Test Case 3: $10.145 → $10.14 (rounds to even)
Test Case 4: $10.155 → $10.16 (rounds to even)
```

**Pass Criteria**: ✅ All totals accurate to the penny with proper rounding

---

### Test 3.2: Cross-System Total Consistency

**Pages**: Order creation → Invoice → PDF

**Steps**:
1. Create order and note the estimated total
2. Submit order and generate invoice
3. Download invoice PDF
4. Compare all three totals

**Expected Results**:
```
Order Summary (UI):    $75.12
Invoice View (Server): $75.12  ← MUST MATCH
Invoice PDF (Export):  $75.12  ← MUST MATCH
```

- [ ] UI estimate matches invoice total
- [ ] Invoice matches PDF export
- [ ] All three show identical line item totals
- [ ] All three show identical tax calculations

**Pass Criteria**: ✅ Perfect consistency across UI, server, and PDF (to the penny)

---

## 📋 SECTION 4: Reorder Point Intelligence (Phase 2)

**Priority**: 🟡 HIGH (Phase 2.5)
**Impact**: Inventory management, stockout prevention
**Changed Files**: `reorder/`, `reservation.ts`

### Test 4.1: Low Stock Alerts - SKU-Specific

**Page**: `/admin/inventory` or `/sales/operations/inventory`

**Steps**:
1. Find SKUs with different demand patterns:
   - Fast mover (e.g., ROSEWOOD Pinot Noir - frequent orders)
   - Slow mover (e.g., Rare vintage - infrequent orders)
2. Check their low-stock thresholds

**Expected Results**:
- [ ] Fast movers have **higher** reorder points (e.g., 35-50 units)
- [ ] Slow movers have **lower** reorder points (e.g., 5-12 units)
- [ ] Alert message shows: "X units available (reorder point: Y)"
- [ ] Days of supply calculated and displayed

**Example Validation**:
```
ROSEWOOD Pinot Noir 750ml (Fast Mover):
  Available: 30 units
  Reorder Point: 42 units  ← Calculated from demand
  Status: ⚠️ Low Stock
  Message: "30 units available (reorder point: 42)"
  Days of Supply: 6.0 days

Rare Vintage XYZ (Slow Mover):
  Available: 15 units
  Reorder Point: 8 units   ← Calculated from demand
  Status: ✓ In Stock
  Message: "15 units available"
  Days of Supply: 45.0 days
```

**Pass Criteria**: ✅ Reorder points are SKU-specific (not all using 10)

---

### Test 4.2: Reorder Alerts - Urgency Classification

**Page**: Inventory dashboard or admin alerts

**Steps**:
1. Find products below reorder point
2. Check urgency level classification
3. Verify alert actionability

**Expected Results**:
- [ ] 🔴 CRITICAL: Available ≤ 0 or < 50% of ROP
- [ ] 🟠 URGENT: Available < ROP or < 7 days supply
- [ ] 🟡 SOON: Available < target days (14 days)
- [ ] 🟢 NORMAL: Between target and 2× target
- [ ] ✅ OK: Plenty of supply

**Alert Message Quality**:
```
OLD (Hardcoded):
⚠️ "Low stock: Only 8 units available"

NEW (Data-Driven):
🟠 "URGENT: ROSEWOOD Pinot Noir 750ml has 8 units available
   (2.7 days of supply at 3.0 units/day). Below reorder point
   of 15. Suggest ordering 24 units by Nov 7 to maintain
   service level."
```

**Pass Criteria**: ✅ Alerts are actionable with specific recommendations

---

## 📋 SECTION 5: Customer Health Intelligence (Phase 2)

**Priority**: 🟡 HIGH (Phase 2.6)
**Impact**: Customer retention, proactive outreach
**Changed Files**: `customer-health/baseline/ewma.ts`, `realtime-updater.ts`

### Test 5.1: Customer Dashboard - Health Status

**Page**: `/sales/customers` or `/sales/dashboard`

**Steps**:
1. Find customers with different spend levels:
   - Enterprise customer (>$10K/month)
   - Small customer (<$1K/month)
2. Check health status and alerts
3. Verify tier-appropriate sensitivity

**Expected Results**:
- [ ] Health status: Healthy / At Risk / Declining / Dormant
- [ ] Large customers: More sensitive monitoring (may show "At Risk" sooner)
- [ ] Small customers: Less alert noise (higher threshold for "At Risk")
- [ ] Confidence score displayed (if available): "75% confidence"

**Tier-Specific Examples**:
```
Enterprise Customer ($12K/month):
  Recent Orders: $1,000, $950, $900, $850
  Baseline: $1,025
  Lower Band: $950 (k=1.0σ)
  Status: ⚠️ Declining (85% confidence)
  ← More sensitive threshold

Small Customer ($800/month):
  Recent Orders: $100, $95, $90, $85
  Baseline: $98
  Lower Band: $78 (k=2.0σ)
  Status: ✓ Stable
  ← Less sensitive, reduces noise
```

**Pass Criteria**: ✅ Health alerts are tier-appropriate with confidence scores

---

### Test 5.2: Customer Detail - Revenue Trend

**Page**: `/sales/customers/[customerId]`

**Steps**:
1. Open customer detail page
2. Check revenue trend section
3. Verify baseline and current comparison

**Expected Results**:
- [ ] Baseline revenue displayed (EWMA value)
- [ ] Current average displayed (last 3 orders)
- [ ] Control bands shown visually (upper/lower limits)
- [ ] Status reason explains: "15.2% below baseline (75% confidence)"

**Visual Validation**:
```
Revenue Trend Chart:
──────────────────────────────────
 $600 │         Upper Band ─────────
      │    •••
 $500 │ •••   ••  Baseline ─────────
      │        •••
 $400 │          •••
      │            ••  Lower Band ───
 $300 │              •• ← Current
──────────────────────────────────
        Recent Orders →

Status: Declining (current below lower band)
```

**Pass Criteria**: ✅ Statistical baseline with visual confidence bands

---

## 📋 SECTION 6: Route Planning Accuracy (Phase 2)

**Priority**: 🟢 MEDIUM (Phase 2.7)
**Impact**: Delivery efficiency, time estimates
**Changed Files**: `route/distance.ts`, `route-optimizer.ts`

### Test 6.1: Route Distance - Haversine vs Zip

**Page**: `/sales/call-plan` or route planning view

**Steps**:
1. Create a route with 3-5 stops with known coordinates
2. Check distance calculation
3. Compare with Google Maps or known distances

**Expected Results**:
- [ ] Distance uses Haversine formula (great-circle distance)
- [ ] Distance is accurate within ±1-2 miles
- [ ] NOT using zip-code delta (that was ±5-10 miles error)

**Accuracy Test**:
```
Known Route:
Stop 1: Warehouse (37.5406, -77.4360)
Stop 2: Customer A (37.5523, -77.4511)
Stop 3: Customer B (37.5634, -77.4423)

Haversine Distance: ~2.8 miles ← EXPECTED
Zip-Delta Distance: ~0.15 miles ← OLD (WRONG)
Google Maps: ~3.1 miles (driving)

Validation: Haversine should be close to straight-line,
            slightly less than driving distance
```

**Pass Criteria**: ✅ Distance matches Haversine (within ±2 miles of Google Maps)

---

### Test 6.2: Route Time Estimates

**Page**: Route planning or delivery schedule

**Steps**:
1. Create multi-stop route
2. Check time estimates
3. Verify driving time + stop time breakdown

**Expected Results**:
- [ ] Driving time = distance / 35 mph × 60 min
- [ ] Stop time = (stops - 1) × 15 minutes
- [ ] Total time = driving + stops
- [ ] Formatted display: "3h 15m" or "45m"

**Example Calculation**:
```
Route: 45.5 miles, 8 stops

Driving Time: 45.5 / 35 × 60 = 78 minutes
Stop Time: (8 - 1) × 15 = 105 minutes
Total: 183 minutes = 3h 3m

Display: "3h 3m" ✅
```

**Pass Criteria**: ✅ Time estimates are realistic and well-formatted

---

### Test 6.3: Route Efficiency Metrics

**Page**: Route analysis or reporting

**Steps**:
1. View completed route
2. Check efficiency metrics (if displayed)

**Expected Results**:
- [ ] Actual miles (total route distance)
- [ ] Ideal miles (straight line start-to-end)
- [ ] Efficiency % = (ideal / actual × 100)
- [ ] Detour miles = actual - ideal

**Example**:
```
Route Efficiency:
Actual Distance: 45.2 miles
Ideal Distance: 38.1 miles (straight line)
Efficiency: 84% ← Good route
Detour: 7.1 miles
```

**Pass Criteria**: ✅ Efficiency metrics make sense (typically 70-90%)

---

## 📋 SECTION 7: Money Arithmetic Precision

**Priority**: 🟡 HIGH (Phase 1.3)
**Impact**: Financial accuracy, reconciliation
**Changed Files**: `money/totals.ts`, all calculation functions

### Test 7.1: Decimal Quantity Orders

**Page**: `/sales/orders/new`

**Steps**:
1. Add order with decimal quantities:
   - Product A: 2.5 cases × $12.33/case
   - Product B: 1.25 cases × $8.99/case
2. Verify calculations

**Expected Results**:
- [ ] Line totals:
  - Product A: $30.83 (not $30.825 or $30.82)
  - Product B: $11.24 (not $11.2375 or $11.23)
- [ ] Subtotal: $42.07 (sum of rounded line totals)
- [ ] Uses banker's rounding throughout

**Rounding Edge Cases**:
```
Test: 2.5 × $10.125 = $25.3125
Expected: $25.31 (banker's rounding: .5 → even)

Test: 1.5 × $10.135 = $15.2025
Expected: $15.20 (banker's rounding: .5 → even)
```

**Pass Criteria**: ✅ Decimal arithmetic is accurate with banker's rounding

---

### Test 7.2: Large Order Totals

**Page**: Create large order (10+ line items)

**Steps**:
1. Add 10-15 products to cart
2. Use varied quantities and prices
3. Verify total

**Expected Results**:
- [ ] Subtotal is exact sum of all line totals
- [ ] No cumulative rounding errors
- [ ] Tax calculated on precise subtotal
- [ ] Grand total is mathematically correct

**Cumulative Accuracy Test**:
```
15 line items:
Line 1:  $12.33
Line 2:  $18.99
...
Line 15: $9.87

Manual Sum: $XXX.XX
System Total: $XXX.XX ← MUST MATCH EXACTLY

Maximum Acceptable Error: $0.00 (zero tolerance)
```

**Pass Criteria**: ✅ Perfect accuracy even with many line items

---

## 📋 SECTION 8: User Experience Validation

**Priority**: 🟢 MEDIUM
**Impact**: User satisfaction, UI clarity

### Test 8.1: Clear Labeling

**Check All Screens**:
- [ ] Tax percentages shown explicitly (5.3%)
- [ ] "Estimate" vs "Final" labeled clearly
- [ ] Reorder points explained (not just "Low Stock")
- [ ] Availability breakdowns accessible (onHand/allocated/reserved)

**Example Good Labels**:
```
✅ "Est. Sales Tax (5.3%)" ← Explicit
❌ "Tax" ← Vague

✅ "30 units available (reorder point: 42)" ← Informative
❌ "Low stock" ← Not actionable

✅ "100 on hand, 40 committed, 60 available" ← Transparent
❌ "60 available" ← Missing breakdown
```

**Pass Criteria**: ✅ All calculations have clear, explicit labels

---

### Test 8.2: Mobile Responsiveness

**Devices**: Test on mobile viewport (375px width)

**Steps**:
1. Open order creation on mobile
2. Check calculation displays
3. Verify tax breakdown is readable

**Expected Results**:
- [ ] Tax breakdown doesn't overflow
- [ ] Totals are prominently displayed
- [ ] Inventory status badges are visible
- [ ] No horizontal scrolling for numbers

**Pass Criteria**: ✅ Calculations display well on mobile

---

## 📋 SECTION 9: Edge Cases & Error Handling

**Priority**: 🟢 MEDIUM
**Impact**: Robustness

### Test 9.1: Zero/Null Handling

**Test Cases**:
1. Order with $0.00 line item
2. SKU with 0 inventory
3. Customer with no order history
4. Product with null price

**Expected Results**:
- [ ] No division by zero errors
- [ ] No "NaN" or "Infinity" displayed
- [ ] Graceful handling with defaults
- [ ] Clear error messages if needed

**Pass Criteria**: ✅ No crashes, appropriate defaults

---

### Test 9.2: Boundary Conditions

**Test Cases**:
1. Very large orders (>$100,000)
2. Very small quantities (0.01 cases)
3. High-precision prices ($12.999)
4. International characters in product names

**Expected Results**:
- [ ] Large numbers formatted with commas
- [ ] Small decimals handled correctly
- [ ] Prices rounded appropriately
- [ ] No encoding issues

**Pass Criteria**: ✅ Edge cases handled gracefully

---

## 📋 SECTION 10: API Response Validation

**Priority**: 🟡 HIGH
**Impact**: Data integrity

### Test 10.1: Network Tab Verification

**Steps**:
1. Open DevTools Network tab
2. Perform order creation flow
3. Inspect API responses

**Check These Endpoints**:
- [ ] `GET /api/portal/catalog` - Inventory totals correct
- [ ] `POST /api/sales/orders` - Total matches UI
- [ ] `GET /api/inventory/check-availability` - Availability formula correct
- [ ] `GET /api/sales/customers/[id]` - Revenue baselines present

**Response Validation**:
```json
// /api/portal/catalog response
{
  "inventory": {
    "onHand": 100,
    "allocated": 30,
    "reserved": 10,
    "available": 60  ← Should equal 100 - 30 - 10
  }
}

// /api/sales/orders response
{
  "total": 75.12,  ← Must match UI calculation
  "tax": 4.64      ← Must be 5.3% + excise
}
```

**Pass Criteria**: ✅ API responses show correct calculations

---

## 📋 SECTION 11: Performance Validation

**Priority**: 🟢 LOW (Nice to have)
**Impact**: User experience

### Test 11.1: Calculation Speed

**Steps**:
1. Open large order (20+ line items)
2. Monitor calculation time in DevTools Performance tab
3. Check for UI lag

**Expected Results**:
- [ ] Totals recalculate in <100ms
- [ ] No noticeable UI lag when adding items
- [ ] Tax estimation is instant
- [ ] Availability checks are fast

**Performance Targets**:
```
Order Total Calculation: <50ms
Tax Estimation: <10ms
Availability Check: <100ms (includes DB lookup)
Route Distance: <200ms (includes DB lookup)
```

**Pass Criteria**: ✅ No performance degradation from Phase 1 & 2 changes

---

## 🧪 REGRESSION TESTING

### Test R.1: Existing Orders Unchanged

**Steps**:
1. Find orders created BEFORE Phase 1 & 2 deployment
2. View their totals and taxes
3. Verify they still calculate correctly

**Expected Results**:
- [ ] Old order totals remain unchanged
- [ ] Recalculated totals match stored totals (within $0.01)
- [ ] No "total changed" errors or warnings
- [ ] Historical data integrity maintained

**Pass Criteria**: ✅ Backward compatibility maintained

---

### Test R.2: No Breaking Changes

**Check These Features**:
- [ ] Order submission still works
- [ ] Invoice generation still works
- [ ] PDF exports still work
- [ ] Inventory allocation still works
- [ ] Customer dashboards load correctly

**Pass Criteria**: ✅ No features broken by calculation changes

---

## 📊 TEST EXECUTION TRACKING

### Test Results Summary

| Section | Tests | Passed | Failed | Notes |
|---------|-------|--------|--------|-------|
| 1. Tax Accuracy | 3 | _ | _ | |
| 2. Inventory Consistency | 3 | _ | _ | |
| 3. Total Accuracy | 2 | _ | _ | |
| 4. Reorder Points | 2 | _ | _ | |
| 5. Customer Health | 2 | _ | _ | |
| 6. Route Planning | 3 | _ | _ | |
| 7. Money Arithmetic | 2 | _ | _ | |
| 8. User Experience | 2 | _ | _ | |
| 9. Edge Cases | 2 | _ | _ | |
| 10. API Validation | 1 | _ | _ | |
| 11. Performance | 1 | _ | _ | |
| R. Regression | 2 | _ | _ | |
| **TOTAL** | **25** | **_** | **_** | |

### Issues Found

| ID | Section | Issue Description | Severity | Status |
|----|---------|-------------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## 🔍 DETAILED VALIDATION EXAMPLES

### Example 1: Complete Order Flow

**Scenario**: Sales rep creates order for a customer

```
STEP 1: Order Creation
──────────────────────
Page: /sales/orders/new
Product: ROSEWOOD Pinot Noir 750ml
Quantity: 12 bottles (1 case)
Unit Price: $25.99

VERIFY:
✓ Line Total: $25.99 (displayed immediately)
✓ Subtotal: $25.99 (in sidebar)
✓ Sales Tax (5.3%): $1.38
✓ Excise Tax (~0.75L × 12): $3.60
✓ Estimated Total: $30.97

STEP 2: Inventory Check
───────────────────────
VERIFY:
✓ Availability check triggered
✓ Shows: "50 available" (consistent everywhere)
✓ Warning if low: "50 units available (reorder point: 65)"
✓ Allows order to proceed (50 > 12)

STEP 3: Order Submission
────────────────────────
VERIFY:
✓ Final total matches estimate: $30.97
✓ Inventory allocated: 50 → 38 available
✓ Order status: SUBMITTED

STEP 4: Invoice Generation
──────────────────────────
Page: /admin/invoices/[id]
VERIFY:
✓ Subtotal: $25.99 (matches order)
✓ Sales Tax: $1.38 (matches order)
✓ Excise Tax: $3.60 (matches order)
✓ Total: $30.97 (EXACT match to order estimate)
✓ Interest terms include: "30/360 day-count convention"

STEP 5: PDF Export
──────────────────
VERIFY:
✓ PDF totals match invoice view
✓ All calculations consistent
✓ Tax breakdown visible

PASS CRITERIA: Perfect consistency through entire flow
```

---

### Example 2: Reorder Point Validation

**Scenario**: Check low-stock alerts for different SKUs

```
FAST MOVER VALIDATION:
─────────────────────
SKU: ROSEWOOD Pinot Noir 750ml
Historical Demand: 5.2 units/day (±2.1)
Lead Time: 7 days (±1)

CALCULATION CHECK:
Expected Demand: 5.2 × 7 = 36.4 units
Variance: √(7 × 2.1² + 5.2² × 1²) ≈ √57.54 ≈ 7.6
Safety Stock: 1.64 × 7.6 ≈ 12.5
ROP: 36.4 + 12.5 ≈ 49 units

VERIFY IN UI:
✓ Reorder Point: 49 units (±2 for rounding)
✓ Status: Low Stock when available < 49
✓ Days of Supply: available / 5.2
✓ Urgency: "URGENT" if < 7 days supply

SLOW MOVER VALIDATION:
──────────────────────
SKU: Rare Vintage XYZ
Historical Demand: 0.5 units/day (±0.3)
Lead Time: 7 days (±1)

CALCULATION CHECK:
Expected Demand: 0.5 × 7 = 3.5 units
Variance: √(7 × 0.3² + 0.5² × 1²) ≈ √0.88 ≈ 0.9
Safety Stock: 1.64 × 0.9 ≈ 1.5
ROP: 3.5 + 1.5 ≈ 5 units

VERIFY IN UI:
✓ Reorder Point: 5 units (±1 for rounding)
✓ Status: In Stock when available > 5
✓ Days of Supply: available / 0.5 (higher number)

PASS CRITERIA: ROPs are appropriate for demand patterns
```

---

### Example 3: Customer Health Baseline

**Scenario**: Review customer with declining revenue

```
CUSTOMER PROFILE:
────────────────
Name: Premium Wines LLC
Monthly Revenue: $6,000 (Large tier)
Recent Orders (last 10):
  $600, $620, $610, $590, $580, $520, $480, $460, $450, $440

EWMA BASELINE CALCULATION:
─────────────────────────
α = 0.2 (from large tier settings)
EWMA: Start at $600, apply α=0.2 to each subsequent value
Result: EWMA ≈ $557

Standard Deviation: σ ≈ $68
k-sigma (large tier): k = 1.5
Lower Band: $557 - (1.5 × $68) = $455
Upper Band: $557 + (1.5 × $68) = $659

Current Average (last 3): ($460 + $450 + $440) / 3 = $450

VERIFY IN UI:
✓ Status: "Declining" (450 < 455 lower band)
✓ Current: $450
✓ Baseline: $557
✓ Confidence: ~0.75 (good sample size, low variance)
✓ Alert triggered: YES (decline + high confidence)

SMALL CUSTOMER COMPARISON:
──────────────────────────
Same revenue pattern, but monthly = $800 (small tier)
k-sigma (small tier): k = 2.0
Lower Band: $557 - (2.0 × $68) = $421

Current: $450 > $421 lower band
✓ Status: "Stable" (no alert)
✓ Reduces false alerts for small customers ✅

PASS CRITERIA: Tier-appropriate sensitivity
```

---

## 🎯 ACCEPTANCE CRITERIA

### Must Pass (Critical)
- [x] All tax calculations show 5.3% (NOT 6%)
- [x] Inventory availability consistent across all pages
- [x] Order totals match to the penny (UI = Server = PDF)
- [x] No rounding errors with decimal quantities
- [x] Reorder points are SKU-specific (not all 10)

### Should Pass (High Priority)
- [ ] Customer health uses EWMA baselines
- [ ] Route distances use Haversine formula
- [ ] Low-stock warnings show reorder points
- [ ] No performance degradation

### Nice to Have (Medium Priority)
- [ ] Days of supply displayed for inventory
- [ ] Confidence scores shown for customer health
- [ ] Route efficiency metrics visible
- [ ] Urgency classification for reorder alerts

---

## 🐛 ISSUE REPORTING TEMPLATE

If you find calculation errors, report using this format:

```markdown
**Issue ID**: CALC-001
**Section**: Tax Calculation
**Severity**: Critical / High / Medium / Low
**Page**: /sales/orders/new

**Expected Behavior**:
Tax should be 5.3% of subtotal

**Actual Behavior**:
Tax showing as 6% ($6.00 on $100 subtotal)

**Steps to Reproduce**:
1. Go to /sales/orders/new
2. Add product worth $100
3. Check tax in sidebar

**Screenshots**:
[Attach screenshot]

**Console Errors**:
[Paste any console errors]

**Browser**: Chrome 119
**Device**: Desktop / Mobile
**User Role**: Sales Rep / Admin
```

---

## ✅ FINAL CHECKLIST

### Before Testing
- [ ] Phase 1 & 2 deployed to staging
- [ ] Database migration applied
- [ ] Demand stats job run successfully
- [ ] Fresh browser cache (hard refresh)

### During Testing
- [ ] DevTools Console open (catch errors)
- [ ] Network tab active (monitor API calls)
- [ ] Screenshots of key validations
- [ ] Note any unexpected behavior

### After Testing
- [ ] Complete test results summary table
- [ ] Document all issues found
- [ ] Verify critical tests passed
- [ ] Report findings to development team
- [ ] Recommend: Deploy to production / Fix issues first

---

## 📚 Reference Materials

**Documentation**:
- `docs/CALCULATION_MODERNIZATION_PLAN.md` - Overall plan
- `docs/PHASE_1_COMPLETION_SUMMARY.md` - Phase 1 details
- `docs/PHASE_2_COMPLETION_SUMMARY.md` - Phase 2 details
- `docs/CALCULATION_OVERVIEW.md` - Formula reference

**Code References**:
- Tax: `src/hooks/useTaxEstimation.ts`
- Availability: `src/lib/inventory/availability.ts`
- Totals: `src/lib/money/totals.ts`
- Reorder: `src/lib/inventory/reorder/reorder-point.ts`
- Customer Health: `src/lib/customer-health/baseline/ewma.ts`
- Routes: `src/lib/route/distance.ts`

**Quick Reference Formulas**:
```
Tax:         salesTax = subtotal × 0.053
             exciseTax = liters × 0.40
             total = subtotal + salesTax + exciseTax

Availability: available = onHand - (allocated + reserved)

ROP:         ROP = (μ_d × L) + (z × σ_dL)
             where σ_dL = √(L × σ_d² + μ_d² × σ_L²)

EWMA:        EWMA_t = α × Value_t + (1 - α) × EWMA_(t-1)
             Alert when: current < (mean - k×σ)

Haversine:   d = R × c
             where c = 2 × atan2(√a, √(1−a))
```

---

**Testing Checklist Version**: 1.0
**Created**: 2025-11-04
**Estimated Testing Time**: 2-3 hours
**Priority**: Execute before production deployment

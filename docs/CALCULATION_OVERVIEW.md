# Calculation Catalog

Reference guide to the explicit business calculations implemented across the Travis Order System codebase. Entries are grouped by domain, and each bullet links to the source file and line where the logic lives.

**Last Updated**: 2025-11-04
**Phase 1 Modernization**: ✅ Completed (Tax unification, money-safe arithmetic, inventory consistency)
**See Also**: `CALCULATION_MODERNIZATION_PLAN.md` for ongoing improvements

## Orders & Pricing
- `web/src/lib/orders/calculations.ts:30` — `calculateOrderTotal` returns `order.total` when present; otherwise multiplies each line’s `quantity * unitPrice` and sums, defaulting to `0`.
- `web/src/lib/orders/calculations.ts:54` — `calculateSubtotalFromLines` always recomputes a sum of `quantity * unitPrice` across order lines.
- `web/src/components/orders/OrderSummarySidebar.tsx:53` — Front-end sidebar recomputes subtotal from `lineTotal`, applies a fixed 6 % estimated tax, and reports `estimatedTotal = subtotal + tax`.
- `web/src/app/api/sales/goals/products/route.ts:107` — Sales goal API aggregates YTD product revenue (`Σ quantity * unitPrice`), computes goal progress (`ytd / annualGoal * 100`), derives expected progress from elapsed days, and classifies status via 80 %/50 % thresholds.
- `web/src/lib/recommendation-context.ts:225` — Customer preference builder derives min/max/average price band from historical order item prices.
- `web/src/lib/inventory.ts:107` — Inventory allocation enforces `available = onHand − allocated` before incrementing reservations.

## Inventory & Warehouse

**✨ Phase 1 Improvements (2025-11-04)**:
- Inventory availability unified: single canonical calculation across entire codebase
- Formula: `available = onHand - (allocated + reserved)` — consistent everywhere
- Low-stock thresholds now configurable (preparing for Phase 2 SKU-level reorder points)

**Core Calculations**:
- `web/src/lib/inventory/availability.ts:47` — **NEW** `getAvailableQty({onHand, allocated, reserved})` single source of truth
- `web/src/lib/inventory/availability.ts:74` — **NEW** `getAvailabilityBreakdown` returns full inventory status breakdown
- `web/src/lib/inventory/availability.ts:104` — **NEW** `isAvailable` checks if requested quantity can be fulfilled
- `web/src/lib/inventory/availability.ts:127` — **NEW** `getAvailabilityStatus` classifies as in_stock/low_stock/out_of_stock
- `web/src/lib/inventory.ts:593` — **UPDATED** `getAvailableInventory` now uses canonical `getAvailableQty`
- `web/src/lib/inventory/reservation.ts:67` — **UPDATED** `checkInventoryAvailability` now uses canonical calculation
- `web/src/warehouse.ts:203` — `calculatePickOrder` encodes location as `aisle * 10000 + row * 100 + shelf` for sortable picking
- `web/src/lib/warehouse-validation.ts:117` — Location validation converts aisle/row/shelf into numeric form and returns the computed `pickOrder` for UI feedback.
- `web/src/lib/warehouse-validation.ts:198` — `optimizeLocationForFrequency` maps SKU sales frequency to preferred aisle ranges (A/B for >10/mo, C–E for 5–10/mo, others to back aisles).
- `web/src/lib/warehouse-validation.ts:267` — CSV parser ensures each imported row passes the same pick-order validation, flagging bad coordinates before ingest.
- `web/src/lib/warehouse-validation.ts:320` — `calculateWarehouseStats` computes total/occupied locations, utilization percentage, busiest/quietest aisles, and average units per occupied slot.

## Invoicing, Tax, & Finance
- `web/src/lib/invoices/liter-calculator.ts:21` — Bottle size parser converts assorted strings (ml/L) to liters; `calculateLineItemLiters` multiplies quantity by liters per bottle.
- `web/src/lib/invoices/liter-calculator.ts:52` — `calculateInvoiceTotalLiters` sums either precomputed liters or converts each line before aggregating.
- `web/src/lib/invoices/tax-calculator.ts:37` — VA wine excise tax computed as `totalLiters * $0.40` when the sale is in-state; `calculateSalesTax` multiplies subtotal by the configured rate (5.3 % default).
- `web/src/lib/invoices/tax-calculator.ts:74` — `calculateInvoiceTaxes` orchestrates excise/sales tax calculations, returning a combined `totalTax`.
- `web/src/lib/invoices/invoice-data-builder.ts:167` — Line enrichment computes per-line liters, cases, and monetary totals; invoice subtotal is `Σ lineTotal`, total liters aggregated for tax.
- `web/src/lib/invoices/invoice-data-builder.ts:190` — Final invoice total equals `subtotal + totalTax`, with due dates derived from payment terms.
- `web/src/lib/invoices/interest-calculator.ts:31` — `calculateOverdueInterest` uses simple interest (`principal * monthlyRate * monthsOverdue`, 30-day months) after optional grace periods.
- `web/src/lib/invoices/interest-calculator.ts:81` — `calculateCompoundInterest` applies `(1 + rate)^(months) − 1` for compounding projections and returns projected payoff totals.
- `web/src/lib/invoices/interest-calculator.ts:138` — `projectFutureBalance` reuses compound interest to estimate outstanding balance on a future date.
- `web/src/lib/invoices/pdf-generator.ts:45` — Text fallback recomputes each invoice line total (`quantity * unitPrice`) and subtotal when PDFs cannot be rendered.

## Customer Health & Account Scoring
- `web/src/lib/customer-health/realtime-updater.ts:97` — Real-time health updates derive recent order intervals (last five orders) to compute `averageIntervalDays`, then set cadence baseline as `max(average, thresholds.dormantDays)`.
- `web/src/lib/customer-health/realtime-updater.ts:107` — Grace period is `max(cadenceBaseline * gracePercent, minGraceDays)`; dormant threshold is `cadenceBaseline + grace`.
- `web/src/lib/customer-health/realtime-updater.ts:127` — Revenue-decline detection compares the mean of the last three order totals against `establishedRevenue * (1 − revenueDeclinePercent)`.
- `web/src/jobs/customer-health-assessment.ts:402` — Batch cadence calculator averages positive day gaps between the last five delivered orders (rounded to nearest day).
- `web/src/jobs/customer-health-assessment.ts:438` — Revenue metric helper flags declines when the recent average order total is ≥15 % below the stored baseline.
- `web/src/lib/customer-health/thresholds.ts:72` — Health thresholds pull tenant/type/priority-specific overrides, defaulting to dormant days, grace percentage, and revenue decline percent constants.
- `web/src/lib/call-plan/account-suggester.ts:24` — Prospect scoring assigns weighted points for dormancy windows, revenue tiers, total orders, order frequency, and active accounts exceeding 120 idle days; scores capped at 100.
- `web/src/lib/call-plan/account-suggester.ts:69` — Urgency label driven by score bands (≥80 critical, ≥60 high, ≥40 medium, else low).

## Analytics, Metrics & Forecasting
- `web/src/lib/analytics.ts:84` — Account health metrics compute cadence (`average day gap`), label via thresholds, and summarize 30-day vs prior-30-day revenue with percent change buckets (≥5 % growing, ≤−15 % down).
- `web/src/lib/analytics.ts:211` — ARPDD (average revenue per delivery day) divides recent revenue by unique fulfilled days in current/prior windows and reports percent change plus status (up/down/steady).
- `web/src/lib/analytics.ts:241` — Account signal builder groups recent fulfilled orders per customer, averages last five intervals, and classifies them as healthy/due soon/at risk based on cadence multipliers.
- `web/src/lib/sample-analytics.ts:104` — Sample attribution sums `unitPrice * quantity` for orders within 30 days post tasting.
- `web/src/lib/sample-analytics.ts:188` — Sample metrics compute conversion rate (`orders within window / total samples`) and average revenue per sample; metrics produced per SKU and per sales rep.
- `web/src/lib/ai/predictive-analytics.ts:42` — Moving/exponential averages smooth order intervals; linear regression on interval indices infers trend direction and strength.
- `web/src/lib/ai/predictive-analytics.ts:212` — Next-order prediction starts from exponential moving average intervals, adjusts for seasonality/trend multipliers, and derives a confidence score using coefficient of variation and trend strength.
- `web/src/lib/ai/predictive-analytics.ts:330` — Customer insight builder totals lifetime revenue, averages order value, normalizes order frequency (orders per month), and assesses churn risk by comparing days-since-last-order against predicted cadence.
- `web/src/jobs/weekly-metrics-aggregation.ts:96` — Weekly job aggregates rep revenue for current week, year-over-year comparison, delivery-day counts, dormancy/activation counts, and activity totals.
- `web/src/app/api/portal/analytics/account/route.ts:125` — Portal analytics endpoint computes 90-day revenue deltas, average order value, cadence gaps, and top products by quantity while also summarizing payment aging buckets.
- `web/src/app/api/portal/dashboard/route.ts:106` — Dashboard API compares current vs prior 30-day revenue, calculates cadence over the six most recent fulfilled orders, tallies open-order totals, and reuses the same payment aging buckets.

## Routing & Logistics
- `web/src/lib/distance.ts:23` — Haversine implementation for mileage between coordinates, plus helper functions for bearings, compass directions, and estimated driving time at 35 mph.
- `web/src/lib/route-optimizer.ts:81` — Zip-code distance heuristic uses numeric differences to approximate miles (capped at 20) for travel time and ordering heuristics.
- `web/src/lib/route-optimizer.ts:194` — Route distance estimator sums zip-code deltas/100 and rounds to one decimal place; efficiency score blends order-of-arrival correctness with average gap penalties.

## Samples & Campaigns
- `web/src/jobs/calculate-sample-metrics.ts:161` — Daily job reuses sample analytics to total attributed revenue, conversions, and unique customers inside each 30-day post-sample window.
- `web/src/lib/marketing` (various) — Campaign builders defer to sample analytics outputs; no additional bespoke formulas beyond those listed above.

## Financial Aging & Collections
- `src/app/api/portal/analytics/account/route.ts:202` — Payment aging buckets outstanding invoice balances into Current / 0–30 / 31–60 / 61–90 / 90+ day columns before totalling outstanding exposure.
- `src/app/api/portal/dashboard/route.ts:136` — Dashboard mirrors the same aging logic for the portal summary cards.
- `web/src/lib/invoices/interest-calculator.ts:54` — Interest formatter converts monthly decimal rates to percentage strings for invoice display and legal language insertion.

> **Note:** Many jobs and APIs reuse the shared helpers above; duplicate calculations (e.g., cadence or revenue sums) always call the central utilities referenced in this catalog.

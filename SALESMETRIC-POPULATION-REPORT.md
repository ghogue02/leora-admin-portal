# SalesMetric Table Population Report

## Executive Summary

Successfully populated the SalesMetric table with comprehensive sales analytics data derived from 2,126 invoices totaling $3,362,561.40.

**Status**: ✅ COMPLETE - No Errors

---

## Metrics Created

### Total Records: 3,458

| Scope | Records | Date Range | Description |
|-------|---------|------------|-------------|
| **daily** | 60 | 2025-06-13 to 2025-11-27 | Daily revenue aggregates |
| **weekly** | 18 | 2025-06-09 to 2025-11-24 | Weekly revenue aggregates (ISO weeks) |
| **monthly** | 6 | 2025-06-01 to 2025-11-01 | Monthly revenue aggregates |
| **customer** | 2,034 | 2025-06-13 to 2025-11-27 | Daily revenue by customer |
| **customer_monthly** | 1,340 | 2025-06-01 to 2025-11-01 | Monthly revenue by customer |

---

## Data Coverage

- **Date Range**: June 13, 2025 - November 27, 2025 (168 days)
- **Total Revenue**: $3,362,561.40
- **Total Invoices**: 2,126
- **Unique Customers**: 937
- **Tenant ID**: 58b8126a-2d2f-4f55-bc98-5b6784800bed

---

## Metric Breakdown by Scope

### 1. Daily Metrics (scope = 'daily')
- **60 records** covering each day with invoice activity
- Provides day-over-day revenue trends
- Useful for identifying daily patterns and anomalies

**Sample Data (October 2025)**:
```
Date       | Revenue    | Invoices
-----------|------------|----------
2025-10-01 | $162,183.88|    91
2025-10-02 | $114,670.69|    76
2025-10-03 |  $93,243.78|    84
2025-10-04 |  $23,480.00|     2
2025-10-06 |   $2,142.08|    26
```

### 2. Weekly Metrics (scope = 'weekly')
- **18 records** aggregated by ISO week (Monday start)
- Smooths daily volatility for better trend analysis
- Covers approximately 25 weeks of data

**Sample Data**:
```
Week Starting | Revenue        | Invoices
--------------|----------------|----------
2025-09-08    | $1,012,610.47  |    278
2025-09-15    |   $583,668.88  |    316
2025-09-22    |   $534,278.94  |    339
```

### 3. Monthly Metrics (scope = 'monthly')
- **6 records** covering 6 months of activity
- Essential for month-over-month growth analysis

**Monthly Trend**:
```
Month    | Revenue        | Invoices | MoM Change
---------|----------------|----------|------------
June 25  |      $2,804.00 |        2 |     --
July 25  |      $2,804.00 |        2 |      0.0%
Aug 25   |      $2,788.00 |        2 |     -0.6%
Sept 25  |  $2,396,787.26 |    1,043 | +85,868.0%
Oct 25   |    $953,034.17 |    1,061 |    -60.2%
Nov 25   |      $4,343.97 |       16 |    -99.5%
```

### 4. Customer Daily Metrics (scope = 'customer')
- **2,034 records** tracking daily revenue per customer
- Granular customer behavior analysis
- Identifies customer purchasing patterns

### 5. Customer Monthly Metrics (scope = 'customer_monthly')
- **1,340 records** across 937 unique customers
- Essential for customer trend analysis and retention
- Supports customer health scoring

**Top 5 Customers (September 2025)**:
```
Customer                        | Revenue    | Invoices
--------------------------------|------------|----------
Acker Merrall & Condit Co. Inc. | $82,225.00 |    6
Emmett's on Grove               | $76,058.00 |    4
Metta Platamata LLC             | $58,970.00 |    4
Lei Wine                        | $58,212.00 |    2
Greenings Fine Foods LLC        | $57,169.00 |    2
```

**Top 10 Customers (All Time)**:
```
Customer                        | Total Revenue
--------------------------------|---------------
Rodeo Brooklyn LLC              | $141,329.00
Emmett's on Grove               | $126,772.00
Acker Merrall & Condit Co. Inc. |  $82,233.00
Metta Platamata LLC             |  $58,985.00
Entre Deux Mers LLC             |  $58,417.00
Lei Wine                        |  $58,223.00
Plus de Vin                     |  $57,864.00
Greenings Fine Foods LLC        |  $57,189.00
Fanou Inc.                      |  $57,006.00
Wine-O                          |  $56,986.00
```

---

## Data Integrity Verification

✅ **All checks passed**:
- Zero records with NULL revenue
- Zero records with negative revenue
- Zero records with NULL metricDate
- Total revenue matches source Invoice table exactly: $3,362,561.40

---

## Schema Details

### SalesMetric Table Structure
```sql
model SalesMetric {
  id         UUID      @id @default(uuid())
  tenantId   UUID      -- Tenant isolation
  metricDate DateTime  -- Date of the metric
  scope      String    -- Type: daily/weekly/monthly/customer/customer_monthly
  scopeId    String?   -- Customer ID for customer-scoped metrics
  revenue    Decimal?  -- Total revenue amount
  volume     Decimal?  -- Count of invoices
  createdAt  DateTime  @default(now())
}
```

---

## Script Location

The population script is saved at:
**`/Users/greghogue/Leora2/populate-sales-metrics.sql`**

This script can be re-run if needed (it's idempotent with proper transaction handling).

---

## Use Cases Enabled

With these metrics now populated, you can:

1. **Dashboard Analytics**
   - Display daily/weekly/monthly revenue trends
   - Show top performing customers
   - Visualize revenue growth over time

2. **Customer Health Scoring**
   - Analyze customer purchase frequency
   - Identify at-risk customers (declining revenue)
   - Track customer lifetime value

3. **Revenue Forecasting**
   - Use historical trends for predictions
   - Identify seasonal patterns
   - Project future revenue

4. **Performance Monitoring**
   - Track KPIs (MRR, ARR, growth rate)
   - Compare period-over-period performance
   - Monitor customer retention

5. **Custom Reports**
   - Generate executive summaries
   - Create customer-specific reports
   - Build sales team dashboards

---

## Next Steps

Consider adding:
1. **Product/SKU-level metrics** - Revenue by product line
2. **Geographic metrics** - Revenue by state/region
3. **Channel metrics** - Revenue by delivery method
4. **Cohort analysis** - Customer cohorts by signup date
5. **Automated refresh** - Scheduled job to update metrics nightly

---

## Notes

- The spike in September 2025 ($2.4M) represents the bulk of historical invoice imports
- October 2025 shows declining activity which may be expected for recent months
- November 2025 data appears incomplete (only 16 invoices) - may still be in progress
- All 937 customers have at least one monthly metric record
- Customer-level metrics support both daily and monthly granularity for flexible reporting

---

**Generated**: 2025-10-18
**Database**: PostgreSQL (Supabase)
**Tenant**: 58b8126a-2d2f-4f55-bc98-5b6784800bed

-- ============================================================================
-- SalesMetric Quick Reference Queries
-- Common queries for accessing sales metrics data
-- ============================================================================

-- Set your tenant ID here
\set tenant_id '58b8126a-2d2f-4f55-bc98-5b6784800bed'

-- ============================================================================
-- DAILY METRICS
-- ============================================================================

-- Get daily revenue for last 30 days
SELECT
    "metricDate"::DATE as date,
    revenue as daily_revenue,
    volume as invoice_count
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'daily'
  AND "metricDate" >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY "metricDate" DESC;

-- Get specific date range
SELECT
    "metricDate"::DATE as date,
    revenue as daily_revenue,
    volume as invoice_count
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'daily'
  AND "metricDate" BETWEEN '2025-09-01' AND '2025-09-30'
ORDER BY "metricDate";

-- ============================================================================
-- WEEKLY METRICS
-- ============================================================================

-- Get weekly revenue trends
SELECT
    "metricDate"::DATE as week_starting,
    revenue as weekly_revenue,
    volume as invoice_count,
    LAG(revenue) OVER (ORDER BY "metricDate") as prev_week_revenue,
    ROUND(
        ((revenue - LAG(revenue) OVER (ORDER BY "metricDate")) /
         NULLIF(LAG(revenue) OVER (ORDER BY "metricDate"), 0) * 100)::NUMERIC,
        2
    ) as week_over_week_pct
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'weekly'
ORDER BY "metricDate" DESC;

-- ============================================================================
-- MONTHLY METRICS
-- ============================================================================

-- Get monthly revenue with MoM growth
SELECT
    TO_CHAR("metricDate", 'Mon YYYY') as month,
    revenue as monthly_revenue,
    volume as invoice_count,
    LAG(revenue) OVER (ORDER BY "metricDate") as prev_month_revenue,
    ROUND(
        ((revenue - LAG(revenue) OVER (ORDER BY "metricDate")) /
         NULLIF(LAG(revenue) OVER (ORDER BY "metricDate"), 0) * 100)::NUMERIC,
        2
    ) as mom_growth_pct
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'monthly'
ORDER BY "metricDate" DESC;

-- ============================================================================
-- CUSTOMER METRICS
-- ============================================================================

-- Top customers by revenue (all time)
SELECT
    c.name as customer_name,
    c."accountNumber" as account_number,
    SUM(sm.revenue) as total_revenue,
    SUM(sm.volume) as total_invoices,
    ROUND(AVG(sm.revenue)::NUMERIC, 2) as avg_monthly_revenue
FROM "SalesMetric" sm
LEFT JOIN "Customer" c ON c.id::TEXT = sm."scopeId"
WHERE sm."tenantId" = :'tenant_id'
  AND sm.scope = 'customer_monthly'
GROUP BY c.name, c."accountNumber", sm."scopeId"
ORDER BY SUM(sm.revenue) DESC
LIMIT 20;

-- Customer revenue trend (last 6 months)
SELECT
    c.name as customer_name,
    TO_CHAR(sm."metricDate", 'Mon YYYY') as month,
    sm.revenue as monthly_revenue,
    sm.volume as invoice_count
FROM "SalesMetric" sm
LEFT JOIN "Customer" c ON c.id::TEXT = sm."scopeId"
WHERE sm."tenantId" = :'tenant_id'
  AND sm.scope = 'customer_monthly'
  AND sm."metricDate" >= CURRENT_DATE - INTERVAL '6 months'
  AND c.name = 'Rodeo Brooklyn LLC'  -- Replace with specific customer
ORDER BY sm."metricDate";

-- Customers with declining revenue (MoM comparison)
WITH customer_trends AS (
    SELECT
        "scopeId",
        "metricDate",
        revenue,
        LAG(revenue) OVER (PARTITION BY "scopeId" ORDER BY "metricDate") as prev_month
    FROM "SalesMetric"
    WHERE "tenantId" = :'tenant_id'
      AND scope = 'customer_monthly'
)
SELECT
    c.name as customer_name,
    ct."metricDate"::DATE as month,
    ct.revenue as current_revenue,
    ct.prev_month as previous_revenue,
    ROUND(((ct.revenue - ct.prev_month) / NULLIF(ct.prev_month, 0) * 100)::NUMERIC, 2) as change_pct
FROM customer_trends ct
LEFT JOIN "Customer" c ON c.id::TEXT = ct."scopeId"
WHERE ct.prev_month IS NOT NULL
  AND ct.revenue < ct.prev_month * 0.85  -- 15%+ decline
ORDER BY change_pct
LIMIT 20;

-- New customers (first purchase)
SELECT
    c.name as customer_name,
    MIN(sm."metricDate")::DATE as first_purchase_date,
    SUM(sm.revenue) as total_revenue
FROM "SalesMetric" sm
LEFT JOIN "Customer" c ON c.id::TEXT = sm."scopeId"
WHERE sm."tenantId" = :'tenant_id'
  AND sm.scope = 'customer_monthly'
GROUP BY c.name, sm."scopeId"
HAVING MIN(sm."metricDate") >= CURRENT_DATE - INTERVAL '3 months'
ORDER BY MIN(sm."metricDate") DESC;

-- ============================================================================
-- AGGREGATED ANALYTICS
-- ============================================================================

-- Revenue summary across all time periods
SELECT
    scope,
    COUNT(*) as metric_count,
    SUM(revenue) as total_revenue,
    SUM(volume) as total_volume,
    AVG(revenue) as avg_revenue
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
GROUP BY scope
ORDER BY scope;

-- Daily average by day of week
SELECT
    TO_CHAR("metricDate", 'Day') as day_of_week,
    COUNT(*) as days_count,
    ROUND(AVG(revenue)::NUMERIC, 2) as avg_daily_revenue,
    ROUND(AVG(volume)::NUMERIC, 2) as avg_daily_invoices
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'daily'
GROUP BY TO_CHAR("metricDate", 'Day'), EXTRACT(DOW FROM "metricDate")
ORDER BY EXTRACT(DOW FROM "metricDate");

-- Revenue by month of year (seasonal patterns)
SELECT
    TO_CHAR("metricDate", 'Month') as month_name,
    COUNT(DISTINCT EXTRACT(YEAR FROM "metricDate")) as years,
    ROUND(AVG(revenue)::NUMERIC, 2) as avg_monthly_revenue
FROM "SalesMetric"
WHERE "tenantId" = :'tenant_id'
  AND scope = 'monthly'
GROUP BY TO_CHAR("metricDate", 'Month'), EXTRACT(MONTH FROM "metricDate")
ORDER BY EXTRACT(MONTH FROM "metricDate");

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

-- Current month vs previous month
WITH current_month AS (
    SELECT SUM(revenue) as revenue, SUM(volume) as volume
    FROM "SalesMetric"
    WHERE "tenantId" = :'tenant_id'
      AND scope = 'monthly'
      AND "metricDate" = DATE_TRUNC('month', CURRENT_DATE)
),
previous_month AS (
    SELECT SUM(revenue) as revenue, SUM(volume) as volume
    FROM "SalesMetric"
    WHERE "tenantId" = :'tenant_id'
      AND scope = 'monthly'
      AND "metricDate" = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
)
SELECT
    'Current Month' as period,
    c.revenue as revenue,
    c.volume as invoices,
    p.revenue as prev_revenue,
    ROUND(((c.revenue - p.revenue) / NULLIF(p.revenue, 0) * 100)::NUMERIC, 2) as growth_pct
FROM current_month c, previous_month p;

-- Customer retention (customers who purchased in consecutive months)
WITH customer_months AS (
    SELECT
        "scopeId",
        "metricDate",
        LEAD("metricDate") OVER (PARTITION BY "scopeId" ORDER BY "metricDate") as next_month
    FROM "SalesMetric"
    WHERE "tenantId" = :'tenant_id'
      AND scope = 'customer_monthly'
)
SELECT
    "metricDate"::DATE as month,
    COUNT(*) as customers,
    COUNT(CASE WHEN next_month = "metricDate" + INTERVAL '1 month' THEN 1 END) as retained_next_month,
    ROUND(
        (COUNT(CASE WHEN next_month = "metricDate" + INTERVAL '1 month' THEN 1 END)::NUMERIC /
         NULLIF(COUNT(*), 0) * 100)::NUMERIC,
        2
    ) as retention_rate_pct
FROM customer_months
GROUP BY "metricDate"
ORDER BY "metricDate" DESC;

-- ============================================================================
-- EXPORT / REPORTING
-- ============================================================================

-- Full monthly report (CSV-ready format)
\copy (SELECT TO_CHAR("metricDate", 'YYYY-MM') as month, revenue, volume FROM "SalesMetric" WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed' AND scope = 'monthly' ORDER BY "metricDate") TO '/tmp/monthly_revenue.csv' WITH CSV HEADER;

-- Customer revenue matrix (pivot-style)
SELECT
    c.name as customer,
    MAX(CASE WHEN TO_CHAR(sm."metricDate", 'YYYY-MM') = '2025-09' THEN sm.revenue END) as sep_2025,
    MAX(CASE WHEN TO_CHAR(sm."metricDate", 'YYYY-MM') = '2025-10' THEN sm.revenue END) as oct_2025,
    MAX(CASE WHEN TO_CHAR(sm."metricDate", 'YYYY-MM') = '2025-11' THEN sm.revenue END) as nov_2025,
    SUM(sm.revenue) as total
FROM "SalesMetric" sm
LEFT JOIN "Customer" c ON c.id::TEXT = sm."scopeId"
WHERE sm."tenantId" = :'tenant_id'
  AND sm.scope = 'customer_monthly'
GROUP BY c.name
ORDER BY total DESC
LIMIT 20;

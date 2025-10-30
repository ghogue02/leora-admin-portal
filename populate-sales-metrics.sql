-- ============================================================================
-- Script: Populate SalesMetric Table from Invoice Data
-- Purpose: Generate comprehensive sales metrics for analytics and reporting
-- Date Range: 2025-06-13 to 2025-11-27 (2,126 invoices worth $3.36M)
-- Tenant: 58b8126a-2d2f-4f55-bc98-5b6784800bed
-- ============================================================================

BEGIN;

-- Store tenant ID for easier reference
DO $$
DECLARE
    v_tenant_id UUID := '58b8126a-2d2f-4f55-bc98-5b6784800bed';
    v_insert_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting SalesMetric population for tenant: %', v_tenant_id;

    -- ========================================================================
    -- 1. DAILY REVENUE METRICS (scope = 'daily')
    -- ========================================================================
    RAISE NOTICE 'Generating daily revenue metrics...';

    INSERT INTO "SalesMetric" (id, "tenantId", "metricDate", scope, "scopeId", revenue, volume, "createdAt")
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        DATE("issuedAt") as metric_date,
        'daily' as scope,
        NULL as scope_id,
        SUM(total) as revenue,
        COUNT(*) as volume,
        NOW()
    FROM "Invoice"
    WHERE "tenantId" = v_tenant_id
      AND "issuedAt" IS NOT NULL
      AND total IS NOT NULL
    GROUP BY DATE("issuedAt")
    ORDER BY DATE("issuedAt");

    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % daily metrics', v_insert_count;


    -- ========================================================================
    -- 2. WEEKLY REVENUE METRICS (scope = 'weekly')
    -- Week starts on Monday, uses ISO week date system
    -- ========================================================================
    RAISE NOTICE 'Generating weekly revenue metrics...';

    INSERT INTO "SalesMetric" (id, "tenantId", "metricDate", scope, "scopeId", revenue, volume, "createdAt")
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        DATE_TRUNC('week', "issuedAt")::DATE as metric_date,
        'weekly' as scope,
        NULL as scope_id,
        SUM(total) as revenue,
        COUNT(*) as volume,
        NOW()
    FROM "Invoice"
    WHERE "tenantId" = v_tenant_id
      AND "issuedAt" IS NOT NULL
      AND total IS NOT NULL
    GROUP BY DATE_TRUNC('week', "issuedAt")::DATE
    ORDER BY DATE_TRUNC('week', "issuedAt")::DATE;

    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % weekly metrics', v_insert_count;


    -- ========================================================================
    -- 3. MONTHLY REVENUE METRICS (scope = 'monthly')
    -- ========================================================================
    RAISE NOTICE 'Generating monthly revenue metrics...';

    INSERT INTO "SalesMetric" (id, "tenantId", "metricDate", scope, "scopeId", revenue, volume, "createdAt")
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        DATE_TRUNC('month', "issuedAt")::DATE as metric_date,
        'monthly' as scope,
        NULL as scope_id,
        SUM(total) as revenue,
        COUNT(*) as volume,
        NOW()
    FROM "Invoice"
    WHERE "tenantId" = v_tenant_id
      AND "issuedAt" IS NOT NULL
      AND total IS NOT NULL
    GROUP BY DATE_TRUNC('month', "issuedAt")::DATE
    ORDER BY DATE_TRUNC('month', "issuedAt")::DATE;

    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % monthly metrics', v_insert_count;


    -- ========================================================================
    -- 4. CUSTOMER REVENUE METRICS (scope = 'customer')
    -- Daily revenue by customer
    -- ========================================================================
    RAISE NOTICE 'Generating customer revenue metrics...';

    INSERT INTO "SalesMetric" (id, "tenantId", "metricDate", scope, "scopeId", revenue, volume, "createdAt")
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        DATE("issuedAt") as metric_date,
        'customer' as scope,
        "customerId"::TEXT as scope_id,
        SUM(total) as revenue,
        COUNT(*) as volume,
        NOW()
    FROM "Invoice"
    WHERE "tenantId" = v_tenant_id
      AND "issuedAt" IS NOT NULL
      AND total IS NOT NULL
      AND "customerId" IS NOT NULL
    GROUP BY DATE("issuedAt"), "customerId"
    ORDER BY DATE("issuedAt"), "customerId";

    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % customer-daily metrics', v_insert_count;


    -- ========================================================================
    -- 5. CUSTOMER MONTHLY SUMMARY (scope = 'customer_monthly')
    -- Monthly revenue by customer for trend analysis
    -- ========================================================================
    RAISE NOTICE 'Generating customer monthly summary metrics...';

    INSERT INTO "SalesMetric" (id, "tenantId", "metricDate", scope, "scopeId", revenue, volume, "createdAt")
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        DATE_TRUNC('month', "issuedAt")::DATE as metric_date,
        'customer_monthly' as scope,
        "customerId"::TEXT as scope_id,
        SUM(total) as revenue,
        COUNT(*) as volume,
        NOW()
    FROM "Invoice"
    WHERE "tenantId" = v_tenant_id
      AND "issuedAt" IS NOT NULL
      AND total IS NOT NULL
      AND "customerId" IS NOT NULL
    GROUP BY DATE_TRUNC('month', "issuedAt")::DATE, "customerId"
    ORDER BY DATE_TRUNC('month', "issuedAt")::DATE, "customerId";

    GET DIAGNOSTICS v_insert_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % customer-monthly metrics', v_insert_count;


    -- ========================================================================
    -- SUMMARY REPORT
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SalesMetric Population Complete!';
    RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Show total records created
SELECT
    'Total SalesMetric Records' as description,
    COUNT(*) as count
FROM "SalesMetric"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Show breakdown by scope
SELECT
    scope,
    COUNT(*) as record_count,
    MIN("metricDate") as earliest_date,
    MAX("metricDate") as latest_date,
    SUM(revenue) as total_revenue,
    SUM(volume) as total_volume
FROM "SalesMetric"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
GROUP BY scope
ORDER BY scope;

-- Sample daily metrics (first 10 days)
SELECT
    "metricDate",
    scope,
    revenue,
    volume
FROM "SalesMetric"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND scope = 'daily'
ORDER BY "metricDate"
LIMIT 10;

-- Sample customer metrics (top 10 customers by revenue)
SELECT
    c.name as customer_name,
    sm."scopeId" as customer_id,
    SUM(sm.revenue) as total_revenue,
    SUM(sm.volume) as total_invoices
FROM "SalesMetric" sm
LEFT JOIN "Customer" c ON c.id::TEXT = sm."scopeId"
WHERE sm."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND sm.scope = 'customer_monthly'
GROUP BY c.name, sm."scopeId"
ORDER BY total_revenue DESC
LIMIT 10;

-- Monthly trend
SELECT
    "metricDate",
    revenue,
    volume,
    LAG(revenue) OVER (ORDER BY "metricDate") as prev_month_revenue,
    ROUND(
        ((revenue - LAG(revenue) OVER (ORDER BY "metricDate")) /
         NULLIF(LAG(revenue) OVER (ORDER BY "metricDate"), 0) * 100)::NUMERIC,
        2
    ) as revenue_change_pct
FROM "SalesMetric"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
  AND scope = 'monthly'
ORDER BY "metricDate";

COMMIT;

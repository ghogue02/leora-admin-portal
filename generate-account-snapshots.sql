-- ============================================================================
-- Generate AccountHealthSnapshot Records
-- ============================================================================
-- This script calculates health metrics for all customers and inserts them
-- into the AccountHealthSnapshot table.
--
-- Metrics Calculated:
-- 1. Revenue Score (0-100): Based on total revenue compared to established baseline
-- 2. Cadence Score (0-100): Based on ordering consistency and recency
-- 3. Sample Utilization (0-100): Based on sample order frequency
-- ============================================================================

DO $$
DECLARE
    v_tenant_id UUID := '58b8126a-2d2f-4f55-bc98-5b6784800bed';
    v_snapshot_date TIMESTAMP := CURRENT_TIMESTAMP;
    v_records_inserted INTEGER := 0;
    v_max_revenue DECIMAL(12,2);
    v_avg_revenue DECIMAL(12,2);
    rec RECORD;
BEGIN

    -- Get revenue benchmarks for scoring
    SELECT
        MAX(total_revenue),
        AVG(total_revenue)
    INTO v_max_revenue, v_avg_revenue
    FROM (
        SELECT
            c.id,
            COALESCE(SUM(o.total), 0) as total_revenue
        FROM "Customer" c
        LEFT JOIN "Order" o ON o."customerId" = c.id
            AND o."tenantId" = v_tenant_id
            AND o."orderedAt" IS NOT NULL
        WHERE c."tenantId" = v_tenant_id
        GROUP BY c.id
    ) revenue_data;

    RAISE NOTICE 'Revenue benchmarks - Max: %, Avg: %', v_max_revenue, v_avg_revenue;

    -- Insert snapshots for all customers
    INSERT INTO "AccountHealthSnapshot" (
        id,
        "tenantId",
        "customerId",
        "snapshotDate",
        "revenueScore",
        "cadenceScore",
        "sampleUtilization",
        notes,
        "createdAt"
    )
    SELECT
        gen_random_uuid(),
        v_tenant_id,
        customer_id,
        v_snapshot_date,
        revenue_score,
        cadence_score,
        sample_utilization,
        CASE
            WHEN order_count = 0 THEN 'No orders yet'
            WHEN days_since_last_order > 180 THEN 'Inactive - over 6 months since last order'
            WHEN days_since_last_order > 90 THEN 'At risk - over 3 months since last order'
            WHEN days_since_last_order > 60 THEN 'Needs attention - over 2 months since last order'
            WHEN ordering_consistency < 50 THEN 'Irregular ordering pattern'
            ELSE 'Active customer'
        END as notes,
        v_snapshot_date
    FROM (
        SELECT
            c.id as customer_id,
            c.name as customer_name,

            -- Order statistics
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total), 0) as total_revenue,
            MIN(o."orderedAt") as first_order_date,
            MAX(o."orderedAt") as last_order_date,

            -- Calculate days since last order
            CASE
                WHEN MAX(o."orderedAt") IS NULL THEN 9999
                ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER
            END as days_since_last_order,

            -- Calculate average days between orders
            CASE
                WHEN COUNT(o.id) > 1 THEN
                    EXTRACT(DAY FROM (MAX(o."orderedAt") - MIN(o."orderedAt")))::INTEGER /
                    NULLIF((COUNT(o.id) - 1), 0)
                ELSE
                    NULL
            END as avg_days_between_orders,

            -- Sample order count
            COUNT(CASE WHEN ol."isSample" = true THEN 1 END) as sample_order_lines,

            -- Revenue Score (0-100)
            -- Based on total revenue relative to average
            CASE
                WHEN COALESCE(SUM(o.total), 0) = 0 THEN 0
                WHEN v_avg_revenue = 0 THEN 50
                ELSE LEAST(100, GREATEST(0,
                    (COALESCE(SUM(o.total), 0) / NULLIF(v_avg_revenue, 0) * 50)::INTEGER
                ))
            END as revenue_score,

            -- Cadence Score (0-100)
            -- Based on recency and consistency of orders
            CASE
                WHEN COUNT(o.id) = 0 THEN 0
                WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER > 180 THEN 10
                WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER > 90 THEN 30
                WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER > 60 THEN 50
                WHEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(o."orderedAt")))::INTEGER > 30 THEN 70
                WHEN COUNT(o.id) >= 12 THEN 95  -- Excellent: 12+ orders
                WHEN COUNT(o.id) >= 6 THEN 85   -- Good: 6-11 orders
                WHEN COUNT(o.id) >= 3 THEN 75   -- Fair: 3-5 orders
                ELSE 60  -- Few orders but recent
            END as cadence_score,

            -- Sample Utilization Score (0-100)
            -- Based on sample order usage (assuming monthly allowance of 60)
            CASE
                WHEN COUNT(CASE WHEN ol."isSample" = true THEN 1 END) = 0 THEN 0
                WHEN COUNT(CASE WHEN ol."isSample" = true THEN 1 END) >= 60 THEN 100
                ELSE (COUNT(CASE WHEN ol."isSample" = true THEN 1 END)::FLOAT / 60.0 * 100)::INTEGER
            END as sample_utilization,

            -- Ordering consistency metric (for notes)
            CASE
                WHEN COUNT(o.id) <= 1 THEN 0
                WHEN c."orderingPaceDays" IS NOT NULL AND
                     ABS(c."orderingPaceDays" -
                         EXTRACT(DAY FROM (MAX(o."orderedAt") - MIN(o."orderedAt")))::INTEGER /
                         NULLIF((COUNT(o.id) - 1), 0)
                     ) <= 7 THEN 100
                ELSE 50
            END as ordering_consistency

        FROM "Customer" c
        LEFT JOIN "Order" o ON o."customerId" = c.id
            AND o."tenantId" = v_tenant_id
            AND o."orderedAt" IS NOT NULL
        LEFT JOIN "OrderLine" ol ON ol."orderId" = o.id
            AND ol."tenantId" = v_tenant_id
        WHERE c."tenantId" = v_tenant_id
        GROUP BY c.id, c.name, c."orderingPaceDays"
    ) customer_metrics;

    GET DIAGNOSTICS v_records_inserted = ROW_COUNT;

    RAISE NOTICE 'Successfully inserted % AccountHealthSnapshot records', v_records_inserted;

    -- Summary statistics
    RAISE NOTICE '=== Summary Statistics ===';
    RAISE NOTICE 'Revenue Score Distribution:';
    PERFORM 1 FROM (
        SELECT
            CASE
                WHEN "revenueScore" >= 80 THEN 'Excellent (80-100)'
                WHEN "revenueScore" >= 60 THEN 'Good (60-79)'
                WHEN "revenueScore" >= 40 THEN 'Fair (40-59)'
                WHEN "revenueScore" >= 20 THEN 'Poor (20-39)'
                ELSE 'Very Poor (0-19)'
            END as score_range,
            COUNT(*) as customer_count
        FROM "AccountHealthSnapshot"
        WHERE "tenantId" = v_tenant_id
            AND "snapshotDate" = v_snapshot_date
        GROUP BY score_range
        ORDER BY score_range
    ) revenue_dist;

    FOR rec IN (
        SELECT
            CASE
                WHEN "revenueScore" >= 80 THEN 'Excellent (80-100)'
                WHEN "revenueScore" >= 60 THEN 'Good (60-79)'
                WHEN "revenueScore" >= 40 THEN 'Fair (40-59)'
                WHEN "revenueScore" >= 20 THEN 'Poor (20-39)'
                ELSE 'Very Poor (0-19)'
            END as score_range,
            COUNT(*) as customer_count
        FROM "AccountHealthSnapshot"
        WHERE "tenantId" = v_tenant_id
            AND "snapshotDate" = v_snapshot_date
        GROUP BY score_range
        ORDER BY score_range
    ) LOOP
        RAISE NOTICE '  %: % customers', rec.score_range, rec.customer_count;
    END LOOP;

    RAISE NOTICE 'Cadence Score Distribution:';
    FOR rec IN (
        SELECT
            CASE
                WHEN "cadenceScore" >= 80 THEN 'Excellent (80-100)'
                WHEN "cadenceScore" >= 60 THEN 'Good (60-79)'
                WHEN "cadenceScore" >= 40 THEN 'Fair (40-59)'
                WHEN "cadenceScore" >= 20 THEN 'Poor (20-39)'
                ELSE 'Very Poor (0-19)'
            END as score_range,
            COUNT(*) as customer_count
        FROM "AccountHealthSnapshot"
        WHERE "tenantId" = v_tenant_id
            AND "snapshotDate" = v_snapshot_date
        GROUP BY score_range
        ORDER BY score_range
    ) LOOP
        RAISE NOTICE '  %: % customers', rec.score_range, rec.customer_count;
    END LOOP;

    RAISE NOTICE '=== End Summary ===';

END $$;

-- Verify the results
SELECT
    'Total Snapshots Created' as metric,
    COUNT(*)::TEXT as value
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT
    'Avg Revenue Score',
    ROUND(AVG("revenueScore"), 2)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT
    'Avg Cadence Score',
    ROUND(AVG("cadenceScore"), 2)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
UNION ALL
SELECT
    'Avg Sample Utilization',
    ROUND(AVG("sampleUtilization"), 2)::TEXT
FROM "AccountHealthSnapshot"
WHERE "tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

-- Sample of created records
SELECT
    c.name as customer_name,
    ahs."revenueScore",
    ahs."cadenceScore",
    ahs."sampleUtilization",
    ahs.notes,
    ahs."snapshotDate"
FROM "AccountHealthSnapshot" ahs
JOIN "Customer" c ON c.id = ahs."customerId"
WHERE ahs."tenantId" = '58b8126a-2d2f-4f55-bc98-5b6784800bed'
ORDER BY ahs."revenueScore" DESC, ahs."cadenceScore" DESC
LIMIT 10;

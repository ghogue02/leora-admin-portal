-- Foreign Key Constraints Script
-- Purpose: Add foreign key constraints to prevent orphaned records
-- Generated: 2025-10-23
-- Database: Leora2 (Supabase)

-- Enable detailed error reporting
\set ON_ERROR_STOP on
\set VERBOSITY verbose

-- Display current timestamp
SELECT 'Starting foreign key constraint addition at: ' || NOW();

-- ============================================================================
-- CONSTRAINT 1: Order → Customer
-- Prevents orders without valid customers
-- ============================================================================
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_order_customer'
    ) THEN
        ALTER TABLE "order"
            ADD CONSTRAINT fk_order_customer
            FOREIGN KEY (customerid)
            REFERENCES customer(id)
            ON DELETE RESTRICT;

        RAISE NOTICE 'Added constraint: fk_order_customer';
    ELSE
        RAISE NOTICE 'Constraint fk_order_customer already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- CONSTRAINT 2: OrderLine → Order
-- Prevents order lines without valid orders
-- Uses CASCADE to auto-delete lines when order is deleted
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_orderline_order'
    ) THEN
        ALTER TABLE orderline
            ADD CONSTRAINT fk_orderline_order
            FOREIGN KEY (orderid)
            REFERENCES "order"(id)
            ON DELETE CASCADE;

        RAISE NOTICE 'Added constraint: fk_orderline_order';
    ELSE
        RAISE NOTICE 'Constraint fk_orderline_order already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- CONSTRAINT 3: OrderLine → SKU
-- Prevents order lines referencing non-existent SKUs
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_orderline_sku'
    ) THEN
        ALTER TABLE orderline
            ADD CONSTRAINT fk_orderline_sku
            FOREIGN KEY (skuid)
            REFERENCES skus(id)
            ON DELETE RESTRICT;

        RAISE NOTICE 'Added constraint: fk_orderline_sku';
    ELSE
        RAISE NOTICE 'Constraint fk_orderline_sku already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- CONSTRAINT 4: SKU → Product
-- Prevents SKUs without valid products
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_sku_product'
    ) THEN
        ALTER TABLE skus
            ADD CONSTRAINT fk_sku_product
            FOREIGN KEY (productid)
            REFERENCES product(id)
            ON DELETE RESTRICT;

        RAISE NOTICE 'Added constraint: fk_sku_product';
    ELSE
        RAISE NOTICE 'Constraint fk_sku_product already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION: List all foreign key constraints
-- ============================================================================
SELECT
    'Foreign Key Constraints Summary' AS section,
    '' AS blank_line;

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('order', 'orderline', 'skus')
ORDER BY tc.table_name, tc.constraint_name;

-- Display completion timestamp
SELECT 'Constraint addition completed at: ' || NOW();

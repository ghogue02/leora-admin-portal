-- Foreign Key Constraint Test Script
-- Purpose: Verify that constraints prevent orphaned records
-- Generated: 2025-10-23

\set ON_ERROR_STOP off
\set VERBOSITY verbose

SELECT '======================================';
SELECT 'Foreign Key Constraint Testing';
SELECT '======================================';
SELECT '';

-- ============================================================================
-- TEST 1: Try to insert order with non-existent customer
-- Expected: FAIL with foreign key violation
-- ============================================================================
SELECT '--- TEST 1: Order with invalid customer ---';
INSERT INTO "order" (id, customerid, totalamount, orderdate, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '99999999-9999-9999-9999-999999999999',  -- Non-existent customer
    100.00,
    NOW(),
    'pending'
);
-- Expected error: foreign key constraint "fk_order_customer" violated

-- ============================================================================
-- TEST 2: Try to insert orderline with non-existent order
-- Expected: FAIL with foreign key violation
-- ============================================================================
SELECT '';
SELECT '--- TEST 2: OrderLine with invalid order ---';
INSERT INTO orderline (id, orderid, skuid, quantity, unitprice)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '99999999-9999-9999-9999-999999999999',  -- Non-existent order
    (SELECT id FROM skus LIMIT 1),
    1,
    50.00
);
-- Expected error: foreign key constraint "fk_orderline_order" violated

-- ============================================================================
-- TEST 3: Try to insert orderline with non-existent SKU
-- Expected: FAIL with foreign key violation
-- ============================================================================
SELECT '';
SELECT '--- TEST 3: OrderLine with invalid SKU ---';
INSERT INTO orderline (id, orderid, skuid, quantity, unitprice)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    (SELECT id FROM "order" LIMIT 1),
    '99999999-9999-9999-9999-999999999999',  -- Non-existent SKU
    1,
    50.00
);
-- Expected error: foreign key constraint "fk_orderline_sku" violated

-- ============================================================================
-- TEST 4: Try to insert SKU with non-existent product
-- Expected: FAIL with foreign key violation
-- ============================================================================
SELECT '';
SELECT '--- TEST 4: SKU with invalid product ---';
INSERT INTO skus (id, productid, name, price)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    '99999999-9999-9999-9999-999999999999',  -- Non-existent product
    'Test SKU',
    25.00
);
-- Expected error: foreign key constraint "fk_sku_product" violated

-- ============================================================================
-- TEST 5: Try to delete a customer that has orders
-- Expected: FAIL with foreign key violation (RESTRICT)
-- ============================================================================
SELECT '';
SELECT '--- TEST 5: Delete customer with existing orders ---';
DELETE FROM customer
WHERE id = (
    SELECT customerid FROM "order" LIMIT 1
);
-- Expected error: foreign key constraint "fk_order_customer" violated

-- ============================================================================
-- TEST 6: Try to delete a product that has SKUs
-- Expected: FAIL with foreign key violation (RESTRICT)
-- ============================================================================
SELECT '';
SELECT '--- TEST 6: Delete product with existing SKUs ---';
DELETE FROM product
WHERE id = (
    SELECT productid FROM skus LIMIT 1
);
-- Expected error: foreign key constraint "fk_sku_product" violated

-- ============================================================================
-- TEST 7: Verify CASCADE behavior (delete order should delete orderlines)
-- ============================================================================
SELECT '';
SELECT '--- TEST 7: Cascade delete test (order → orderlines) ---';

-- Create test data
BEGIN;

-- Insert test customer
INSERT INTO customer (id, firstname, lastname, email, phone, address, city, state, zipcode, country)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    'Test',
    'Customer',
    'test-cascade@example.com',
    '555-0000',
    '123 Test St',
    'Test City',
    'TS',
    '00000',
    'USA'
);

-- Insert test order
INSERT INTO "order" (id, customerid, totalamount, orderdate, status)
VALUES (
    '00000000-0000-0000-0000-000000000020',
    '00000000-0000-0000-0000-000000000010',
    100.00,
    NOW(),
    'pending'
);

-- Insert test orderline
INSERT INTO orderline (id, orderid, skuid, quantity, unitprice)
VALUES (
    '00000000-0000-0000-0000-000000000030',
    '00000000-0000-0000-0000-000000000020',
    (SELECT id FROM skus LIMIT 1),
    1,
    100.00
);

-- Count orderlines before delete
SELECT 'OrderLines before delete: ' || COUNT(*)::text
FROM orderline
WHERE orderid = '00000000-0000-0000-0000-000000000020';

-- Delete the order (should cascade to orderlines)
DELETE FROM "order" WHERE id = '00000000-0000-0000-0000-000000000020';

-- Count orderlines after delete
SELECT 'OrderLines after delete: ' || COUNT(*)::text
FROM orderline
WHERE orderid = '00000000-0000-0000-0000-000000000020';

-- Cleanup
DELETE FROM customer WHERE id = '00000000-0000-0000-0000-000000000010';

ROLLBACK;

SELECT '';
SELECT '======================================';
SELECT 'Test Summary:';
SELECT '- Tests 1-4: Should show FK violation errors';
SELECT '- Tests 5-6: Should show RESTRICT errors';
SELECT '- Test 7: Should show 0 orderlines after delete';
SELECT '======================================';

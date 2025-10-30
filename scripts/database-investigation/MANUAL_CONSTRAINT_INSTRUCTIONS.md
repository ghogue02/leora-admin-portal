# Foreign Key Constraints - Manual Addition Guide

## 🚨 CRITICAL: Database Protection Against Orphaned Records

**Status**: Database is clean (0 orphaned records) and ready for constraints

**Purpose**: Add 4 foreign key constraints to permanently prevent future orphaned records

---

## 📋 Prerequisites Verified

✅ **Database Clean**: 0 orphaned records across all tables
✅ **Relationships Verified**: All existing data has valid references
✅ **Ready for Constraints**: No data will be affected by constraint addition

---

## 🔧 How to Add Constraints

### Option 1: Supabase SQL Editor (RECOMMENDED)

1. **Go to Supabase Dashboard**
   - URL: https://wlwqkblueezqydturcpv.supabase.co
   - Navigate to: **SQL Editor**

2. **Create New Query**
   - Click "New Query"

3. **Copy and Paste SQL** (from `add-foreign-key-constraints.sql`)

4. **Execute**
   - Click "Run" button
   - Verify success messages

5. **Verify**
   - Run verification query (see below)

### Option 2: psql Command Line

```bash
# If you have direct database access
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  -f add-foreign-key-constraints.sql
```

---

## 📄 SQL to Execute

### Copy this entire block into Supabase SQL Editor:

```sql
-- ============================================================================
-- FOREIGN KEY CONSTRAINTS FOR LEORA2 DATABASE
-- Purpose: Prevent orphaned records permanently
-- Generated: 2025-10-23
-- ============================================================================

-- CONSTRAINT 1: Order → Customer (RESTRICT)
-- Prevents orders without valid customers
ALTER TABLE "Order"
ADD CONSTRAINT fk_order_customer
FOREIGN KEY ("CustomerId")
REFERENCES "Customer"(id)
ON DELETE RESTRICT;

-- CONSTRAINT 2: OrderLine → Order (CASCADE)
-- Prevents order lines without valid orders
-- Auto-deletes lines when order is deleted
ALTER TABLE "OrderLine"
ADD CONSTRAINT fk_orderline_order
FOREIGN KEY ("OrderId")
REFERENCES "Order"(id)
ON DELETE CASCADE;

-- CONSTRAINT 3: OrderLine → SKU (RESTRICT)
-- Prevents order lines referencing non-existent SKUs
ALTER TABLE "OrderLine"
ADD CONSTRAINT fk_orderline_sku
FOREIGN KEY ("SkuId")
REFERENCES "SKUs"(id)
ON DELETE RESTRICT;

-- CONSTRAINT 4: SKU → Product (RESTRICT)
-- Prevents SKUs without valid products
ALTER TABLE "SKUs"
ADD CONSTRAINT fk_sku_product
FOREIGN KEY ("ProductId")
REFERENCES "Product"(id)
ON DELETE RESTRICT;
```

---

## ✅ Verification Query

After adding constraints, run this to verify:

```sql
-- List all foreign key constraints
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
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
    AND tc.table_name IN ('Order', 'OrderLine', 'SKUs')
ORDER BY tc.table_name, tc.constraint_name;
```

**Expected Results**: 4 rows showing all constraints

---

## 🧪 Test Constraints

After adding, verify they work by testing:

### Test 1: Try to Insert Invalid Order (Should FAIL)

```sql
-- This should fail with FK violation
INSERT INTO "Order" (id, "CustomerId", "TotalAmount", "OrderDate", status)
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    '99999999-9999-9999-9999-999999999999'::uuid,  -- Invalid customer
    100.00,
    NOW(),
    'pending'
);
-- Expected: ERROR: foreign key constraint "fk_order_customer" violated
```

### Test 2: Try to Insert Invalid OrderLine (Should FAIL)

```sql
-- This should fail with FK violation
INSERT INTO "OrderLine" (id, "OrderId", "SkuId", quantity, "UnitPrice")
VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '99999999-9999-9999-9999-999999999999'::uuid,  -- Invalid order
    (SELECT id FROM "SKUs" LIMIT 1),
    1,
    50.00
);
-- Expected: ERROR: foreign key constraint "fk_orderline_order" violated
```

### Test 3: Try to Delete Customer with Orders (Should FAIL)

```sql
-- This should fail because RESTRICT prevents deletion
DELETE FROM "Customer"
WHERE id = (SELECT "CustomerId" FROM "Order" LIMIT 1);
-- Expected: ERROR: foreign key constraint "fk_order_customer" violated
```

### Test 4: Cascade Delete Test (Should SUCCEED)

```sql
BEGIN;

-- Create test order with orderlines
INSERT INTO "Order" (id, "CustomerId", "TotalAmount", "OrderDate", status)
SELECT
    '00000000-0000-0000-0000-000000TEST1'::uuid,
    id,
    100.00,
    NOW(),
    'test'
FROM "Customer" LIMIT 1;

INSERT INTO "OrderLine" (id, "OrderId", "SkuId", quantity, "UnitPrice")
SELECT
    '00000000-0000-0000-0000-000000TEST2'::uuid,
    '00000000-0000-0000-0000-000000TEST1'::uuid,
    id,
    1,
    100.00
FROM "SKUs" LIMIT 1;

-- Verify orderline exists
SELECT COUNT(*) FROM "OrderLine"
WHERE "OrderId" = '00000000-0000-0000-0000-000000TEST1'::uuid;
-- Should return: 1

-- Delete order (should cascade to orderlines)
DELETE FROM "Order"
WHERE id = '00000000-0000-0000-0000-000000TEST1'::uuid;

-- Verify orderline was deleted
SELECT COUNT(*) FROM "OrderLine"
WHERE "OrderId" = '00000000-0000-0000-0000-000000TEST1'::uuid;
-- Should return: 0 (cascade delete worked!)

ROLLBACK;  -- Cleanup
```

---

## 📊 What Each Constraint Does

### 1. **fk_order_customer** (Order → Customer)
- **Rule**: Every order MUST have a valid customer
- **Delete Behavior**: RESTRICT (cannot delete customer if they have orders)
- **Prevents**: Orders orphaned from customers

### 2. **fk_orderline_order** (OrderLine → Order)
- **Rule**: Every order line MUST belong to a valid order
- **Delete Behavior**: CASCADE (deleting order auto-deletes its lines)
- **Prevents**: Order lines orphaned from orders

### 3. **fk_orderline_sku** (OrderLine → SKU)
- **Rule**: Every order line MUST reference a valid SKU
- **Delete Behavior**: RESTRICT (cannot delete SKU if it's in orders)
- **Prevents**: Order lines referencing non-existent products

### 4. **fk_sku_product** (SKU → Product)
- **Rule**: Every SKU MUST belong to a valid product
- **Delete Behavior**: RESTRICT (cannot delete product if it has SKUs)
- **Prevents**: SKUs orphaned from products

---

## 🎯 Success Criteria

After execution, you should have:

✅ **4 constraints added** without errors
✅ **Test queries fail** with FK violations (expected)
✅ **Cascade delete works** for Order → OrderLine
✅ **Database protected** from future orphaned records

---

## 🔒 Database Protection Status

**BEFORE Constraints**:
- ❌ Can insert orders without customers
- ❌ Can insert orderlines without orders
- ❌ Can delete customers leaving orphaned orders
- ❌ Database integrity relies on application code

**AFTER Constraints**:
- ✅ Database enforces referential integrity
- ✅ Impossible to create orphaned records
- ✅ Cascade deletes maintain consistency
- ✅ Protection at database level (bulletproof)

---

## 📁 Files Created

- **add-foreign-key-constraints.sql** - Main constraint SQL (psql version)
- **test-foreign-key-constraints.sql** - Comprehensive test suite
- **MANUAL_CONSTRAINT_INSTRUCTIONS.md** - This guide
- **constraint-report.md** - Will be generated after execution

---

## 🚀 Next Steps

1. **Execute SQL** in Supabase SQL Editor
2. **Run verification query** to confirm 4 constraints
3. **Run test queries** to verify protection works
4. **Document results** in constraint-report.md

---

## 📞 Support

If you encounter errors:

1. **Constraint already exists**: Safe to ignore, means it's already added
2. **Permission denied**: Ensure using service role key
3. **Syntax error**: Check table/column names match exactly
4. **FK violation during add**: Means orphaned data exists (should not happen - we cleaned it!)

---

**Generated**: 2025-10-23
**Database**: wlwqkblueezqydturcpv.supabase.co
**Status**: Ready for execution ✅

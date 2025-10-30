-- FINAL IMPORT WORKFLOW
-- Run these steps IN ORDER:

-- ============================================================================
-- STEP 1: Apply existing customer matches (889 invoices)
-- ============================================================================
-- File: update-customers.sql (already created)
-- This matches 889 invoices to existing customers

-- ============================================================================
-- STEP 2: Create missing customers (618 new customers)
-- ============================================================================
-- File: 1-create-customers.sql
-- This adds the 618 customers found in PDFs

-- ============================================================================
-- STEP 3: Handle supplier invoices (264 invoices, $2.2M)
-- ============================================================================
-- File: 2-handle-supplier-invoices.sql
-- This moves 264 supplier invoices to separate table

-- ============================================================================
-- STEP 4: Re-run matching (after new customers added)
-- ============================================================================
-- Run this in terminal:
-- DATABASE_URL="postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require" node match-and-update.js

-- ============================================================================
-- STEP 5: Migrate ALL matched customer invoices to production
-- ============================================================================
SELECT * FROM migrate_all_matched_invoices();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check customer invoices in production
SELECT COUNT(*) as total_customer_invoices FROM "Invoice";
SELECT COUNT(*) as total_orders FROM "Order";

-- Check supplier invoices (separate tracking)
SELECT COUNT(*) as total_supplier_purchases FROM "SupplierInvoices";

-- Summary
SELECT
  'Customer Sales' as type,
  COUNT(*) as count,
  SUM(total) as value
FROM "ImportedInvoices"
WHERE invoice_type = 'customer_sale' AND matched_customer_id IS NOT NULL
UNION ALL
SELECT
  'Supplier Purchases',
  COUNT(*),
  SUM(total)
FROM "SupplierInvoices";

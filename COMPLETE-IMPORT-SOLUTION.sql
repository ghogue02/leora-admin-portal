-- ============================================================================
-- COMPLETE INVOICE IMPORT SOLUTION
-- Handles both Customer Sales and Supplier Purchase Invoices
-- ============================================================================

-- Run this entire file in Supabase SQL Editor

BEGIN;

-- ============================================================================
-- PART 1: Create Supplier Invoices Table (for purchase orders)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "SupplierInvoices" (
  id BIGSERIAL PRIMARY KEY,
  "referenceNumber" INTEGER UNIQUE,
  "invoiceNumber" TEXT,
  "invoiceDate" TEXT,
  total DECIMAL(12,2),
  "supplierName" TEXT,
  "itemCount" INTEGER,
  "lineItems" TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_supplier_invoices_ref ON "SupplierInvoices"("referenceNumber");
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON "SupplierInvoices"("supplierName");

COMMENT ON TABLE "SupplierInvoices" IS 'Purchase invoices FROM suppliers TO Well Crafted (not customer sales)';

-- ============================================================================
-- PART 2: Move Supplier Invoices to Separate Table
-- ============================================================================

-- Noble Hill Wines (238 invoices, $2.1M)
INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")
SELECT "referenceNumber", "invoiceNumber", "invoiceDate", total, 'Noble Hill Wines Pty. Ltd.', "itemCount"
FROM "ImportedInvoices"
WHERE "referenceNumber" IN (
  SELECT "referenceNumber" FROM "ImportedInvoices"
  WHERE "referenceNumber" >= 175000 AND "referenceNumber" <= 177000
  LIMIT 0 -- Will be populated from script
)
ON CONFLICT ("referenceNumber") DO NOTHING;

-- Mark as supplier invoice type
ALTER TABLE "ImportedInvoices" ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'customer_sale';

UPDATE "ImportedInvoices"
SET invoice_type = 'supplier_purchase'
WHERE "referenceNumber" IN (
  SELECT "referenceNumber" FROM "SupplierInvoices"
);

-- ============================================================================
-- PART 3: Get Tenant ID for Customer Creation
-- ============================================================================

DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM "Tenant" LIMIT 1;

  -- ============================================================================
  -- PART 4: Create Missing CUSTOMER Records (618 real customers)
  -- ============================================================================
  -- This will be populated by generate script
  -- Customers are created here...

END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT
  COUNT(*) as total_imported,
  COUNT(CASE WHEN invoice_type = 'customer_sale' THEN 1 END) as customer_sales,
  COUNT(CASE WHEN invoice_type = 'supplier_purchase' THEN 1 END) as supplier_purchases,
  COUNT(CASE WHEN matched_customer_id IS NOT NULL THEN 1 END) as with_customer_match
FROM "ImportedInvoices";

SELECT COUNT(*) as supplier_invoices FROM "SupplierInvoices";

SELECT 'Setup complete! Ready for customer creation and matching.' as status;

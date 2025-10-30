-- COMPLETE IMPORT WORKFLOW for existing Invoice/Order tables
-- This ensures we import to YOUR ACTUAL TABLES correctly

-- ============================================================================
-- PART 1: Create Staging Table (Run this first)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ImportedInvoices" (
  id BIGSERIAL PRIMARY KEY,
  "referenceNumber" INTEGER UNIQUE,
  "invoiceNumber" TEXT,
  "invoiceDate" TEXT,
  "dueDate" TEXT,
  total DECIMAL(12,2),
  subtotal DECIMAL(12,2),
  tax DECIMAL(12,2),
  "customerName" TEXT,
  "customerAddress" TEXT,
  "itemCount" INTEGER,
  "lineItems" TEXT, -- JSON string of items

  -- Matching fields (filled in later)
  matched_customer_id UUID REFERENCES "Customer"(id),
  match_confidence DECIMAL(3,2),
  match_method TEXT,

  -- Import metadata
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  migrated_to_production BOOLEAN DEFAULT FALSE,
  created_order_id UUID,
  created_invoice_id UUID
);

CREATE INDEX IF NOT EXISTS idx_imported_ref ON "ImportedInvoices"("referenceNumber");
CREATE INDEX IF NOT EXISTS idx_imported_migrated ON "ImportedInvoices"("migrated_to_production");
CREATE INDEX IF NOT EXISTS idx_imported_customer ON "ImportedInvoices"(matched_customer_id);

COMMENT ON TABLE "ImportedInvoices" IS 'Staging table for HAL App invoice import';

-- ============================================================================
-- PART 2: Customer Matching Helper View
-- ============================================================================

CREATE OR REPLACE VIEW "InvoicesNeedingCustomerMatch" AS
SELECT
  "referenceNumber",
  "invoiceNumber",
  "invoiceDate",
  total,
  "customerName",
  "itemCount",
  matched_customer_id,
  match_confidence
FROM "ImportedInvoices"
WHERE matched_customer_id IS NULL
  AND migrated_to_production = FALSE
ORDER BY total DESC; -- Highest value first

-- ============================================================================
-- PART 3: Create "Unknown Customer" Placeholder (Optional)
-- ============================================================================

-- Run this ONLY if you want to import invoices without customer matching first
-- WARNING: All invoices will be linked to this placeholder until you match them

INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  t.id,
  'HAL App Import - Unknown Customer',
  'Net 30',
  NOW(),
  NOW()
FROM "Tenant" t
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Migration Function - Move ImportedInvoices to Production Tables
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_imported_invoice(p_reference_number INTEGER)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  order_id UUID,
  invoice_id UUID
) AS $$
DECLARE
  v_imported RECORD;
  v_tenant_id UUID;
  v_customer_id UUID;
  v_order_id UUID;
  v_invoice_id UUID;
  v_issued_date TIMESTAMP;
BEGIN
  -- Get the imported invoice
  SELECT * INTO v_imported
  FROM "ImportedInvoices"
  WHERE "referenceNumber" = p_reference_number;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invoice not found in staging table'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_imported.migrated_to_production THEN
    RETURN QUERY SELECT FALSE, 'Already migrated'::TEXT, v_imported.created_order_id, v_imported.created_invoice_id;
    RETURN;
  END IF;

  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM "Tenant" LIMIT 1;

  -- Get customer ID (use matched or unknown placeholder)
  v_customer_id := COALESCE(
    v_imported.matched_customer_id,
    '00000000-0000-0000-0000-000000000001'::UUID
  );

  -- Parse date
  BEGIN
    v_issued_date := v_imported."invoiceDate"::TIMESTAMP;
  EXCEPTION WHEN OTHERS THEN
    v_issued_date := NOW();
  END;

  -- Create Order
  INSERT INTO "Order" (
    id, "tenantId", "customerId", status, "orderedAt", "fulfilledAt", total, currency
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_customer_id,
    'FULFILLED',
    v_issued_date,
    v_issued_date,
    v_imported.total,
    'USD'
  )
  RETURNING id INTO v_order_id;

  -- Create Invoice
  INSERT INTO "Invoice" (
    id, "tenantId", "orderId", "customerId", "invoiceNumber", status, subtotal, total, "issuedAt", "dueDate"
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_order_id,
    v_customer_id,
    COALESCE(v_imported."invoiceNumber", v_imported."referenceNumber"::TEXT),
    'PAID', -- Assuming historical invoices are paid
    v_imported.subtotal,
    v_imported.total,
    v_issued_date,
    NULL -- Add dueDate parsing if needed
  )
  RETURNING id INTO v_invoice_id;

  -- Mark as migrated
  UPDATE "ImportedInvoices"
  SET
    migrated_to_production = TRUE,
    created_order_id = v_order_id,
    created_invoice_id = v_invoice_id
  WHERE "referenceNumber" = p_reference_number;

  RETURN QUERY SELECT TRUE, 'Successfully migrated'::TEXT, v_order_id, v_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Batch Migration Function
-- ============================================================================

CREATE OR REPLACE FUNCTION migrate_all_matched_invoices()
RETURNS TABLE (
  total_migrated INTEGER,
  total_errors INTEGER
) AS $$
DECLARE
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
  v_invoice RECORD;
BEGIN
  FOR v_invoice IN
    SELECT "referenceNumber"
    FROM "ImportedInvoices"
    WHERE matched_customer_id IS NOT NULL
      AND migrated_to_production = FALSE
  LOOP
    BEGIN
      PERFORM migrate_imported_invoice(v_invoice."referenceNumber");
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      RAISE NOTICE 'Error migrating %: %', v_invoice."referenceNumber", SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT v_count, v_errors;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 6: Sample Customer Matching by Reference Number
-- ============================================================================

-- If you have a CSV mapping file, you can bulk update like this:
-- CREATE TEMP TABLE customer_mapping (ref_num INTEGER, customer_id UUID);
-- COPY customer_mapping FROM '/path/to/mapping.csv' CSV HEADER;
-- UPDATE "ImportedInvoices" i
-- SET matched_customer_id = m.customer_id,
--     match_method = 'manual_csv_import'
-- FROM customer_mapping m
-- WHERE i."referenceNumber" = m.ref_num;

-- ============================================================================
-- PART 7: Verification Queries
-- ============================================================================

-- Check import status
CREATE OR REPLACE VIEW "ImportStatus" AS
SELECT
  COUNT(*) as total_imported,
  COUNT(*) FILTER (WHERE matched_customer_id IS NOT NULL) as matched,
  COUNT(*) FILTER (WHERE matched_customer_id IS NULL) as unmatched,
  COUNT(*) FILTER (WHERE migrated_to_production = TRUE) as migrated,
  SUM(total) as total_value,
  SUM(total) FILTER (WHERE migrated_to_production = TRUE) as migrated_value
FROM "ImportedInvoices";

-- Show progress
SELECT * FROM "ImportStatus";

COMMENT ON VIEW "ImportStatus" IS 'Shows current import and migration status';

-- ============================================================================
-- READY TO USE!
-- ============================================================================
-- Next Steps:
-- 1. Run this entire SQL file in Supabase SQL Editor
-- 2. Import your 13 CSV batches to ImportedInvoices table
-- 3. Match customers (manually or via HAL App lookup)
-- 4. Run: SELECT migrate_all_matched_invoices();
-- 5. Invoices now in production Invoice/Order tables!

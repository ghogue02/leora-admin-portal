-- Fix migration function to include updatedAt
-- Run this to fix the migration issue

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

  -- Get customer ID
  v_customer_id := v_imported.matched_customer_id;

  IF v_customer_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No customer match'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Parse date
  BEGIN
    v_issued_date := v_imported."invoiceDate"::TIMESTAMP;
  EXCEPTION WHEN OTHERS THEN
    v_issued_date := NOW();
  END;

  -- Create Order (with createdAt and updatedAt)
  INSERT INTO "Order" (
    id, "tenantId", "customerId", status, "orderedAt", "fulfilledAt", total, currency, "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_customer_id,
    'FULFILLED',
    v_issued_date,
    v_issued_date,
    v_imported.total,
    'USD',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_order_id;

  -- Create Invoice (with createdAt and updatedAt)
  INSERT INTO "Invoice" (
    id, "tenantId", "orderId", "customerId", "invoiceNumber", status, subtotal, total, "issuedAt", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid(),
    v_tenant_id,
    v_order_id,
    v_customer_id,
    COALESCE(v_imported."invoiceNumber", v_imported."referenceNumber"::TEXT),
    'PAID',
    v_imported.subtotal,
    v_imported.total,
    v_issued_date,
    NOW(),
    NOW()
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

-- Test it
SELECT * FROM migrate_imported_invoice(174483);

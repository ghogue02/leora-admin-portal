-- Create staging table for imported invoices
-- Run this in Supabase SQL Editor first

CREATE TABLE IF NOT EXISTS "ImportedInvoices" (
  id BIGSERIAL PRIMARY KEY,
  "referenceNumber" INTEGER,
  "invoiceNumber" TEXT,
  "invoiceDate" TEXT,
  "dueDate" TEXT,
  total DECIMAL(12,2),
  subtotal DECIMAL(12,2),
  tax DECIMAL(12,2),
  "customerName" TEXT,
  "customerAddress" TEXT,
  "itemCount" INTEGER,
  "lineItems" TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_imported_invoices_ref ON "ImportedInvoices"("referenceNumber");
CREATE INDEX IF NOT EXISTS idx_imported_invoices_num ON "ImportedInvoices"("invoiceNumber");
CREATE INDEX IF NOT EXISTS idx_imported_invoices_customer ON "ImportedInvoices"("customerName");

-- View to show invoices that need customer matching
CREATE OR REPLACE VIEW "ImportedInvoicesNeedingCustomers" AS
SELECT
  "referenceNumber",
  "invoiceNumber",
  "invoiceDate",
  total,
  "customerName",
  "itemCount"
FROM "ImportedInvoices"
WHERE "customerName" IS NULL OR "customerName" = ''
ORDER BY "referenceNumber";

COMMENT ON TABLE "ImportedInvoices" IS 'Staging table for bulk invoice import from HAL App PDFs';
COMMENT ON VIEW "ImportedInvoicesNeedingCustomers" IS 'Shows invoices that need customer information filled in';

-- Success message
SELECT
  'ImportedInvoices table created successfully!' as message,
  'You can now import your CSV files via Table Editor' as next_step;

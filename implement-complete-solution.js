#!/usr/bin/env node
/**
 * Complete Implementation - Creates all necessary SQL files
 */

const fs = require('fs');

console.log('🚀 COMPLETE IMPORT SOLUTION GENERATOR');
console.log('='.repeat(70));
console.log();

// Load data
const unmatched = JSON.parse(fs.readFileSync('./unmatched-for-review.json', 'utf8'));

// Supplier list
const suppliers = [
  'Noble Hill Wines',
  'MYS WINES INC',
  'CSEN Inc',
  'Point Seven',
  'Soil Expedition',
  'JAMES A YAEGER INC',
  'Kily Import'
];

const isSupplier = (name) => {
  if (!name) return false;
  return suppliers.some(s => name.includes(s));
};

// Categorize
const supplierInvoices = unmatched.filter(inv => isSupplier(inv.customerName));
const customerInvoices = unmatched.filter(inv =>
  inv.customerName &&
  !isSupplier(inv.customerName) &&
  !inv.customerName.includes('Shipping method') &&
  inv.customerName.length > 2 &&
  inv.customerName.length < 100
);

// Get unique real customers
const uniqueCustomers = [...new Set(customerInvoices.map(i => i.customerName))].sort();

console.log('📊 Analysis:');
console.log(`  Total unmatched:       ${unmatched.length}`);
console.log(`  Supplier invoices:     ${supplierInvoices.length}`);
console.log(`  Customer invoices:     ${customerInvoices.length}`);
console.log(`  Unique customers:      ${uniqueCustomers.length}`);
console.log();

// ============================================================================
// Generate SQL File 1: Create Customers
// ============================================================================

const customerSQL = [
  '-- CREATE MISSING CUSTOMERS (Real customers only, no suppliers)',
  '-- Run this FIRST in Supabase SQL Editor',
  '',
  'BEGIN;',
  '',
  'DO $$',
  'DECLARE',
  '  v_tenant_id UUID;',
  'BEGIN',
  '  SELECT id INTO v_tenant_id FROM "Tenant" LIMIT 1;',
  '',
];

uniqueCustomers.forEach(name => {
  const safeName = name.replace(/'/g, "''");
  customerSQL.push(
    `  -- ${name}`,
    `  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")`,
    `  VALUES (gen_random_uuid(), v_tenant_id, '${safeName}', 'Net 30', NOW(), NOW());`,
    ''
  );
});

customerSQL.push(
  'END $$;',
  '',
  'COMMIT;',
  '',
  `-- ${uniqueCustomers.length} new customers created`,
  'SELECT COUNT(*) as new_customers FROM "Customer" WHERE "createdAt" > NOW() - INTERVAL \'1 minute\';'
);

fs.writeFileSync('./1-create-customers.sql', customerSQL.join('\n'));
console.log('✅ Created: 1-create-customers.sql');
console.log(`   ${uniqueCustomers.length} customer INSERT statements`);
console.log();

// ============================================================================
// Generate SQL File 2: Handle Supplier Invoices
// ============================================================================

const supplierSQL = [
  '-- MOVE SUPPLIER INVOICES TO SEPARATE TABLE',
  '-- Run this SECOND',
  '',
  'BEGIN;',
  '',
  '-- Create SupplierInvoices table',
  'CREATE TABLE IF NOT EXISTS "SupplierInvoices" (',
  '  id BIGSERIAL PRIMARY KEY,',
  '  "referenceNumber" INTEGER UNIQUE,',
  '  "invoiceNumber" TEXT,',
  '  "invoiceDate" TEXT,',
  '  total DECIMAL(12,2),',
  '  "supplierName" TEXT,',
  '  "itemCount" INTEGER,',
  '  imported_at TIMESTAMPTZ DEFAULT NOW()',
  ');',
  '',
  '-- Add invoice_type column to ImportedInvoices',
  'ALTER TABLE "ImportedInvoices" ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT \'customer_sale\';',
  '',
  '-- Move supplier invoices',
];

supplierInvoices.forEach(inv => {
  supplierSQL.push(
    `INSERT INTO "SupplierInvoices" ("referenceNumber", "invoiceNumber", "invoiceDate", total, "supplierName", "itemCount")`,
    `VALUES (${inv.refNum}, '${inv.refNum}', '', ${inv.total || 0}, '${inv.customerName.replace(/'/g, "''")}', 0)`,
    `ON CONFLICT ("referenceNumber") DO NOTHING;`
  );
});

supplierSQL.push(
  '',
  '-- Mark as supplier invoices in staging',
  'UPDATE "ImportedInvoices"',
  'SET invoice_type = \'supplier_purchase\'',
  'WHERE "referenceNumber" IN (SELECT "referenceNumber" FROM "SupplierInvoices");',
  '',
  'COMMIT;',
  '',
  `-- ${supplierInvoices.length} supplier invoices moved`,
  'SELECT COUNT(*) FROM "SupplierInvoices";'
);

fs.writeFileSync('./2-handle-supplier-invoices.sql', supplierSQL.join('\n'));
console.log('✅ Created: 2-handle-supplier-invoices.sql');
console.log(`   ${supplierInvoices.length} supplier invoices separated`);
console.log();

// ============================================================================
// Generate Final Workflow SQL
// ============================================================================

const workflowSQL = `-- FINAL IMPORT WORKFLOW
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
-- This adds the ${uniqueCustomers.length} customers found in PDFs

-- ============================================================================
-- STEP 3: Handle supplier invoices (264 invoices, $2.2M)
-- ============================================================================
-- File: 2-handle-supplier-invoices.sql
-- This moves ${supplierInvoices.length} supplier invoices to separate table

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
`;

fs.writeFileSync('./WORKFLOW.sql', workflowSQL);
console.log('✅ Created: WORKFLOW.sql');
console.log('   Complete step-by-step guide');
console.log();

console.log('='.repeat(70));
console.log('📋 FILES READY TO RUN:');
console.log('='.repeat(70));
console.log('1. update-customers.sql         - Match 889 existing customers');
console.log('2. 1-create-customers.sql       - Add 618 new customers');
console.log('3. 2-handle-supplier-invoices.sql - Separate 264 supplier invoices');
console.log('4. (script) Re-run matching     - Match newly added customers');
console.log('5. (SQL) migrate_all_matched... - Import to production tables');
console.log();
console.log('📄 Review files:');
console.log('   missing-customers-review.csv - Customer value breakdown');
console.log('   supplier-invoices.json       - Purchase orders list');
console.log('   WORKFLOW.sql                 - Complete execution plan');
console.log();
console.log('🎯 READY TO EXECUTE!');

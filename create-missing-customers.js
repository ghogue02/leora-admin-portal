#!/usr/bin/env node
/**
 * Create missing customers from unmatched invoices
 */

const fs = require('fs');

console.log('🏢 CREATE MISSING CUSTOMERS SQL GENERATOR');
console.log('='.repeat(70));
console.log();

// Load unmatched invoices
const unmatched = JSON.parse(fs.readFileSync('./unmatched-for-review.json', 'utf8'));

// Filter out invalid customer names
const validCustomers = unmatched.filter(inv =>
  inv.customerName &&
  inv.customerName.length > 2 &&
  inv.customerName.length < 100 &&
  !inv.customerName.includes('Shipping method') &&
  !inv.customerName.includes('shall be') &&
  !inv.customerName.includes('@')
);

console.log(`Total unmatched: ${unmatched.length}`);
console.log(`Valid customer names: ${validCustomers.length}\n`);

// Get unique customer names
const uniqueCustomerNames = [...new Set(validCustomers.map(i => i.customerName))].sort();

console.log(`Unique customer names to create: ${uniqueCustomerNames.length}\n`);

// Generate SQL
const sqlLines = [
  '-- Create missing customers from invoice import',
  '-- These customers were found in invoices but not in the database',
  '',
  'BEGIN;',
  '',
  '-- Get tenant ID',
  'DO $$',
  'DECLARE',
  '  v_tenant_id UUID;',
  'BEGIN',
  '  SELECT id INTO v_tenant_id FROM "Tenant" LIMIT 1;',
  '',
];

uniqueCustomerNames.forEach(name => {
  const safeName = name.replace(/'/g, "''"); // Escape single quotes for SQL
  sqlLines.push(
    `  -- Create: ${name}`,
    `  INSERT INTO "Customer" (id, "tenantId", name, "paymentTerms", "createdAt", "updatedAt")`,
    `  VALUES (gen_random_uuid(), v_tenant_id, '${safeName}', 'Net 30', NOW(), NOW());`,
    ''
  );
});

sqlLines.push(
  'END $$;',
  '',
  'COMMIT;',
  '',
  '-- Verify',
  'SELECT COUNT(*) as customers_created FROM "Customer" WHERE "createdAt" > NOW() - INTERVAL \'1 minute\';',
  '',
  `-- Expected: ${uniqueCustomerNames.length} new customers`
);

const sql = sqlLines.join('\n');
fs.writeFileSync('./create-missing-customers.sql', sql);

console.log('✅ SQL file created: create-missing-customers.sql');
console.log(`   ${uniqueCustomerNames.length} INSERT statements generated`);
console.log();
console.log('📋 Sample customers to be created:');
uniqueCustomerNames.slice(0, 20).forEach(name => {
  console.log(`   - ${name}`);
});

if (uniqueCustomerNames.length > 20) {
  console.log(`   ... and ${uniqueCustomerNames.length - 20} more`);
}

console.log();
console.log('🚀 Next steps:');
console.log('1. Review create-missing-customers.sql');
console.log('2. Run it in Supabase SQL Editor');
console.log(`3. ${uniqueCustomerNames.length} new customers will be created`);
console.log('4. Re-run: node match-and-update.js');
console.log('5. All invoices will match!');

// Also create a review CSV
const csvLines = ['customerName,invoiceCount,totalValue'];
const customerStats = {};

validCustomers.forEach(inv => {
  if (!customerStats[inv.customerName]) {
    customerStats[inv.customerName] = { count: 0, total: 0 };
  }
  customerStats[inv.customerName].count++;
  customerStats[inv.customerName].total += inv.total || 0;
});

Object.entries(customerStats)
  .sort((a, b) => b[1].total - a[1].total)
  .forEach(([name, stats]) => {
    csvLines.push(`"${name.replace(/"/g, '""')}",${stats.count},${stats.total.toFixed(2)}`);
  });

fs.writeFileSync('./missing-customers-review.csv', csvLines.join('\n'));
console.log();
console.log('📄 Review CSV created: missing-customers-review.csv');
console.log('   Shows invoice count and total value per customer');

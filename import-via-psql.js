#!/usr/bin/env node
/**
 * Import invoices using direct PostgreSQL connection
 * Bypasses Supabase client permission issues
 */

const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const DB_URL = process.env.DATABASE_URL;

async function query(sql) {
  const cmd = `psql "${DB_URL}" -c "${sql.replace(/"/g, '\\"')}"`;
  const { stdout, stderr } = await execPromise(cmd);
  if (stderr && !stderr.includes('NOTICE')) {
    console.error('SQL Error:', stderr);
  }
  return stdout;
}

async function importInvoices(parsedFile) {
  console.log('📥 DIRECT POSTGRESQL IMPORT');
  console.log('='.repeat(70));
  console.log();

  // Load parsed invoices
  console.log(`📂 Loading: ${parsedFile}`);
  const invoices = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));
  console.log(`✅ Loaded ${invoices.length} invoices\n`);

  // Get tenant ID
  console.log('🔍 Getting tenant ID...');
  const tenantResult = await query('SELECT id FROM "Tenant" LIMIT 1');
  const tenantId = tenantResult.split('\n')[2].trim();
  console.log(`✅ Tenant ID: ${tenantId}\n`);

  // Load customers for matching
  console.log('📋 Loading customers...');
  const customersResult = await query('SELECT id, name FROM "Customer"');
  const customerLines = customersResult.split('\n').slice(2, -2);
  const customers = customerLines.map(line => {
    const parts = line.trim().split('|').map(p => p.trim());
    return { id: parts[0], name: parts[1] };
  });
  console.log(`✅ Loaded ${customers.length} customers\n`);

  // Simple customer matching function
  function matchCustomer(invoiceCustomerName) {
    if (!invoiceCustomerName) return null;
    const normalized = invoiceCustomerName.toLowerCase().trim();

    for (const customer of customers) {
      if (customer.name.toLowerCase().trim() === normalized) {
        return customer.id;
      }
    }
    return null;
  }

  // Import stats
  const stats = {
    total: invoices.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  console.log('⚙️  Starting import...\n');

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    const invNum = invoice.invoiceNumber || `${invoice.refNum}`;

    // Skip if no total
    if (!invoice.total) {
      stats.skipped++;
      continue;
    }

    // Try to match customer
    let customerId = invoice.customerId || matchCustomer(invoice.customerName);

    // If no customer match, skip for now
    if (!customerId) {
      stats.skipped++;
      if (i % 100 === 0) {
        console.log(`   [${((i/invoices.length)*100).toFixed(1)}%] No customer match for: ${invNum}`);
      }
      continue;
    }

    try {
      // Create order first
      const orderSql = `
        INSERT INTO "Order" ("id", "tenantId", "customerId", "status", "orderedAt", "fulfilledAt", "total", "currency")
        VALUES (
          gen_random_uuid(),
          '${tenantId}',
          '${customerId}',
          'FULFILLED',
          COALESCE('${invoice.date ? new Date(invoice.date).toISOString() : new Date().toISOString()}', NOW()),
          COALESCE('${invoice.date ? new Date(invoice.date).toISOString() : new Date().toISOString()}', NOW()),
          ${invoice.total || 0},
          'USD'
        )
        RETURNING id
      `;

      const orderResult = await query(orderSql);
      const orderId = orderResult.split('\n')[2].trim();

      // Create invoice
      const invoiceSql = `
        INSERT INTO "Invoice" ("id", "tenantId", "customerId", "orderId", "invoiceNumber", "status", "subtotal", "total", "issuedAt")
        VALUES (
          gen_random_uuid(),
          '${tenantId}',
          '${customerId}',
          '${orderId}',
          '${invNum}',
          'PAID',
          ${invoice.subtotal || invoice.total || 0},
          ${invoice.total || 0},
          COALESCE('${invoice.date ? new Date(invoice.date).toISOString() : new Date().toISOString()}', NOW())
        )
      `;

      await query(invoiceSql);

      stats.imported++;

      if (i % 100 === 0) {
        console.log(`   ✅ [${((i/invoices.length)*100).toFixed(1)}%] Imported: ${stats.imported}, Skipped: ${stats.skipped}`);
      }

    } catch (error) {
      stats.errors++;
      if (i % 100 === 0) {
        console.log(`   ❌ Error importing ${invNum}: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total invoices:      ${stats.total}`);
  console.log(`✅ Imported:          ${stats.imported}`);
  console.log(`⏭️  Skipped:           ${stats.skipped}`);
  console.log(`❌ Errors:            ${stats.errors}`);
  console.log();

  return stats;
}

// Run
if (require.main === module) {
  const parsedFile = process.argv[2] || 'import-results/parsed-invoices-1760806180133.json';

  if (!fs.existsSync(parsedFile)) {
    console.error(`❌ File not found: ${parsedFile}`);
    process.exit(1);
  }

  importInvoices(parsedFile).catch(console.error);
}

module.exports = { importInvoices };

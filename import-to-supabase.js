#!/usr/bin/env node
/**
 * Import parsed invoices to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse date string to timestamp
function parseDate(dateStr) {
  if (!dateStr) return null;

  try {
    // Handle MM/DD/YYYY or MM-DD-YYYY
    const match1 = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (match1) {
      const [, month, day, year] = match1;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`).toISOString();
    }

    // Handle "Month DD, YYYY"
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  } catch (error) {
    console.error(`Failed to parse date: ${dateStr}`);
  }

  return null;
}

async function importInvoices(parsedFile, options = {}) {
  const {
    dryRun = false,
    skipExisting = true,
    createOrders = true,
    createPayments = false,
  } = options;

  console.log('📥 INVOICE IMPORT TO SUPABASE');
  console.log('='.repeat(70));
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE IMPORT'}`);
  console.log(`Skip existing: ${skipExisting}`);
  console.log(`Create orders: ${createOrders}`);
  console.log(`Create payments: ${createPayments}`);
  console.log();

  // Load parsed invoices
  console.log(`📂 Loading parsed invoices from: ${parsedFile}`);
  const invoices = JSON.parse(fs.readFileSync(parsedFile, 'utf8'));
  console.log(`✅ Loaded ${invoices.length} invoices\n`);

  // Get tenant ID
  console.log('🔍 Getting tenant ID...');
  const { data: tenant, error: tenantError } = await supabase
    .from('Tenant')
    .select('id')
    .limit(1)
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Could not find tenant');
    return;
  }

  const tenantId = tenant.id;
  console.log(`✅ Tenant ID: ${tenantId}\n`);

  // Get existing invoices
  let existingInvoiceNumbers = new Set();
  if (skipExisting) {
    console.log('📋 Checking for existing invoices...');
    const { data: existing } = await supabase
      .from('Invoice')
      .select('invoiceNumber');

    if (existing) {
      existingInvoiceNumbers = new Set(existing.map(inv => inv.invoiceNumber));
      console.log(`✅ Found ${existingInvoiceNumbers.size} existing invoices\n`);
    }
  }

  // Statistics
  const stats = {
    total: invoices.length,
    skipped: 0,
    noCustomer: 0,
    created: 0,
    errors: 0,
  };

  const errors = [];

  console.log('⚙️  Starting import...\n');

  for (let i = 0; i < invoices.length; i++) {
    const invoice = invoices[i];
    const progress = ((i / invoices.length) * 100).toFixed(1);

    // Skip if exists
    const invNum = invoice.invoiceNumber || `${invoice.refNum}`;
    if (skipExisting && existingInvoiceNumbers.has(invNum)) {
      stats.skipped++;
      if (i % 100 === 0) {
        console.log(`   [${progress}%] Processed ${i}/${invoices.length} | Skipped: ${stats.skipped}`);
      }
      continue;
    }

    // Skip if no customer match
    if (!invoice.customerId) {
      stats.noCustomer++;
      if (i % 100 === 0) {
        console.log(`   [${progress}%] Processed ${i}/${invoices.length} | No customer: ${stats.noCustomer}`);
      }
      continue;
    }

    try {
      if (!dryRun) {
        // Create Order first
        let orderId = null;

        if (createOrders) {
          const orderData = {
            tenantId,
            customerId: invoice.customerId,
            status: 'FULFILLED',
            orderedAt: parseDate(invoice.date) || new Date().toISOString(),
            fulfilledAt: parseDate(invoice.date) || new Date().toISOString(),
            total: invoice.total || 0,
            currency: 'USD',
          };

          const { data: order, error: orderError } = await supabase
            .from('Order')
            .insert(orderData)
            .select()
            .single();

          if (orderError) {
            throw new Error(`Order creation failed: ${orderError.message}`);
          }

          orderId = order.id;

          // Create OrderLines if we have items
          if (invoice.items && invoice.items.length > 0) {
            // Note: This requires SKU matching which we don't have yet
            // For now, skip line items - can be added in phase 2
          }
        }

        // Create Invoice
        const invoiceData = {
          tenantId,
          customerId: invoice.customerId,
          orderId: orderId,
          invoiceNumber: invNum,
          status: 'PAID', // Assuming all historical invoices are paid
          subtotal: invoice.subtotal || invoice.total || 0,
          total: invoice.total || 0,
          issuedAt: parseDate(invoice.date) || new Date().toISOString(),
          dueDate: parseDate(invoice.dueDate),
        };

        const { error: invoiceError } = await supabase
          .from('Invoice')
          .insert(invoiceData);

        if (invoiceError) {
          throw new Error(`Invoice creation failed: ${invoiceError.message}`);
        }

        // Create Payment record if requested
        if (createPayments && orderId) {
          const paymentData = {
            tenantId,
            customerId: invoice.customerId,
            orderId: orderId,
            invoiceId: null, // Would need to get the created invoice ID
            amount: invoice.total || 0,
            currency: 'USD',
            status: 'COMPLETED',
            paidAt: parseDate(invoice.date) || new Date().toISOString(),
          };

          await supabase.from('Payment').insert(paymentData);
        }
      }

      stats.created++;

      if (i % 100 === 0) {
        console.log(`   ✅ [${progress}%] Processed ${i}/${invoices.length} | Created: ${stats.created}`);
      }

    } catch (error) {
      stats.errors++;
      errors.push({
        refNum: invoice.refNum,
        invoiceNumber: invNum,
        error: error.message,
      });

      if (i % 100 === 0) {
        console.log(`   ❌ [${progress}%] Processed ${i}/${invoices.length} | Errors: ${stats.errors}`);
      }
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 IMPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total invoices:      ${stats.total}`);
  console.log(`✅ Created:           ${stats.created}`);
  console.log(`⏭️  Skipped (exists):  ${stats.skipped}`);
  console.log(`⚠️  No customer match: ${stats.noCustomer}`);
  console.log(`❌ Errors:            ${stats.errors}`);
  console.log();

  if (dryRun) {
    console.log('🔵 DRY RUN - No changes were made to the database');
    console.log('   Remove --dry-run flag to perform actual import');
  }

  // Save error log
  if (errors.length > 0) {
    const errorPath = path.join(__dirname, 'import-results', `import-errors-${Date.now()}.json`);
    fs.writeFileSync(errorPath, JSON.stringify(errors, null, 2));
    console.log(`\n❌ Errors saved to: ${errorPath}`);
  }

  return { stats, errors };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node import-to-supabase.js <parsed-file.json> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run           Show what would be imported without making changes');
    console.log('  --no-skip-existing  Import even if invoice already exists');
    console.log('  --create-payments   Create payment records for each invoice');
    console.log('  --no-orders         Skip order creation');
    console.log('');
    console.log('Example:');
    console.log('  node import-to-supabase.js import-results/parsed-invoices-*.json --dry-run');
    process.exit(1);
  }

  const parsedFile = args[0];
  const options = {
    dryRun: args.includes('--dry-run'),
    skipExisting: !args.includes('--no-skip-existing'),
    createOrders: !args.includes('--no-orders'),
    createPayments: args.includes('--create-payments'),
  };

  if (!fs.existsSync(parsedFile)) {
    console.error(`❌ File not found: ${parsedFile}`);
    process.exit(1);
  }

  importInvoices(parsedFile, options).catch(console.error);
}

module.exports = { importInvoices };

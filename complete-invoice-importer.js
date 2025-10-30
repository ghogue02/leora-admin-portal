#!/usr/bin/env node
/**
 * Complete Invoice Import System
 * Parses 3000+ PDFs and imports to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const CONFIG = {
  invoicesDir: './invoices',
  outputDir: './import-results',
  batchSize: 100, // Process in batches
  skipBlankPDFs: true,
  tenantId: null, // Will be fetched from database
};

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Ensure output directory
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Extract text from PDF
async function extractPdfText(pdfPath) {
  try {
    // Try pdftotext first
    const { stdout } = await execPromise(`pdftotext "${pdfPath}" - 2>/dev/null`);
    return stdout;
  } catch {
    try {
      // Fallback to strings
      const { stdout } = await execPromise(`strings "${pdfPath}" 2>/dev/null`);
      return stdout;
    } catch {
      return null;
    }
  }
}

// Parse invoice from PDF text
function parseInvoice(text, refNum) {
  if (!text || text.trim().length < 100) {
    return { isBlank: true, refNum };
  }

  const invoice = {
    isBlank: false,
    refNum,
    invoiceNumber: null,
    customerName: null,
    customerAddress: null,
    date: null,
    dueDate: null,
    subtotal: null,
    tax: null,
    total: null,
    items: [],
    notes: null,
  };

  // Extract invoice number (often same as ref number)
  const invMatch = text.match(/(?:Invoice|INV)[\s#:]*(\d+)/i);
  if (invMatch) invoice.invoiceNumber = invMatch[1];

  // Extract customer name - specific pattern for HAL App invoices
  // Format varies: "Bill to:" then customer name appears after skipping headers
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const billToIndex = lines.findIndex(l => /^Bill\s+to:?$/i.test(l));

  if (billToIndex >= 0) {
    // Look at the next few lines after "Bill to:"
    for (let i = billToIndex + 1; i < Math.min(billToIndex + 6, lines.length); i++) {
      const line = lines[i];

      // Skip header lines
      if (/^(Ship\s+to|Customer\s+ID|Seller):?$/i.test(line)) continue;
      if (line.includes('Industrial Way')) continue; // Seller address
      if (line.includes('Canopy Wine')) continue; // Seller name
      if (line.includes('shall be')) continue; // Legal text
      if (line.includes('@')) continue; // Email
      if (/^\d{3}[\s-]\d{3}[\s-]\d{4}$/.test(line)) continue; // Phone
      if (line.length < 3 || line.length > 100) continue; // Too short/long

      // This looks like a customer name
      invoice.customerName = line.substring(0, 200);
      break;
    }
  }

  // Also try to extract Customer ID if present
  const customerIdMatch = text.match(/Customer\s+ID:\s*(\d+)/i);
  if (customerIdMatch) {
    invoice.halCustomerId = customerIdMatch[1];
  }

  // Extract address
  const addrMatch = text.match(/Address[:\s]+([^\n]+(?:\n[^\n]+)?)/i);
  if (addrMatch) invoice.customerAddress = addrMatch[1].trim().substring(0, 500);

  // Extract dates - various formats
  const datePatterns = [
    /(?:Invoice\s+Date|Date)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /Date[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      invoice.date = match[1];
      break;
    }
  }

  // Extract due date
  const dueMatch = text.match(/(?:Due\s+Date|Payment\s+Due)[:\s]+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i);
  if (dueMatch) invoice.dueDate = dueMatch[1];

  // Extract totals
  const totalMatch = text.match(/(?:Total|Amount\s+Due|Balance\s+Due)[:\s\$]*([0-9,]+\.?\d{0,2})/i);
  if (totalMatch) invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));

  const subtotalMatch = text.match(/(?:Subtotal|Sub-Total)[:\s\$]*([0-9,]+\.?\d{0,2})/i);
  if (subtotalMatch) invoice.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));

  const taxMatch = text.match(/(?:Tax|Sales\s+Tax)[:\s\$]*([0-9,]+\.?\d{0,2})/i);
  if (taxMatch) invoice.tax = parseFloat(taxMatch[1].replace(/,/g, ''));

  // Extract line items (basic pattern - may need refinement)
  const linePattern = /(\d+)\s+([A-Za-z0-9\s'-]+?)\s+\$?([\d,]+\.?\d{0,2})\s+\$?([\d,]+\.?\d{0,2})/g;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    if (match[1] && match[2] && match[3]) {
      invoice.items.push({
        quantity: parseInt(match[1]),
        description: match[2].trim(),
        unitPrice: parseFloat(match[3].replace(/,/g, '')),
        total: match[4] ? parseFloat(match[4].replace(/,/g, '')) : null,
      });
    }
  }

  return invoice;
}

// Get all customers from database
async function loadCustomers() {
  console.log('📋 Loading customers from database...');

  const { data, error } = await supabase
    .from('Customer')
    .select('id, name, accountNumber, billingEmail, city, state');

  if (error) {
    console.error('❌ Error loading customers:', error);
    return [];
  }

  console.log(`✅ Loaded ${data.length} customers`);
  return data;
}

// Match customer by name (fuzzy matching)
function matchCustomer(invoiceCustomerName, customers) {
  if (!invoiceCustomerName) return null;

  const normalized = invoiceCustomerName.toLowerCase().trim();

  // Exact match
  for (const customer of customers) {
    if (customer.name.toLowerCase().trim() === normalized) {
      return { customer, matchType: 'exact', confidence: 1.0 };
    }
  }

  // Partial match (contains)
  for (const customer of customers) {
    const custName = customer.name.toLowerCase().trim();
    if (custName.includes(normalized) || normalized.includes(custName)) {
      return { customer, matchType: 'partial', confidence: 0.7 };
    }
  }

  // Account number match (if present in invoice)
  // TODO: Add account number extraction

  return null; // No match
}

// Get tenant ID
async function getTenantId() {
  const { data, error } = await supabase
    .from('Tenant')
    .select('id')
    .limit(1)
    .single();

  if (error || !data) {
    console.error('❌ Error getting tenant:', error);
    return null;
  }

  return data.id;
}

// Main processing function
async function processInvoices() {
  console.log('🚀 COMPLETE INVOICE IMPORT SYSTEM');
  console.log('='.repeat(70));
  console.log();

  // Try to get tenant ID (optional for parsing)
  console.log('🔍 Finding tenant...');
  try {
    CONFIG.tenantId = await getTenantId();
    console.log(`✅ Tenant ID: ${CONFIG.tenantId}\n`);
  } catch (error) {
    console.log(`⚠️  Could not get tenant ID (will proceed without): ${error.message}\n`);
  }

  // Load customers
  let customers = [];
  try {
    customers = await loadCustomers();
  } catch (error) {
    console.log(`⚠️  Could not load customers (will proceed with parsing only): ${error.message}`);
    console.log(`   Customer matching will be skipped.\n`);
  }

  // Get PDF files
  console.log('📁 Scanning PDF files...');
  const pdfFiles = fs.readdirSync(CONFIG.invoicesDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => ({
      refNum: parseInt(path.basename(f, '.pdf')),
      path: path.join(CONFIG.invoicesDir, f),
      filename: f,
    }))
    .sort((a, b) => a.refNum - b.refNum);

  console.log(`✅ Found ${pdfFiles.length} PDFs`);
  console.log(`   Range: ${pdfFiles[0].refNum} → ${pdfFiles[pdfFiles.length - 1].refNum}\n`);

  // Statistics
  const stats = {
    total: pdfFiles.length,
    processed: 0,
    blank: 0,
    parsed: 0,
    matched: 0,
    unmatched: 0,
    errors: 0,
  };

  // Results arrays
  const parsed = [];
  const blanks = [];
  const errors = [];
  const unmatched = [];

  // Process in batches
  console.log(`⚙️  Processing in batches of ${CONFIG.batchSize}...\n`);

  for (let i = 0; i < pdfFiles.length; i += CONFIG.batchSize) {
    const batch = pdfFiles.slice(i, i + CONFIG.batchSize);
    const batchNum = Math.floor(i / CONFIG.batchSize) + 1;
    const totalBatches = Math.ceil(pdfFiles.length / CONFIG.batchSize);

    console.log(`📦 Batch ${batchNum}/${totalBatches} (${batch[0].refNum} - ${batch[batch.length - 1].refNum})`);

    for (const pdf of batch) {
      stats.processed++;

      try {
        // Extract text
        const text = await extractPdfText(pdf.path);

        if (!text || text.trim().length < 100) {
          stats.blank++;
          blanks.push(pdf.refNum);
          continue;
        }

        // Parse invoice
        const invoice = parseInvoice(text, pdf.refNum);

        if (invoice.isBlank) {
          stats.blank++;
          blanks.push(pdf.refNum);
          continue;
        }

        stats.parsed++;

        // Match customer
        const customerMatch = matchCustomer(invoice.customerName, customers);

        if (customerMatch) {
          invoice.customerId = customerMatch.customer.id;
          invoice.matchedCustomerName = customerMatch.customer.name;
          invoice.matchType = customerMatch.matchType;
          invoice.matchConfidence = customerMatch.confidence;
          stats.matched++;
        } else {
          invoice.customerId = null;
          stats.unmatched++;
          unmatched.push({
            refNum: pdf.refNum,
            customerName: invoice.customerName,
            total: invoice.total,
          });
        }

        parsed.push(invoice);

      } catch (error) {
        stats.errors++;
        errors.push({
          refNum: pdf.refNum,
          error: error.message,
        });
      }
    }

    // Progress indicator
    const progress = ((stats.processed / pdfFiles.length) * 100).toFixed(1);
    console.log(`   Progress: ${stats.processed}/${pdfFiles.length} (${progress}%) | Parsed: ${stats.parsed} | Blank: ${stats.blank} | Errors: ${stats.errors}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 PROCESSING COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total PDFs:           ${stats.total}`);
  console.log(`✅ Successfully parsed: ${stats.parsed} (${(stats.parsed / stats.total * 100).toFixed(1)}%)`);
  console.log(`⚪ Blank/Invalid PDFs:  ${stats.blank} (${(stats.blank / stats.total * 100).toFixed(1)}%)`);
  console.log(`❌ Errors:             ${stats.errors}`);
  console.log();
  console.log(`👥 Customer Matching:`);
  console.log(`   ✅ Matched:   ${stats.matched} (${(stats.matched / stats.parsed * 100).toFixed(1)}%)`);
  console.log(`   ⚠️  Unmatched: ${stats.unmatched} (${(stats.unmatched / stats.parsed * 100).toFixed(1)}%)`);
  console.log();

  // Save results
  console.log('💾 Saving results...');

  const timestamp = Date.now();

  // Save parsed invoices
  const parsedPath = path.join(CONFIG.outputDir, `parsed-invoices-${timestamp}.json`);
  fs.writeFileSync(parsedPath, JSON.stringify(parsed, null, 2));
  console.log(`   ✅ Parsed invoices: ${parsedPath}`);

  // Save unmatched customers
  if (unmatched.length > 0) {
    const unmatchedPath = path.join(CONFIG.outputDir, `unmatched-customers-${timestamp}.json`);
    fs.writeFileSync(unmatchedPath, JSON.stringify(unmatched, null, 2));
    console.log(`   ⚠️  Unmatched: ${unmatchedPath}`);
  }

  // Save blanks list
  if (blanks.length > 0) {
    const blanksPath = path.join(CONFIG.outputDir, `blank-invoices-${timestamp}.json`);
    fs.writeFileSync(blanksPath, JSON.stringify(blanks, null, 2));
    console.log(`   ⚪ Blanks: ${blanksPath}`);
  }

  // Save errors
  if (errors.length > 0) {
    const errorsPath = path.join(CONFIG.outputDir, `errors-${timestamp}.json`);
    fs.writeFileSync(errorsPath, JSON.stringify(errors, null, 2));
    console.log(`   ❌ Errors: ${errorsPath}`);
  }

  // Generate summary report
  const summary = `
INVOICE IMPORT SUMMARY
======================
Generated: ${new Date().toISOString()}

PROCESSING RESULTS:
-------------------
Total PDFs Processed:    ${stats.total}
Successfully Parsed:     ${stats.parsed} (${(stats.parsed / stats.total * 100).toFixed(1)}%)
Blank/Invalid PDFs:      ${stats.blank} (${(stats.blank / stats.total * 100).toFixed(1)}%)
Errors:                  ${stats.errors}

CUSTOMER MATCHING:
------------------
Matched:                 ${stats.matched} (${(stats.matched / (stats.parsed || 1) * 100).toFixed(1)}%)
Unmatched:               ${stats.unmatched} (${(stats.unmatched / (stats.parsed || 1) * 100).toFixed(1)}%)

FINANCIAL DATA:
---------------
Total Invoice Value:     $${parsed.reduce((sum, inv) => sum + (inv.total || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
Average Invoice:         $${(parsed.reduce((sum, inv) => sum + (inv.total || 0), 0) / (parsed.length || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}

NEXT STEPS:
-----------
1. Review unmatched customers: ${unmatched.length > 0 ? 'import-results/unmatched-customers-*.json' : 'None!'}
2. Run import script to load to database
3. Verify imported data in Supabase

FILES GENERATED:
----------------
${parsedPath}
${unmatched.length > 0 ? unmatchedPath : ''}
${blanks.length > 0 ? blanksPath : ''}
${errors.length > 0 ? errorsPath : ''}
`;

  const summaryPath = path.join(CONFIG.outputDir, `import-summary-${timestamp}.txt`);
  fs.writeFileSync(summaryPath, summary);
  console.log(`   📄 Summary: ${summaryPath}\n`);

  console.log('✅ Processing complete!\n');
  console.log('Next: Run the import script to load data to Supabase');

  return {
    stats,
    parsed,
    unmatched,
    blanks,
    errors,
  };
}

// Run if executed directly
if (require.main === module) {
  processInvoices().catch(console.error);
}

module.exports = { processInvoices, parseInvoice, matchCustomer };

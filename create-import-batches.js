#!/usr/bin/env node
/**
 * Split parsed invoices into import-ready batches
 * Creates JSON and CSV files for easy manual import
 */

const fs = require('fs');
const path = require('path');

const CONFIG = {
  inputFile: 'import-results/parsed-invoices-1760806180133.json',
  outputDir: 'import-batches',
  batchSize: 200, // Invoices per file
  createCSV: true,
  createJSON: true,
  filterBlanks: true,
  filterNoTotal: true,
};

// Ensure output directory
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Convert to CSV - Match ImportedInvoices table schema exactly
// Properly quote all fields to handle commas in dates
function toCSV(invoices) {
  const headers = [
    'referenceNumber',
    'invoiceNumber',
    'invoiceDate',
    'total',
    'subtotal',
    'tax',
    'customerName',
    'itemCount'
  ];

  const rows = [headers.join(',')];

  // Helper to escape and quote CSV field
  function csvField(value) {
    if (value === null || value === undefined || value === '') {
      return '';
    }
    const str = String(value);
    // Quote if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  invoices.forEach(inv => {
    const row = [
      inv.refNum,
      inv.invoiceNumber || inv.refNum,
      csvField(inv.date || ''),
      inv.total || 0,
      inv.subtotal || '',
      inv.tax || '',
      csvField(inv.customerName || ''),
      inv.items ? inv.items.length : 0
    ];
    rows.push(row.join(','));
  });

  return rows.join('\n');
}

// Simplify invoice for import (remove complex nested data that won't import easily)
function simplifyInvoice(invoice) {
  return {
    referenceNumber: invoice.refNum,
    invoiceNumber: invoice.invoiceNumber || invoice.refNum.toString(),
    invoiceDate: invoice.date,
    dueDate: invoice.dueDate,
    total: invoice.total,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    customerName: invoice.customerName,
    customerAddress: invoice.customerAddress,
    itemCount: invoice.items ? invoice.items.length : 0,
    // Store complex data as JSON string
    lineItems: invoice.items && invoice.items.length > 0 ? JSON.stringify(invoice.items) : null,
  };
}

async function createBatches() {
  console.log('📦 INVOICE BATCH CREATOR');
  console.log('='.repeat(70));
  console.log();

  // Load invoices
  console.log(`📂 Loading: ${CONFIG.inputFile}`);
  const allInvoices = JSON.parse(fs.readFileSync(CONFIG.inputFile, 'utf8'));
  console.log(`✅ Loaded ${allInvoices.length} invoices\n`);

  // Filter if requested
  let invoices = allInvoices;

  if (CONFIG.filterBlanks) {
    invoices = invoices.filter(inv => !inv.isBlank);
    console.log(`🔍 Filtered blanks: ${allInvoices.length - invoices.length} removed`);
  }

  if (CONFIG.filterNoTotal) {
    const beforeFilter = invoices.length;
    invoices = invoices.filter(inv => inv.total && inv.total > 0);
    console.log(`🔍 Filtered no-total: ${beforeFilter - invoices.length} removed`);
  }

  console.log(`✅ ${invoices.length} invoices ready for batching\n`);

  // Calculate batches
  const numBatches = Math.ceil(invoices.length / CONFIG.batchSize);
  console.log(`📊 Creating ${numBatches} batches of ${CONFIG.batchSize} invoices each\n`);

  // Create batches
  const batches = [];
  for (let i = 0; i < numBatches; i++) {
    const start = i * CONFIG.batchSize;
    const end = Math.min(start + CONFIG.batchSize, invoices.length);
    const batch = invoices.slice(start, end);

    batches.push({
      number: i + 1,
      startRef: batch[0].refNum,
      endRef: batch[batch.length - 1].refNum,
      count: batch.length,
      invoices: batch,
    });
  }

  console.log('💾 Saving batch files...\n');

  // Save each batch
  batches.forEach((batch, index) => {
    const batchNum = String(batch.number).padStart(2, '0');
    const prefix = `batch-${batchNum}_ref-${batch.startRef}-${batch.endRef}`;

    // Simplify invoices for import
    const simplified = batch.invoices.map(simplifyInvoice);

    // Save JSON
    if (CONFIG.createJSON) {
      const jsonPath = path.join(CONFIG.outputDir, `${prefix}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(simplified, null, 2));
      console.log(`   ✅ ${batchNum}. JSON: ${prefix}.json (${batch.count} invoices)`);
    }

    // Save CSV
    if (CONFIG.createCSV) {
      const csvPath = path.join(CONFIG.outputDir, `${prefix}.csv`);
      fs.writeFileSync(csvPath, toCSV(batch.invoices));
      console.log(`      CSV:  ${prefix}.csv`);
    }
  });

  console.log();
  console.log('='.repeat(70));
  console.log('✅ BATCH CREATION COMPLETE!');
  console.log('='.repeat(70));
  console.log(`Total Batches:       ${numBatches}`);
  console.log(`Batch Size:          ${CONFIG.batchSize} invoices`);
  console.log(`Total Invoices:      ${invoices.length}`);
  console.log(`Output Directory:    ${CONFIG.outputDir}/`);
  console.log();
  console.log('📋 Next Steps:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Run the import-batch.sql script for each batch');
  console.log('   3. Or import CSVs via Table Editor');
  console.log();

  // Create summary
  const summary = {
    totalInvoices: invoices.length,
    numBatches: numBatches,
    batchSize: CONFIG.batchSize,
    batches: batches.map(b => ({
      number: b.number,
      startRef: b.startRef,
      endRef: b.endRef,
      count: b.count,
      files: {
        json: `batch-${String(b.number).padStart(2, '0')}_ref-${b.startRef}-${b.endRef}.json`,
        csv: `batch-${String(b.number).padStart(2, '0')}_ref-${b.startRef}-${b.endRef}.csv`,
      }
    })),
    totalValue: invoices.reduce((sum, inv) => sum + (inv.total || 0), 0),
  };

  const summaryPath = path.join(CONFIG.outputDir, 'batches-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`💾 Batch summary saved: ${summaryPath}`);

  return summary;
}

// Run
createBatches().catch(console.error);

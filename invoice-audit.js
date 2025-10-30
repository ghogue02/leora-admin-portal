const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CONFIG = {
  invoicesDir: './invoices',
  outputDir: './audit-results',
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Extract text from PDF using pdftotext
async function extractPdfText(pdfPath) {
  try {
    const { stdout } = await execPromise(`pdftotext "${pdfPath}" -`);
    return stdout;
  } catch (error) {
    // Fallback: try with basic strings extraction
    try {
      const { stdout } = await execPromise(`strings "${pdfPath}"`);
      return stdout;
    } catch (fallbackError) {
      return null;
    }
  }
}

// Parse invoice data from PDF text
function parseInvoiceData(text, refNum) {
  if (!text) return null;

  const data = {
    referenceNumber: refNum,
    invoiceNumber: null,
    customerName: null,
    date: null,
    total: null,
    subtotal: null,
    tax: null,
    items: [],
    rawText: text.substring(0, 500), // Keep first 500 chars for debugging
  };

  // Extract invoice number (often matches ref number)
  const invoiceMatch = text.match(/Invoice\s*#?\s*:?\s*(\d+)/i);
  if (invoiceMatch) data.invoiceNumber = invoiceMatch[1];

  // Extract customer name (usually after "Bill To" or "Customer")
  const customerMatch = text.match(/(?:Bill To|Customer|Sold To)[:\s]+([A-Za-z\s&',.-]+)(?:\n|Address)/i);
  if (customerMatch) data.customerName = customerMatch[1].trim();

  // Extract date
  const dateMatch = text.match(/(?:Date|Invoice Date)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dateMatch) data.date = dateMatch[1];

  // Extract total
  const totalMatch = text.match(/(?:Total|Amount Due|Balance Due)[:\s\$]+([0-9,]+\.?\d*)/i);
  if (totalMatch) data.total = parseFloat(totalMatch[1].replace(/,/g, ''));

  // Extract subtotal
  const subtotalMatch = text.match(/(?:Subtotal|Sub-Total)[:\s\$]+([0-9,]+\.?\d*)/i);
  if (subtotalMatch) data.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));

  // Extract tax
  const taxMatch = text.match(/(?:Tax|Sales Tax)[:\s\$]+([0-9,]+\.?\d*)/i);
  if (taxMatch) data.tax = parseFloat(taxMatch[1].replace(/,/g, ''));

  return data;
}

// Get all invoices from database
async function getDatabaseInvoices() {
  const { data, error } = await supabase
    .from('Invoice')
    .select('*');

  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }

  return data;
}

// Main audit function
async function auditInvoices() {
  console.log('🔍 INVOICE AUDIT - Comparing PDFs vs Database');
  console.log('='.repeat(70));
  console.log();

  // Step 1: Get local PDF files
  console.log('📁 Step 1: Scanning local invoice PDFs...');
  const pdfFiles = fs.readdirSync(CONFIG.invoicesDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => {
      const refNum = parseInt(path.basename(f, '.pdf'));
      return {
        refNum,
        path: path.join(CONFIG.invoicesDir, f),
        filename: f
      };
    })
    .sort((a, b) => a.refNum - b.refNum);

  console.log(`✅ Found ${pdfFiles.length} PDF invoices`);
  console.log(`   Range: ${pdfFiles[0].refNum} → ${pdfFiles[pdfFiles.length - 1].refNum}`);
  console.log();

  // Step 2: Get database invoices
  console.log('💾 Step 2: Fetching database invoices...');
  const dbInvoices = await getDatabaseInvoices();
  console.log(`✅ Found ${dbInvoices.length} database invoices`);
  console.log();

  // Create lookup maps
  const dbByInvoiceNumber = new Map();
  dbInvoices.forEach(inv => {
    if (inv.invoiceNumber) {
      dbByInvoiceNumber.set(inv.invoiceNumber, inv);
    }
  });

  // Step 3: Sample PDF extraction
  console.log('📄 Step 3: Extracting data from sample PDFs...');
  const sampleSize = Math.min(10, pdfFiles.length);
  const samples = [];

  for (let i = 0; i < sampleSize; i++) {
    const pdf = pdfFiles[i];
    console.log(`   Processing ${pdf.filename}...`);

    const text = await extractPdfText(pdf.path);
    const parsed = parseInvoiceData(text, pdf.refNum);

    if (parsed) {
      samples.push(parsed);
      console.log(`   ✓ Invoice: ${parsed.invoiceNumber || 'Unknown'}, Customer: ${parsed.customerName || 'Unknown'}, Total: $${parsed.total || '?'}`);
    }
  }
  console.log();

  // Step 4: Analysis
  console.log('📊 Step 4: Analysis & Findings');
  console.log('='.repeat(70));

  const findings = {
    totalPdfs: pdfFiles.length,
    totalDbInvoices: dbInvoices.length,
    missingFromDb: [],
    conflicts: [],
    matchingInvoices: [],
    sampleData: samples,
  };

  // Check which PDFs are missing from database
  console.log('\n🔎 Missing Invoices Analysis:');
  const dbInvoiceNumbers = new Set(dbInvoices.map(inv => inv.invoiceNumber));

  const sampleMissing = samples.filter(s =>
    s.invoiceNumber && !dbInvoiceNumbers.has(s.invoiceNumber)
  );

  findings.missingFromDb = sampleMissing;

  console.log(`   Database has: ${dbInvoices.length} invoices`);
  console.log(`   PDFs found: ${pdfFiles.length} invoices`);
  console.log(`   Missing from DB: ~${pdfFiles.length - dbInvoices.length} invoices (estimated)`);
  console.log();

  // Check for conflicts in existing data
  console.log('⚠️  Conflict Analysis (for invoices in database):');
  let conflictsFound = 0;

  for (const sample of samples) {
    if (sample.invoiceNumber && dbByInvoiceNumber.has(sample.invoiceNumber)) {
      const dbInv = dbByInvoiceNumber.get(sample.invoiceNumber);
      const conflicts = [];

      // Compare totals
      if (sample.total && dbInv.total) {
        const dbTotal = parseFloat(dbInv.total);
        const pdfTotal = sample.total;
        const diff = Math.abs(dbTotal - pdfTotal);

        if (diff > 0.01) {
          conflicts.push({
            field: 'total',
            database: dbTotal,
            pdf: pdfTotal,
            difference: diff
          });
        }
      }

      if (conflicts.length > 0) {
        findings.conflicts.push({
          invoiceNumber: sample.invoiceNumber,
          conflicts
        });
        conflictsFound++;
        console.log(`   ⚠️  Invoice ${sample.invoiceNumber}:`);
        conflicts.forEach(c => {
          console.log(`      ${c.field}: DB=$${c.database}, PDF=$${c.pdf}, Diff=$${c.difference}`);
        });
      } else {
        findings.matchingInvoices.push(sample.invoiceNumber);
      }
    }
  }

  if (conflictsFound === 0) {
    console.log('   ✅ No conflicts found in matching invoices');
  }
  console.log();

  // Data completeness check
  console.log('📋 Data Completeness (from PDF samples):');
  const completeness = {
    hasInvoiceNumber: samples.filter(s => s.invoiceNumber).length,
    hasCustomerName: samples.filter(s => s.customerName).length,
    hasDate: samples.filter(s => s.date).length,
    hasTotal: samples.filter(s => s.total).length,
  };

  console.log(`   Invoice Number: ${completeness.hasInvoiceNumber}/${sampleSize} (${(completeness.hasInvoiceNumber/sampleSize*100).toFixed(0)}%)`);
  console.log(`   Customer Name:  ${completeness.hasCustomerName}/${sampleSize} (${(completeness.hasCustomerName/sampleSize*100).toFixed(0)}%)`);
  console.log(`   Date:           ${completeness.hasDate}/${sampleSize} (${(completeness.hasDate/sampleSize*100).toFixed(0)}%)`);
  console.log(`   Total Amount:   ${completeness.hasTotal}/${sampleSize} (${(completeness.hasTotal/sampleSize*100).toFixed(0)}%)`);
  console.log();

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('='.repeat(70));

  if (findings.totalPdfs > findings.totalDbInvoices * 2) {
    console.log('   ⚠️  CRITICAL: You have significantly more PDFs than database records');
    console.log('      Action: Consider bulk importing invoice data from PDFs');
  }

  if (findings.conflicts.length > 0) {
    console.log('   ⚠️  WARNING: Found conflicts between PDF and database data');
    console.log('      Action: Review and reconcile differences');
  }

  if (completeness.hasTotal / sampleSize > 0.8) {
    console.log('   ✅ GOOD: PDF parsing can reliably extract financial data');
    console.log('      Action: Safe to proceed with automated extraction');
  }

  if (completeness.hasCustomerName / sampleSize > 0.8) {
    console.log('   ✅ GOOD: Customer information is extractable from PDFs');
  }

  console.log();
  console.log('📝 Next Steps:');
  console.log('   1. Extract all invoice data from PDFs');
  console.log('   2. Match with existing customer records');
  console.log('   3. Import missing invoices to database');
  console.log('   4. Reconcile any conflicts found');
  console.log();

  // Save detailed report
  const reportPath = path.join(CONFIG.outputDir, `audit-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(findings, null, 2));
  console.log(`💾 Detailed report saved to: ${reportPath}`);
  console.log();

  // Save summary
  const summaryPath = path.join(CONFIG.outputDir, `audit-summary.txt`);
  const summary = `
INVOICE AUDIT SUMMARY
=====================

Generated: ${new Date().toISOString()}

OVERVIEW:
- Total PDF Invoices: ${findings.totalPdfs}
- Database Invoices: ${findings.totalDbInvoices}
- Missing from DB: ~${findings.totalPdfs - findings.totalDbInvoices}

CONFLICTS:
- Conflicting Invoices: ${findings.conflicts.length}

SAMPLE DATA QUALITY:
- Invoice Numbers Extracted: ${completeness.hasInvoiceNumber}/${sampleSize}
- Customer Names Extracted: ${completeness.hasCustomerName}/${sampleSize}
- Dates Extracted: ${completeness.hasDate}/${sampleSize}
- Totals Extracted: ${completeness.hasTotal}/${sampleSize}

RECOMMENDATION:
${findings.totalPdfs > findings.totalDbInvoices * 2 ? 'CRITICAL: Bulk import needed' : 'OK: Database is relatively complete'}
`;

  fs.writeFileSync(summaryPath, summary);
  console.log(`📄 Summary saved to: ${summaryPath}`);
  console.log();
  console.log('✅ Audit complete!');
}

// Run audit
auditInvoices().catch(console.error);

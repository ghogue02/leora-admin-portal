#!/usr/bin/env node
/**
 * Match parsed customer names to database and update ImportedInvoices
 */

const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

async function matchAndUpdate() {
  console.log('🔗 CUSTOMER MATCHING & DATABASE UPDATE');
  console.log('='.repeat(70));
  console.log();

  // Load parsed invoices
  console.log('📂 Loading parsed invoices...');
  const invoices = JSON.parse(fs.readFileSync('import-results/parsed-invoices-1760811546877.json', 'utf8'));
  console.log(`✅ Loaded ${invoices.length} invoices\n`);

  // Load database customers using psql
  console.log('📋 Loading database customers...');
  const result = await execPromise(
    `psql "${process.env.DATABASE_URL}" -t -c "SELECT id, name FROM \\"Customer\\""`
  );

  const dbCustomers = result.stdout
    .trim()
    .split('\n')
    .map(line => {
      const parts = line.trim().split('|').map(p => p.trim());
      return { id: parts[0], name: parts[1] };
    })
    .filter(c => c.id && c.name);

  console.log(`✅ Loaded ${dbCustomers.length} database customers\n`);

  // Normalize for matching
  function normalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Match customers
  console.log('🔍 Matching customers...\n');

  const stats = {
    total: 0,
    exactMatch: 0,
    fuzzyMatch: 0,
    noMatch: 0,
    noCustomerName: 0,
  };

  const updates = [];
  const unmatched = [];

  invoices.forEach(inv => {
    if (!inv.customerName || inv.customerName.includes('shall be') || inv.customerName.length < 3) {
      stats.noCustomerName++;
      return;
    }

    stats.total++;
    const normalized = normalize(inv.customerName);
    let matched = null;

    // Try exact match
    for (const dbCust of dbCustomers) {
      if (normalize(dbCust.name) === normalized) {
        matched = { customer: dbCust, type: 'exact', confidence: 1.0 };
        break;
      }
    }

    // Try fuzzy match
    if (!matched) {
      for (const dbCust of dbCustomers) {
        const dbNorm = normalize(dbCust.name);
        if (dbNorm.includes(normalized) || normalized.includes(dbNorm)) {
          const confidence = Math.min(dbNorm.length, normalized.length) / Math.max(dbNorm.length, normalized.length);
          if (confidence > 0.75) {
            matched = { customer: dbCust, type: 'fuzzy', confidence };
            break;
          }
        }
      }
    }

    if (matched) {
      if (matched.type === 'exact') stats.exactMatch++;
      else stats.fuzzyMatch++;

      updates.push({
        refNum: inv.refNum,
        customerId: matched.customer.id,
        pdfName: inv.customerName,
        dbName: matched.customer.name,
        matchType: matched.type,
        confidence: matched.confidence,
      });
    } else {
      stats.noMatch++;
      unmatched.push({
        refNum: inv.refNum,
        customerName: inv.customerName,
        total: inv.total,
      });
    }
  });

  console.log('='.repeat(70));
  console.log('📊 MATCHING RESULTS');
  console.log('='.repeat(70));
  console.log(`Invoices with customer names: ${stats.total}`);
  console.log(`✅ Exact matches:              ${stats.exactMatch} (${(stats.exactMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`⚠️  Fuzzy matches:              ${stats.fuzzyMatch} (${(stats.fuzzyMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`❌ No match:                   ${stats.noMatch} (${(stats.noMatch/stats.total*100).toFixed(1)}%)`);
  console.log(`⚪ No customer name in PDF:    ${stats.noCustomerName}`);
  console.log();

  // Update database
  console.log('💾 Updating ImportedInvoices table...\n');

  let updated = 0;
  let errors = 0;

  for (const update of updates) {
    try {
      const sql = `UPDATE "ImportedInvoices" SET matched_customer_id = '${update.customerId}', match_method = '${update.matchType}', match_confidence = ${update.confidence} WHERE "referenceNumber" = ${update.refNum}`;

      await execPromise(`psql "${process.env.DATABASE_URL}" -c "${sql}"`);
      updated++;

      if (updated % 100 === 0) {
        console.log(`   ✅ Updated: ${updated}/${updates.length}`);
      }
    } catch (error) {
      errors++;
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('✅ DATABASE UPDATE COMPLETE');
  console.log('='.repeat(70));
  console.log(`Successfully updated:   ${updated}`);
  console.log(`Errors:                 ${errors}`);
  console.log();

  // Save unmatched for review
  if (unmatched.length > 0) {
    fs.writeFileSync('./unmatched-for-review.json', JSON.stringify(unmatched, null, 2));
    console.log(`⚠️  ${unmatched.length} unmatched saved to: unmatched-for-review.json\n`);
  }

  // Save matches
  fs.writeFileSync('./all-customer-matches.json', JSON.stringify(updates, null, 2));
  console.log(`💾 All matches saved to: all-customer-matches.json\n`);

  console.log('🎯 NEXT STEP: Migrate to production tables!');
  console.log('   Run in Supabase SQL Editor:');
  console.log('   SELECT * FROM migrate_all_matched_invoices();\n');

  return { stats, updates, unmatched };
}

// Run
matchAndUpdate().catch(console.error);

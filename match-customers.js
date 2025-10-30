#!/usr/bin/env node
/**
 * Match HAL App customer names to database Customer records
 * Updates ImportedInvoices with matched customer IDs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize customer name for matching
function normalizeCustomerName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize spaces
}

// Match customer name to database
function matchCustomer(halCustomerName, dbCustomers) {
  if (!halCustomerName) return null;

  const normalized = normalizeCustomerName(halCustomerName);

  // Try exact match first
  for (const customer of dbCustomers) {
    if (normalizeCustomerName(customer.name) === normalized) {
      return { customer, matchType: 'exact', confidence: 1.0 };
    }
  }

  // Try partial match
  for (const customer of dbCustomers) {
    const dbNorm = normalizeCustomerName(customer.name);
    if (dbNorm.includes(normalized) || normalized.includes(dbNorm)) {
      // Calculate confidence based on length similarity
      const confidence = Math.min(dbNorm.length, normalized.length) / Math.max(dbNorm.length, normalized.length);
      if (confidence > 0.7) {
        return { customer, matchType: 'partial', confidence };
      }
    }
  }

  return null;
}

async function matchAllCustomers() {
  console.log('🔗 CUSTOMER MATCHING SYSTEM');
  console.log('='.repeat(70));
  console.log();

  // Load customer mapping from scraper
  console.log('📂 Loading customer mapping from HAL App scrape...');
  const customerMapping = JSON.parse(fs.readFileSync('./customer-mapping.json', 'utf8'));
  const mappingCount = Object.keys(customerMapping).length;
  console.log(`✅ Loaded ${mappingCount} invoice → customer mappings\n`);

  // Get all database customers using psql (avoids permission issues)
  console.log('📋 Loading customers from database...');
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

  // Match each invoice
  console.log('🔍 Matching customers...\n');

  const matches = {
    exact: 0,
    partial: 0,
    unmatched: 0,
    total: 0,
  };

  const unmatchedList = [];
  const updates = [];

  for (const [refNum, halData] of Object.entries(customerMapping)) {
    matches.total++;
    const match = matchCustomer(halData.customerName, dbCustomers);

    if (match) {
      if (match.matchType === 'exact') matches.exact++;
      else matches.partial++;

      updates.push({
        refNum: parseInt(refNum),
        customerId: match.customer.id,
        customerName: halData.customerName,
        matchedName: match.customer.name,
        matchType: match.matchType,
        confidence: match.confidence,
      });

      if (match.matchType === 'partial') {
        console.log(`⚠️  Partial match (${(match.confidence * 100).toFixed(0)}%): "${halData.customerName}" → "${match.customer.name}"`);
      }
    } else {
      matches.unmatched++;
      unmatchedList.push({
        refNum: parseInt(refNum),
        halCustomerName: halData.customerName,
      });

      if (matches.unmatched <= 10) {
        console.log(`❌ No match: "${halData.customerName}"`);
      }
    }

    if (matches.total % 100 === 0) {
      console.log(`   Progress: ${matches.total}/${mappingCount} | Exact: ${matches.exact} | Partial: ${matches.partial} | Unmatched: ${matches.unmatched}`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 MATCHING COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total invoices:        ${matches.total}`);
  console.log(`✅ Exact matches:       ${matches.exact} (${(matches.exact/matches.total*100).toFixed(1)}%)`);
  console.log(`⚠️  Partial matches:     ${matches.partial} (${(matches.partial/matches.total*100).toFixed(1)}%)`);
  console.log(`❌ Unmatched:           ${matches.unmatched} (${(matches.unmatched/matches.total*100).toFixed(1)}%)`);
  console.log();

  // Update database with matches
  console.log('💾 Updating ImportedInvoices with customer matches...\n');

  let updated = 0;
  let errors = 0;

  for (const update of updates) {
    try {
      const sql = `UPDATE "ImportedInvoices" SET matched_customer_id = '${update.customerId}', match_method = '${update.matchType}', match_confidence = ${update.confidence} WHERE "referenceNumber" = ${update.refNum}`;

      await execPromise(`psql "${process.env.DATABASE_URL}" -c "${sql}"`);
      updated++;

      if (updated % 100 === 0) {
        console.log(`   Updated: ${updated}/${updates.length}`);
      }
    } catch (error) {
      errors++;
      console.error(`   ❌ Error updating ${update.refNum}:`, error.message);
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('✅ DATABASE UPDATE COMPLETE');
  console.log('='.repeat(70));
  console.log(`Updated records:       ${updated}`);
  console.log(`Errors:                ${errors}`);
  console.log();

  // Save unmatched for manual review
  if (unmatchedList.length > 0) {
    const unmatchedPath = './unmatched-customers.json';
    fs.writeFileSync(unmatchedPath, JSON.stringify(unmatchedList, null, 2));
    console.log(`⚠️  Unmatched customers saved to: ${unmatchedPath}`);
    console.log('   These will need manual matching\n');
  }

  // Save all matches for reference
  const matchesPath = './customer-matches.json';
  fs.writeFileSync(matchesPath, JSON.stringify(updates, null, 2));
  console.log(`💾 All matches saved to: ${matchesPath}\n`);

  console.log('🎯 Next step: Run migration to production tables!');
  console.log('   SQL: SELECT * FROM migrate_all_matched_invoices();');

  return { matches, updates, unmatchedList };
}

// Run
if (require.main === module) {
  matchAllCustomers().catch(console.error);
}

module.exports = { matchAllCustomers };

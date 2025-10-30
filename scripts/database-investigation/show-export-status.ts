#!/usr/bin/env tsx

/**
 * Show current export status and provide next steps
 */

import * as fs from 'fs';
import * as path from 'path';

const EXPECTED_ORDERLINES = 7774;

function checkExportStatus() {
  console.log('\n' + '='.repeat(80));
  console.log('📦 WELL CRAFTED DATABASE EXPORT STATUS');
  console.log('='.repeat(80));

  console.log('\n🎯 Target: Export 7,774 OrderLines + all related data\n');

  // Check for existing exports
  const exportsDir = '/Users/greghogue/Leora2/exports';

  if (!fs.existsSync(exportsDir)) {
    console.log('❌ No exports directory found');
    console.log('📋 Status: NOT STARTED\n');
    printNextSteps('not-started');
    return;
  }

  // Check for wellcrafted exports
  const dirs = fs.readdirSync(exportsDir)
    .filter(d => d.startsWith('wellcrafted-'))
    .map(d => path.join(exportsDir, d))
    .filter(d => fs.statSync(d).isDirectory())
    .sort()
    .reverse(); // Most recent first

  if (dirs.length === 0) {
    console.log('❌ No Well Crafted exports found');
    console.log('📋 Status: NOT STARTED\n');
    printNextSteps('not-started');
    return;
  }

  console.log(`📂 Found ${dirs.length} export attempt(s):\n`);

  let hasCompleteExport = false;

  dirs.forEach((dir, index) => {
    const dirName = path.basename(dir);
    console.log(`${index + 1}. ${dirName}`);

    // Check for expected files
    const expectedFiles = [
      'customer.json',
      'product.json',
      'sku.json',
      'order.json',
      'orderline.json'
    ];

    const files = expectedFiles.filter(f => fs.existsSync(path.join(dir, f)));

    console.log(`   Files: ${files.length}/5`);

    if (files.length === 5) {
      // Check OrderLine count
      const orderlinePath = path.join(dir, 'orderline.json');
      const content = fs.readFileSync(orderlinePath, 'utf-8');
      const data = JSON.parse(content);
      const count = data.length;

      console.log(`   OrderLines: ${count} ${count === EXPECTED_ORDERLINES ? '✅' : '❌ (expected 7,774)'}`);

      if (count === EXPECTED_ORDERLINES) {
        hasCompleteExport = true;
        console.log(`   ✅ COMPLETE AND VERIFIED`);
      } else {
        console.log(`   ⚠️  Complete but count mismatch`);
      }
    } else {
      console.log(`   ❌ Incomplete (missing ${5 - files.length} files)`);
    }

    console.log();
  });

  if (hasCompleteExport) {
    console.log('✅ Status: EXPORT COMPLETE\n');
    printNextSteps('complete');
  } else {
    console.log('⚠️  Status: EXPORT INCOMPLETE\n');
    printNextSteps('incomplete');
  }
}

function printNextSteps(status: 'not-started' | 'incomplete' | 'complete') {
  console.log('📋 NEXT STEPS:');
  console.log('-'.repeat(80));

  if (status === 'not-started' || status === 'incomplete') {
    console.log('\n🔧 Follow the manual export process:');
    console.log('   1. Review: /Users/greghogue/Leora2/scripts/database-investigation/MANUAL_EXPORT_INSTRUCTIONS.md');
    console.log('   2. Connect via psql using the working connection from Phase 1');
    console.log('   3. Export tables to CSV using \\copy commands');
    console.log('   4. Convert CSV to JSON using convert-csv-to-json.ts');
    console.log('   5. Verify 7,774 OrderLines exactly');

    console.log('\n💡 Why manual export is needed:');
    console.log('   - Supabase client blocked by RLS policies');
    console.log('   - REST API returns "permission denied for schema public"');
    console.log('   - Direct psql connection method from Phase 1 is most reliable');

    console.log('\n📖 Key documentation:');
    console.log('   - MANUAL_EXPORT_INSTRUCTIONS.md - Step-by-step guide');
    console.log('   - EXPORT_SUMMARY.md - Full explanation and troubleshooting');

    console.log('\n⚡ Quick start:');
    console.log('   cd /Users/greghogue/Leora2/scripts/database-investigation');
    console.log('   cat MANUAL_EXPORT_INSTRUCTIONS.md');

  } else if (status === 'complete') {
    console.log('\n✅ Export is complete! Ready for migration phase.');

    console.log('\n🔍 Data quality checks:');
    console.log('   1. Review export report for any issues');
    console.log('   2. Check for orphaned records');
    console.log('   3. Verify referential integrity');
    console.log('   4. Validate critical fields (names, emails, dates, prices)');

    console.log('\n🚀 Migration preparation:');
    console.log('   1. Map Well Crafted schema → Lovable schema');
    console.log('   2. Plan data transformations');
    console.log('   3. Create migration scripts');
    console.log('   4. Set up rollback strategy');

    console.log('\n📁 Export location:');
    const exportsDir = '/Users/greghogue/Leora2/exports';
    const dirs = fs.readdirSync(exportsDir)
      .filter(d => d.startsWith('wellcrafted-'))
      .map(d => path.join(exportsDir, d))
      .filter(d => fs.statSync(d).isDirectory())
      .sort()
      .reverse();

    if (dirs.length > 0) {
      console.log(`   ${dirs[0]}`);
    }
  }

  console.log('\n' + '='.repeat(80));
}

// Run status check
checkExportStatus();

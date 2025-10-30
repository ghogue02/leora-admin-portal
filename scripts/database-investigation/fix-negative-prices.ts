import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database credentials
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OrderLine {
  orderlineid: number;
  unitprice: number;
  orderid?: number;
  prod_id?: number;
  quantity?: number;
}

interface FixRecord {
  orderlineid: number;
  originalPrice: number;
  correctedPrice: number;
  strategy: 'absolute' | 'zero';
  reason: string;
}

async function fixNegativePrices() {
  console.log('🔍 Identifying orderlines with negative prices...\n');

  // Step 1: Find all negative prices
  const { data: negatives, error: fetchError } = await lovable
    .from('orderline')
    .select('*')
    .lt('unitprice', 0)
    .order('unitprice', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching negative prices:', fetchError);
    process.exit(1);
  }

  if (!negatives || negatives.length === 0) {
    console.log('✅ No negative prices found!');
    return;
  }

  console.log(`📊 Found ${negatives.length} orderlines with negative prices:\n`);
  negatives.forEach((line: OrderLine) => {
    console.log(`  - Order Line ID: ${line.orderlineid}, Price: $${line.unitprice}`);
  });
  console.log();

  // Step 2: Export before fixing (audit trail)
  const exportPath = path.join(__dirname, 'negative-prices-backup.json');
  fs.writeFileSync(exportPath, JSON.stringify(negatives, null, 2));
  console.log(`💾 Backup saved to: ${exportPath}\n`);

  // Step 3: Determine fix strategy and apply corrections
  const fixes: FixRecord[] = [];
  const THRESHOLD = -10;

  for (const line of negatives) {
    const originalPrice = line.unitprice;
    let correctedPrice: number;
    let strategy: 'absolute' | 'zero';
    let reason: string;

    if (originalPrice > THRESHOLD) {
      // Small negative (between -$10 and $0): likely data entry error, set to 0
      correctedPrice = 0;
      strategy = 'zero';
      reason = 'Small negative value (< $10), likely data entry error';
    } else {
      // Large negative (< -$10): likely sign error, take absolute value
      correctedPrice = Math.abs(originalPrice);
      strategy = 'absolute';
      reason = 'Large negative value, likely sign error';
    }

    // Update the record
    const { error: updateError } = await lovable
      .from('orderline')
      .update({ unitprice: correctedPrice })
      .eq('orderlineid', line.orderlineid);

    if (updateError) {
      console.error(`❌ Error updating orderline ${line.orderlineid}:`, updateError);
      continue;
    }

    fixes.push({
      orderlineid: line.orderlineid,
      originalPrice,
      correctedPrice,
      strategy,
      reason
    });

    console.log(`✅ Fixed Order Line ${line.orderlineid}: $${originalPrice} → $${correctedPrice} (${strategy})`);
  }

  console.log();

  // Step 4: Verify all prices are now >= 0
  const { data: stillNegative, error: verifyError } = await lovable
    .from('orderline')
    .select('orderlineid, unitprice')
    .lt('unitprice', 0);

  if (verifyError) {
    console.error('❌ Error verifying fixes:', verifyError);
  } else if (stillNegative && stillNegative.length > 0) {
    console.error(`⚠️  WARNING: ${stillNegative.length} orderlines still have negative prices!`);
    stillNegative.forEach((line: OrderLine) => {
      console.error(`  - Order Line ID: ${line.orderlineid}, Price: $${line.unitprice}`);
    });
  } else {
    console.log('✅ VERIFICATION PASSED: All prices are now >= 0\n');
  }

  // Step 5: Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalFixed: fixes.length,
    fixes: fixes,
    verification: {
      remainingNegatives: stillNegative?.length || 0,
      status: (stillNegative?.length || 0) === 0 ? 'SUCCESS' : 'INCOMPLETE'
    }
  };

  const reportPath = path.join(__dirname, 'fix-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('📋 FIX SUMMARY:');
  console.log(`   Total orderlines fixed: ${fixes.length}`);
  console.log(`   Fixed to $0: ${fixes.filter(f => f.strategy === 'zero').length}`);
  console.log(`   Fixed to absolute value: ${fixes.filter(f => f.strategy === 'absolute').length}`);
  console.log(`   Remaining negatives: ${stillNegative?.length || 0}`);
  console.log(`   Status: ${report.verification.status}`);
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

// Run the fix
fixNegativePrices()
  .then(() => {
    console.log('\n🎉 Fix process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

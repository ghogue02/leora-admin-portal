import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyFix() {
  console.log('🔍 Verification Report: Negative Prices Fix\n');
  console.log('='.repeat(60));
  console.log();

  // Check for any remaining negative prices
  const { data: negatives, error: negError } = await lovable
    .from('orderline')
    .select('orderlineid, unitprice, orderid')
    .lt('unitprice', 0)
    .order('unitprice', { ascending: true });

  if (negError) {
    console.error('❌ Error checking for negatives:', negError);
    return;
  }

  console.log(`📊 NEGATIVE PRICE CHECK:`);
  if (!negatives || negatives.length === 0) {
    console.log('   ✅ PASS: No negative prices found!\n');
  } else {
    console.log(`   ❌ FAIL: Found ${negatives.length} negative prices:\n`);
    negatives.forEach((line: any) => {
      console.log(`      - OrderLine ${line.orderlineid}: $${line.unitprice} (Order: ${line.orderid})`);
    });
    console.log();
  }

  // Get statistics on prices
  const { data: stats, error: statsError } = await lovable
    .from('orderline')
    .select('unitprice')
    .order('unitprice', { ascending: true });

  if (statsError) {
    console.error('❌ Error fetching stats:', statsError);
    return;
  }

  if (stats && stats.length > 0) {
    const prices = stats.map((s: any) => s.unitprice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    const zeroCount = prices.filter((p: number) => p === 0).length;

    console.log(`📈 PRICE STATISTICS:`);
    console.log(`   Total orderlines: ${stats.length}`);
    console.log(`   Minimum price: $${min.toFixed(2)}`);
    console.log(`   Maximum price: $${max.toFixed(2)}`);
    console.log(`   Average price: $${avg.toFixed(2)}`);
    console.log(`   Zero-price items: ${zeroCount}`);
    console.log();
  }

  // Show lowest 10 prices (to catch any issues)
  const { data: lowest, error: lowError } = await lovable
    .from('orderline')
    .select('orderlineid, unitprice, orderid')
    .order('unitprice', { ascending: true })
    .limit(10);

  if (!lowError && lowest) {
    console.log(`📋 LOWEST 10 PRICES:`);
    lowest.forEach((line: any, idx: number) => {
      console.log(`   ${idx + 1}. OrderLine ${line.orderlineid}: $${line.unitprice.toFixed(2)}`);
    });
    console.log();
  }

  console.log('='.repeat(60));
  console.log(`\n✅ Verification complete at ${new Date().toISOString()}`);
  console.log(`\n🎯 FINAL STATUS: ${(!negatives || negatives.length === 0) ? 'ALL CLEAR ✅' : 'ISSUES FOUND ❌'}`);
}

verifyFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

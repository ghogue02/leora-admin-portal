import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

async function verifyCurrentState() {
  console.log('🔍 Verifying Lovable Database State...\n');

  const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

  try {
    // Get exact counts for all tables
    const { count: customers } = await lovable
      .from('customer')
      .select('*', { count: 'exact', head: true });

    const { count: products } = await lovable
      .from('product')
      .select('*', { count: 'exact', head: true });

    const { count: skus } = await lovable
      .from('skus')
      .select('*', { count: 'exact', head: true });

    const { count: orders } = await lovable
      .from('order')
      .select('*', { count: 'exact', head: true });

    const { count: orderlines } = await lovable
      .from('orderline')
      .select('*', { count: 'exact', head: true });

    // Calculate coverage
    const orderCoverage = orderlines && orders && orders > 0
      ? ((orderlines / orders) * 100).toFixed(1) + '%'
      : 'N/A';

    const avgOrderlines = orderlines && orders && orders > 0
      ? (orderlines / orders).toFixed(2)
      : 'N/A';

    // Display results
    console.log('📊 CURRENT DATABASE STATE');
    console.log('═'.repeat(50));
    console.log(`Customers:    ${customers ?? 0}`);
    console.log(`Products:     ${products ?? 0}`);
    console.log(`SKUs:         ${skus ?? 0}`);
    console.log(`Orders:       ${orders ?? 0}`);
    console.log(`Orderlines:   ${orderlines ?? 0}`);
    console.log('─'.repeat(50));
    console.log(`Order Coverage:      ${orderCoverage}`);
    console.log(`Avg Orderlines/Order: ${avgOrderlines}`);
    console.log('═'.repeat(50));

    // Return structured data
    const state = {
      customers: customers ?? 0,
      products: products ?? 0,
      skus: skus ?? 0,
      orders: orders ?? 0,
      orderlines: orderlines ?? 0,
      orderCoverage,
      avgOrderlinesPerOrder: avgOrderlines
    };

    console.log('\n📋 JSON Output:');
    console.log(JSON.stringify(state, null, 2));

    return state;

  } catch (error) {
    console.error('❌ Error verifying database state:', error);
    throw error;
  }
}

// Run verification
verifyCurrentState()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });

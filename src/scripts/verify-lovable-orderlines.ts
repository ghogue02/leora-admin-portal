import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

async function verify() {
  console.log('\n📊 Verifying Lovable OrderLines...\n');

  const { count } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`Total OrderLines in Lovable: ${count}`);

  // Count orders with orderlines
  const { data: ordersWithLines } = await lovable
    .from('orderline')
    .select('orderid');

  const uniqueOrders = new Set(ordersWithLines?.map(ol => ol.orderid)).size;

  console.log(`Orders with OrderLines: ${uniqueOrders}`);
  console.log(`Average OrderLines per order: ${count && uniqueOrders ? (count / uniqueOrders).toFixed(1) : 'N/A'}`);
}

verify();

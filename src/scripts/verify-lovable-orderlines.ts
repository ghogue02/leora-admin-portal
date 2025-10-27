import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY'
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

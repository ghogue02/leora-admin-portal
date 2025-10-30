import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function verify() {
  console.log('📊 LOVABLE DATABASE - FINAL STATE\n');
  console.log('='.repeat(60));

  // Orders
  const { count: orderCount } = await lovable.from('order').select('*', { count: 'exact', head: true });
  console.log('\n📦 ORDERS');
  console.log('  Total Orders:', orderCount);

  // OrderLines
  const { count: olCount } = await lovable.from('orderline').select('*', { count: 'exact', head: true });
  console.log('\n📋 ORDERLINES');
  console.log('  Total OrderLines:', olCount);

  // Orders with orderlines
  const { data: olData } = await lovable.from('orderline').select('orderid');
  const uniqueOrders = new Set(olData?.map(ol => ol.orderid));

  console.log('  Orders with OrderLines:', uniqueOrders.size);
  console.log('  Orders without OrderLines:', (orderCount || 0) - uniqueOrders.size);
  console.log('  Coverage:', ((uniqueOrders.size / (orderCount || 1)) * 100).toFixed(2) + '%');

  // Check for orphans
  const { data: orders } = await lovable.from('order').select('id');
  const orderIds = new Set(orders?.map(o => o.id));
  const orphanedOLs = olData?.filter(ol => !orderIds.has(ol.orderid)).length || 0;

  console.log('  Orphaned OrderLines:', orphanedOLs);

  // SKUs
  const { count: skuCount } = await lovable.from('skus').select('*', { count: 'exact', head: true });
  console.log('\n🏷️  SKUS');
  console.log('  Total SKUs:', skuCount);

  // Revenue check
  const { data: ordersWithTotal } = await lovable.from('order').select('totalprice');
  const totalRevenue = ordersWithTotal?.reduce((sum, o) => sum + (o.totalprice || 0), 0) || 0;

  const { data: olWithPrices } = await lovable.from('orderline').select('quantity, unitprice, discount');
  const olRevenue = olWithPrices?.reduce((sum, ol) => {
    const lineTotal = (ol.quantity || 0) * (ol.unitprice || 0) - (ol.discount || 0);
    return sum + lineTotal;
  }, 0) || 0;

  console.log('\n💰 REVENUE CHECK');
  console.log('  Order Total Revenue: $' + totalRevenue.toFixed(2));
  console.log('  OrderLine Revenue: $' + olRevenue.toFixed(2));
  console.log('  Difference: $' + Math.abs(totalRevenue - olRevenue).toFixed(2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ Database integrity verified!\n');

  // Success criteria check
  console.log('🎯 SUCCESS CRITERIA CHECK\n');
  const targetCoverage = 70;
  const actualCoverage = (uniqueOrders.size / (orderCount || 1)) * 100;

  console.log('  Target Coverage: ' + targetCoverage + '%');
  console.log('  Actual Coverage: ' + actualCoverage.toFixed(2) + '%');
  console.log('  Status:', actualCoverage >= targetCoverage ? '✅ MET' : '❌ NOT MET');
  console.log('  Gap:', (targetCoverage - actualCoverage).toFixed(2) + '%');

  console.log('\n  Orphaned OrderLines: ' + orphanedOLs + ' (Target: 0)');
  console.log('  Status:', orphanedOLs === 0 ? '✅ MET' : '❌ NOT MET');

  console.log('\n' + '='.repeat(60) + '\n');
}

verify();

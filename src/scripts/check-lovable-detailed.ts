/**
 * Check Lovable database with lowercase table names
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

async function checkLovable() {
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('🔍 Checking Lovable Database Structure\n');

  // Check for tenant table
  const { data: tenants, error: tenantError } = await lovable
    .from('tenant')
    .select('*')
    .limit(5);

  if (tenantError) {
    console.log('❌ tenant table:', tenantError.message);
  } else {
    console.log('✅ tenant table:', tenants?.length, 'rows');
    if (tenants && tenants.length > 0) {
      console.log('   Tenant:', JSON.stringify(tenants[0], null, 2));
    }
  }

  // Check orders - get a sample with ID
  const { data: orders } = await lovable
    .from('order')
    .select('id')
    .limit(10);

  console.log('\n✅ Lovable Order IDs (sample):');
  orders?.forEach(o => console.log(`   ${o.id}`));

  // Check orderlines
  const { data: orderlines } = await lovable
    .from('orderline')
    .select('*')
    .limit(5);

  console.log('\n✅ Lovable OrderLines (sample):');
  orderlines?.forEach(ol => console.log(`   Order: ${ol.orderid}, SKU: ${ol.skuid}, Qty: ${ol.quantity}`));
}

checkLovable();

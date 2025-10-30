import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
  console.log('Checking schema...\n');

  // Get sample records to see actual column names
  const { data: orderSample } = await lovable
    .from('order')
    .select('*')
    .limit(1);

  console.log('Order columns:', orderSample?.[0] ? Object.keys(orderSample[0]) : 'No data');

  const { data: orderlineSample } = await lovable
    .from('orderline')
    .select('*')
    .limit(1);

  console.log('Orderline columns:', orderlineSample?.[0] ? Object.keys(orderlineSample[0]) : 'No data');

  const { data: skuSample } = await lovable
    .from('skus')
    .select('*')
    .limit(1);

  console.log('SKU columns:', skuSample?.[0] ? Object.keys(skuSample[0]) : 'No data');
}

checkSchema().then(() => process.exit(0));

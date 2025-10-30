import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function main() {
  const { data, error } = await lovable.from('order').select('*').limit(1);
  if (error) throw error;
  console.log('Sample order columns:', Object.keys(data?.[0] || {}));
  console.log('Sample order:', JSON.stringify(data?.[0], null, 2));
}

main().catch(console.error);

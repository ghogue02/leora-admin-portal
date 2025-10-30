const { createClient } = require('@supabase/supabase-js');

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function checkSchema() {
  // Get a sample SKU
  const { data, error } = await lovable
    .from('skus')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample SKU:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSchema();

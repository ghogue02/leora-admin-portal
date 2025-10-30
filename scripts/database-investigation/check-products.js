const { createClient } = require('@supabase/supabase-js');

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

async function checkProducts() {
  const { count, error } = await lovable
    .from('products')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total products in Lovable: ${count}`);
  }
}

checkProducts();

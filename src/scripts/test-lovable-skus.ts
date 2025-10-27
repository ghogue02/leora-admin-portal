import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

async function test() {
  const tables = ['sku', 'skus'];

  for (const table of tables) {
    const { data, error, count } = await lovable
      .from(table)
      .select('*', { count: 'exact' })
      .limit(3);

    console.log(`${table}:`, error ? `Error - ${error.message}` : `${count} rows`);
    if (data && data.length > 0) {
      console.log('  Sample:', JSON.stringify(data[0]));
    }
  }
}

test();

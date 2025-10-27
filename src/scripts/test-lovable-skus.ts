import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY'
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

/**
 * Test Lovable database connection
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function test() {
  console.log('Testing Lovable connection...\n');

  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY, {
    auth: { persistSession: false }
  });

  // Check table counts
  const tables = ['customer', 'product', 'sku', 'order', 'orderline', 'invoice'];

  for (const table of tables) {
    const { count, error } = await lovable
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: ${count} rows`);
    }
  }
}

test();

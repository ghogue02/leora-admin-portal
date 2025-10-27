/**
 * Check Lovable orderline table schema
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function checkSchema() {
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('🔍 Checking Lovable orderline schema...\n');

  // Get sample record to see structure
  const { data, error } = await lovable
    .from('orderline')
    .select('*')
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample records:');
    console.log(JSON.stringify(data, null, 2));

    if (data && data.length > 0) {
      console.log('\n✅ Column names:');
      Object.keys(data[0]).forEach(col => console.log(`  - ${col}`));
    }
  }
}

checkSchema();

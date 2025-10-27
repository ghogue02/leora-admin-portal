/**
 * Check Lovable orderline table schema
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

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

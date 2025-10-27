/**
 * Test Lovable database connection
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

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

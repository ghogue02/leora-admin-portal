/**
 * Check what tables exist in Lovable database
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

async function checkTables() {
  console.log('🔍 Checking Lovable Database Tables...\n');

  const supabase = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

  // Use raw SQL to list all tables
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `
  });

  if (error) {
    console.log('RPC not available, trying direct query...\n');

    // Try listing common tables
    const commonTables = [
      'customers', 'products', 'orders', 'invoices', 'skus',
      'users', 'sales_reps', 'orderlines', 'order_lines',
      'Customer', 'Product', 'Order', 'Invoice', 'Sku',
      'User', 'SalesRep', 'OrderLine'
    ];

    console.log('Testing common table names:\n');

    for (const table of commonTables) {
      try {
        const { count, error: tableError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!tableError) {
          console.log(`✅ ${table.padEnd(20)} - ${count ?? 0} rows`);
        }
      } catch (err) {
        // Table doesn't exist, skip
      }
    }
  } else {
    console.log('✅ Tables found:\n');
    data?.forEach((row: any) => console.log(`  - ${row.table_name}`));
  }
}

checkTables();

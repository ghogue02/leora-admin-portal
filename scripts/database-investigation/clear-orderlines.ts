import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

async function clearOrderLines() {
  console.log('🗑️  Clearing orderlines for fresh migration...');

  // Get current count
  const { count: beforeCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`  Current orderlines: ${beforeCount}`);

  // Delete all orderlines
  const { error } = await lovable
    .from('orderline')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all except impossible UUID

  if (error) {
    console.error('❌ Error deleting orderlines:', error);
    return;
  }

  // Verify deletion
  const { count: afterCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  console.log(`  Deleted: ${(beforeCount || 0) - (afterCount || 0)} orderlines`);
  console.log(`  Remaining: ${afterCount} orderlines`);
  console.log('✅ Orderlines cleared!');
}

clearOrderLines();

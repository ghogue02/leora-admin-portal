#!/usr/bin/env tsx

/**
 * Check database access and permissions
 */

const SUPABASE_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const SERVICE_KEY = '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>';

async function checkAccess() {
  console.log('🔍 Checking database access...\n');

  // Test 1: Check if we can access the REST API at all
  console.log('Test 1: Basic REST API connectivity');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    console.log(`✓ REST API status: ${response.status}`);
    console.log(`✓ Response: ${await response.text()}\n`);
  } catch (error) {
    console.log(`❌ REST API error:`, error, '\n');
  }

  // Test 2: Try different table name casings
  console.log('Test 2: Testing table name variations');
  const variations = ['Customer', 'customer', 'CUSTOMER'];

  for (const name of variations) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${name}?limit=1`, {
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      });
      console.log(`  ${name}: ${response.status} - ${response.statusText}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`    ✓ Got ${data.length} record(s)`);
      } else {
        const error = await response.text();
        console.log(`    ❌ ${error.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`  ${name}: Error -`, error);
    }
  }

  console.log('\nTest 3: Check JWT token payload');
  const [, payload] = SERVICE_KEY.split('.');
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
  console.log('Token details:', JSON.stringify(decoded, null, 2));
}

checkAccess().catch(console.error);

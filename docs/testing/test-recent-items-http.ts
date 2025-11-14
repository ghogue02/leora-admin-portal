/**
 * HTTP-based test for recent-items API endpoint
 *
 * Usage: npx tsx docs/testing/test-recent-items-http.ts
 *
 * This script makes an actual HTTP request to the running dev server
 * to test the /api/sales/customers/[customerId]/recent-items endpoint.
 *
 * Prerequisites:
 * - Dev server must be running (npm run dev)
 * - Must have a valid session cookie
 */

async function testRecentItemsHTTP() {
  console.log('🧪 Testing Recent Items API via HTTP\n');
  console.log('=' .repeat(80));

  try {
    // Get test customer ID from command line or use a default
    const customerId = process.argv[2] || 'test-customer-id';

    console.log('\n📋 Test Configuration:');
    console.log(`   Base URL: http://localhost:3002`);
    console.log(`   Endpoint: /api/sales/customers/${customerId}/recent-items`);
    console.log(`   Customer ID: ${customerId}`);

    // Step 1: Check if server is running
    console.log('\n🔍 Step 1: Checking if dev server is running...');

    try {
      const healthCheck = await fetch('http://localhost:3002');
      console.log(`   ✅ Server is running (status: ${healthCheck.status})`);
    } catch (error) {
      console.log('   ❌ Server is not responding');
      console.log('   💡 Make sure to run: npm run dev');
      return;
    }

    // Step 2: Try to call the API endpoint
    console.log('\n🌐 Step 2: Calling recent-items endpoint...');

    const apiUrl = `http://localhost:3002/api/sales/customers/${customerId}/recent-items`;
    console.log(`   URL: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);

    // Step 3: Parse response
    console.log('\n📦 Step 3: Parsing response...');

    const contentType = response.headers.get('content-type');
    let responseData;

    if (contentType?.includes('application/json')) {
      responseData = await response.json();
      console.log('   ✅ Response is JSON');
    } else {
      const text = await response.text();
      console.log('   ⚠️  Response is not JSON:');
      console.log(text.substring(0, 500));
      return;
    }

    // Step 4: Analyze response
    console.log('\n📊 Step 4: Analyzing response data...');

    if (response.status === 200) {
      console.log('   ✅ API call successful');

      if (responseData.items) {
        console.log(`   📦 Items returned: ${responseData.items.length}`);

        if (responseData.items.length > 0) {
          console.log('\n   Sample item (first):');
          const firstItem = responseData.items[0];
          console.log(JSON.stringify(firstItem, null, 4));
        } else {
          console.log('   ℹ️  No items in response (customer may have no recent orders)');
        }
      } else {
        console.log('   ⚠️  Response missing "items" field');
        console.log('   Full response:', JSON.stringify(responseData, null, 2));
      }
    } else if (response.status === 401) {
      console.log('   🔒 Authentication required');
      console.log('   💡 This endpoint requires a valid sales session');
      console.log('   💡 Try logging in through the UI first');

      if (responseData.error) {
        console.log(`   Error: ${responseData.error}`);
      }
    } else if (response.status === 403) {
      console.log('   🚫 Forbidden - authorization failed');
      console.log('   💡 User may not have sales rep profile or access to this customer');

      if (responseData.error) {
        console.log(`   Error: ${responseData.error}`);
      }
    } else if (response.status === 404) {
      console.log('   ❌ Customer not found');
      console.log('   💡 Customer may not exist or not assigned to this sales rep');

      if (responseData.error) {
        console.log(`   Error: ${responseData.error}`);
      }
    } else if (response.status === 500) {
      console.log('   💥 Internal server error');
      console.log('   💡 Check dev server logs for details');

      if (responseData.error) {
        console.log(`   Error: ${responseData.error}`);
      }
      if (responseData.details) {
        console.log(`   Details: ${JSON.stringify(responseData.details, null, 2)}`);
      }
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Endpoint: ${apiUrl}`);

    if (response.status === 200) {
      console.log('✅ API is working correctly');
    } else if (response.status === 401 || response.status === 403) {
      console.log('⚠️  API requires authentication/authorization');
      console.log('💡 This is expected behavior - endpoint is protected');
    } else if (response.status === 404) {
      console.log('⚠️  Customer not found');
      console.log('💡 Try with a different customer ID');
    } else if (response.status === 500) {
      console.log('❌ API has errors - check dev server logs');
    }

    console.log('\n💡 To test with a real customer:');
    console.log('   npx tsx docs/testing/test-recent-items-http.ts <customer-id>');

  } catch (error) {
    console.error('\n❌ ERROR during testing:');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nError details:');
      console.error(`  Name: ${error.name}`);
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }
  }
}

// Run the test
testRecentItemsHTTP().catch(console.error);

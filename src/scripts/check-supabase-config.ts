#!/usr/bin/env tsx

/**
 * Supabase Configuration Checker
 *
 * Quick script to verify Supabase credentials and help find the service role key.
 */

import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...\n');

  let allPresent = true;

  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName];
    const isPresent = !!value;
    const isPlaceholder = value?.includes('<') || value?.includes('>');

    if (!isPresent) {
      console.log(`❌ ${varName}: NOT SET`);
      allPresent = false;
    } else if (isPlaceholder) {
      console.log(`⚠️  ${varName}: Placeholder value detected`);
      console.log(`   Current: ${value}`);
      console.log(`   Action: Replace with actual key from Supabase dashboard\n`);
      allPresent = false;
    } else {
      const preview =
        value.length > 50 ? `${value.substring(0, 50)}...` : value;
      console.log(`✅ ${varName}: Set`);
      console.log(`   Preview: ${preview}\n`);
    }
  }

  return allPresent;
}

async function testSupabaseConnection() {
  console.log('🔌 Testing Supabase connection...\n');

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.log('⊘ Skipping test (credentials not set)\n');
    return false;
  }

  if (key.includes('<') || key.includes('>')) {
    console.log('⊘ Skipping test (placeholder key detected)\n');
    return false;
  }

  try {
    const supabase = createClient(url, key);

    // Test 1: List buckets
    const { data: buckets, error: listError } =
      await supabase.storage.listBuckets();

    if (listError) {
      console.log(`❌ Failed to list buckets: ${listError.message}\n`);
      return false;
    }

    console.log(`✅ Successfully connected to Supabase`);
    console.log(`   URL: ${url}`);
    console.log(`   Buckets found: ${buckets?.length || 0}\n`);

    if (buckets && buckets.length > 0) {
      console.log('📦 Existing buckets:');
      buckets.forEach((bucket) => {
        console.log(
          `   - ${bucket.name}${bucket.public ? ' (public)' : ' (private)'}`,
        );
      });
      console.log();
    }

    // Test 2: Check product-images bucket
    const bucketExists = buckets?.some((b) => b.name === 'product-images');
    if (bucketExists) {
      console.log('✅ Bucket "product-images" already exists\n');

      // List some files
      const { data: files } = await supabase.storage
        .from('product-images')
        .list('', { limit: 10 });

      if (files && files.length > 0) {
        console.log('📁 Sample files in bucket:');
        files.forEach((file) => {
          console.log(`   - ${file.name}`);
        });
        console.log();
      }
    } else {
      console.log(
        '⚠️  Bucket "product-images" does not exist (will be created on upload)\n',
      );
    }

    return true;
  } catch (error) {
    console.log(
      `❌ Connection error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return false;
  }
}

function printInstructions() {
  console.log('=' + '='.repeat(60));
  console.log('\n📝 How to Get Supabase Service Role Key:\n');
  console.log('1. Open Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard\n');
  console.log('2. Select your project:');
  console.log('   Project: zqezunzlyjkseugujkrl\n');
  console.log('3. Navigate to Settings → API\n');
  console.log('4. Find "service_role" key (NOT anon key!)');
  console.log('   - anon key: Client-side, public');
  console.log('   - service_role key: Server-side, admin access ✅\n');
  console.log('5. Copy the service_role key\n');
  console.log('6. Update /web/.env:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY="your-key-here"\n');
  console.log('7. Re-run this script to verify:');
  console.log('   npx tsx src/scripts/check-supabase-config.ts\n');
}

async function main() {
  console.log('🔧 Supabase Configuration Checker\n');
  console.log('=' + '='.repeat(60) + '\n');

  const envOk = checkEnvironmentVariables();
  const connectionOk = await testSupabaseConnection();

  console.log('=' + '='.repeat(60));
  console.log('\n📊 Summary:\n');
  console.log(`   Environment variables: ${envOk ? '✅' : '❌'}`);
  console.log(`   Supabase connection:   ${connectionOk ? '✅' : '❌'}\n`);

  if (envOk && connectionOk) {
    console.log('✅ Configuration is correct! Ready to upload images.\n');
    console.log('Next steps:');
    console.log('   1. Test setup:  npm run upload:images:test');
    console.log('   2. Dry run:     npm run upload:images:dry-run');
    console.log('   3. Real upload: npm run upload:images\n');
  } else {
    console.log(
      '⚠️  Configuration issues detected. Please fix before uploading.\n',
    );
    if (!envOk || !connectionOk) {
      printInstructions();
    }
  }

  process.exit(envOk && connectionOk ? 0 : 1);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});

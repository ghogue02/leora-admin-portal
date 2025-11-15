#!/usr/bin/env tsx
/**
 * Verify Supabase Storage Bucket
 *
 * Quick check to ensure the product-images bucket exists before uploading.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'product-images';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 Checking Supabase Storage...\n');

  // List all buckets
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Failed to list buckets:', error.message);
    process.exit(1);
  }

  console.log('📦 Available buckets:');
  buckets?.forEach(bucket => {
    const isTarget = bucket.name === BUCKET_NAME;
    const marker = isTarget ? '✅' : '  ';
    console.log(`${marker} ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
  });

  const targetBucket = buckets?.find(b => b.name === BUCKET_NAME);

  console.log('\n');
  if (targetBucket) {
    console.log(`✅ Bucket "${BUCKET_NAME}" exists`);
    console.log(`   Public: ${targetBucket.public}`);
    console.log('\n🚀 Ready to upload images!');
    console.log(`   Run: npx tsx src/scripts/upload-images-mcp.ts`);
  } else {
    console.log(`❌ Bucket "${BUCKET_NAME}" not found`);
    console.log('\n📝 Create bucket in Supabase Dashboard:');
    console.log('   1. Go to: Storage > New Bucket');
    console.log(`   2. Name: ${BUCKET_NAME}`);
    console.log('   3. Public: Yes');
    console.log(`   4. URL: ${SUPABASE_URL}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

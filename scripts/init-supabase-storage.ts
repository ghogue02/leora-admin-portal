#!/usr/bin/env tsx

/**
 * Initialize Supabase Storage Bucket for Image Scanning
 *
 * Creates the 'customer-scans' bucket if it doesn't exist.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   npx tsx scripts/init-supabase-storage.ts
 *
 * Environment Variables Required:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'customer-scans';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

async function initializeStorageBucket() {
  console.log('🚀 Initializing Supabase Storage...\n');

  // Validate environment variables
  if (!process.env.SUPABASE_URL) {
    console.error('❌ Error: SUPABASE_URL environment variable is not set');
    process.exit(1);
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    process.exit(1);
  }

  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Check if bucket exists
    console.log(`🔍 Checking if bucket '${BUCKET_NAME}' exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Failed to list buckets: ${listError.message}`);
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
      console.log('   No action needed.\n');
      return;
    }

    // Create bucket
    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp'
      ]
    });

    if (createError) {
      throw new Error(`Failed to create bucket: ${createError.message}`);
    }

    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully`);
    console.log(`   - Public: Yes`);
    console.log(`   - Max file size: ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    console.log(`   - Allowed types: JPEG, PNG, WebP\n`);

    // Set up storage policies (RLS)
    console.log('🔒 Setting up storage policies...');
    console.log('   Note: You may need to manually configure RLS policies in Supabase Dashboard');
    console.log('   Required policies:');
    console.log('   1. Allow authenticated users to upload to their tenant folder');
    console.log('   2. Allow public read access to all files');
    console.log('   3. Allow authenticated users to delete their own files\n');

    console.log('✨ Storage initialization complete!\n');

  } catch (error) {
    console.error('❌ Storage initialization failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run initialization
initializeStorageBucket()
  .then(() => {
    console.log('👍 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

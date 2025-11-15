#!/usr/bin/env tsx
/**
 * HAL Image Upload Script - Phase 2
 *
 * This script uploads HAL product images to Supabase Storage and creates
 * ProductImage records in the database.
 *
 * PREREQUISITES:
 * 1. SUPABASE_URL environment variable
 * 2. SUPABASE_SERVICE_ROLE_KEY environment variable
 * 3. product-images storage bucket exists in Supabase
 *
 * USAGE:
 *   npx tsx src/scripts/execute-image-upload.ts
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
const IMAGES_DIR = '/Users/greghogue/Leora2/scripts/hal-scraper/output/images';
const BUCKET_NAME = 'product-images';
const BATCH_SIZE = 10;

interface UploadResult {
  sku: string;
  filename: string;
  publicUrl: string | null;
  error: string | null;
}

interface Stats {
  totalImages: number;
  uploaded: number;
  skipped: number;
  failed: number;
  errors: string[];
}

/**
 * Get Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Upload single image to Supabase Storage
 */
async function uploadImage(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  filename: string
): Promise<string | null> {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filename.endsWith('.png') ? 'image/png' :
                       filename.endsWith('.jpg') || filename.endsWith('.jpeg') ? 'image/jpeg' :
                       'image/webp';

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true, // Replace if exists
      });

    if (error) {
      console.error(`   ❌ Upload failed for ${filename}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error(`   ❌ Error uploading ${filename}:`, error);
    return null;
  }
}

/**
 * Get SKU ID from code
 */
async function getSkuId(supabase: ReturnType<typeof createClient>, skuCode: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('Sku')
    .select('id')
    .eq('tenantId', TENANT_ID)
    .eq('code', skuCode)
    .single();

  if (error || !data) {
    return null;
  }

  return data.id;
}

/**
 * Create ProductImage record
 */
async function createProductImageRecord(
  supabase: ReturnType<typeof createClient>,
  skuId: string,
  imageUrl: string,
  isPrimary: boolean = true
): Promise<boolean> {
  const { error } = await supabase
    .from('ProductImage')
    .insert({
      id: crypto.randomUUID(),
      tenantId: TENANT_ID,
      skuId,
      imageUrl,
      isPrimary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

  if (error) {
    console.error(`   ❌ Failed to create ProductImage record:`, error.message);
    return false;
  }

  return true;
}

/**
 * Main upload function
 */
async function executeImageUpload(): Promise<void> {
  console.log('🖼️  Starting HAL Image Upload to Supabase\n');

  const stats: Stats = {
    totalImages: 0,
    uploaded: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };

  // Get Supabase client
  const supabase = getSupabaseClient();
  console.log('✅ Connected to Supabase\n');

  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.error(`❌ Bucket '${BUCKET_NAME}' does not exist!`);
    console.log('   Create it in Supabase Dashboard: Storage > New Bucket');
    console.log(`   Name: ${BUCKET_NAME}`);
    console.log('   Public: Yes');
    return;
  }

  console.log(`✅ Bucket '${BUCKET_NAME}' exists\n`);

  // Read images directory
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
    return;
  }

  const files = fs.readdirSync(IMAGES_DIR);
  const imageFiles = files.filter(f =>
    f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.webp')
  );

  stats.totalImages = imageFiles.length;
  console.log(`📂 Found ${stats.totalImages} images to upload\n`);

  // Process images in batches
  const results: UploadResult[] = [];

  for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
    const batch = imageFiles.slice(i, Math.min(i + BATCH_SIZE, imageFiles.length));
    console.log(`\n📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: Processing ${batch.length} images...`);

    for (const filename of batch) {
      const sku = filename.replace(/\.(png|jpg|jpeg|webp)$/i, '');
      const filePath = path.join(IMAGES_DIR, filename);

      try {
        // Upload image
        console.log(`   ⬆️  Uploading ${filename}...`);
        const publicUrl = await uploadImage(supabase, filePath, filename);

        if (!publicUrl) {
          stats.failed++;
          results.push({ sku, filename, publicUrl: null, error: 'Upload failed' });
          continue;
        }

        console.log(`   ✅ Uploaded: ${publicUrl}`);

        // Get SKU ID
        const skuId = await getSkuId(supabase, sku);
        if (!skuId) {
          console.log(`   ⚠️  SKU not found for ${sku}, skipping ProductImage record`);
          stats.skipped++;
          results.push({ sku, filename, publicUrl, error: 'SKU not found' });
          continue;
        }

        // Create ProductImage record
        const created = await createProductImageRecord(supabase, skuId, publicUrl);
        if (created) {
          stats.uploaded++;
          results.push({ sku, filename, publicUrl, error: null });
          console.log(`   ✅ Created ProductImage record for SKU ${sku}`);
        } else {
          stats.failed++;
          results.push({ sku, filename, publicUrl, error: 'Failed to create ProductImage record' });
        }

      } catch (error) {
        const errorMsg = `Error processing ${filename}: ${error}`;
        stats.errors.push(errorMsg);
        stats.failed++;
        results.push({ sku, filename, publicUrl: null, error: errorMsg });
        console.error(`   ❌ ${errorMsg}`);
      }
    }
  }

  // Generate report
  console.log('\n\n📊 Upload Summary:');
  console.log(`   Total Images: ${stats.totalImages}`);
  console.log(`   ✅ Successfully Uploaded: ${stats.uploaded}`);
  console.log(`   ⚠️  Skipped (SKU not found): ${stats.skipped}`);
  console.log(`   ❌ Failed: ${stats.failed}`);

  if (stats.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    if (stats.errors.length > 10) {
      console.log(`   ... and ${stats.errors.length - 10} more errors`);
    }
  }

  // Write results to file
  const resultsPath = '/Users/greghogue/Leora2/web/src/scripts/image-upload-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n📝 Full results written to: ${resultsPath}`);

  console.log('\n✅ Phase 2 Complete!');
}

// Run upload
executeImageUpload().catch(console.error);

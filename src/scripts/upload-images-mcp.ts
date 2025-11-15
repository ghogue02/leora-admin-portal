#!/usr/bin/env tsx
/**
 * Streamlined Image Upload Script
 *
 * This script:
 * 1. Uploads images to Supabase Storage using @supabase/supabase-js
 * 2. Generates SQL INSERT statements for ProductImage records
 * 3. Saves SQL to /tmp/product-images-insert.sql
 * 4. Provides command to execute SQL via MCP
 *
 * Flow:
 * - For each image in /scripts/hal-scraper/output/images/:
 *   1. Upload to Supabase Storage (bucket: product-images)
 *   2. Get public URL
 *   3. Generate SQL INSERT for ProductImage table
 *   4. Append to SQL file
 *
 * Usage:
 *   npx tsx src/scripts/upload-images-mcp.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

// Configuration
const BUCKET_NAME = 'product-images';
const IMAGES_DIR = '/Users/greghogue/Leora2/scripts/hal-scraper/output/images';
const SQL_OUTPUT_PATH = '/tmp/product-images-insert.sql';
const BATCH_SIZE = 50; // Upload in batches for progress tracking

// Validate environment
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('   - SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Image type mapping based on filename suffix
function getImageType(filename: string): string {
  if (filename.includes('-packshot.')) return 'packshot';
  if (filename.includes('-frontLabel.')) return 'frontLabel';
  if (filename.includes('-backLabel.')) return 'backLabel';
  return 'packshot'; // default
}

// Extract SKU code from filename (e.g., "ARG1001-packshot.jpg" -> "ARG1001")
function extractSkuCode(filename: string): string {
  const match = filename.match(/^([A-Z0-9]+)-/);
  return match ? match[1] : filename.split('.')[0];
}

// Get display order based on image type
function getDisplayOrder(imageType: string): number {
  switch (imageType) {
    case 'packshot': return 1;
    case 'frontLabel': return 2;
    case 'backLabel': return 3;
    default: return 0;
  }
}

// Generate SQL INSERT statement for ProductImage
function generateInsertSQL(skuCode: string, imageType: string, publicUrl: string, displayOrder: number): string {
  const escapedUrl = publicUrl.replace(/'/g, "''"); // Escape single quotes in SQL
  return `INSERT INTO "ProductImage" (id, "tenantId", "skuCode", "imageType", "storageUrl", "displayOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${TENANT_ID}',
  '${skuCode}',
  '${imageType}',
  '${escapedUrl}',
  ${displayOrder},
  NOW(),
  NOW()
);`;
}

// Upload a single image to Supabase Storage
async function uploadImage(filename: string, filePath: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Determine content type
    const ext = path.extname(filename).toLowerCase();
    const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, fileBuffer, {
        contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return { success: true, url: publicUrl };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Format time remaining
function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Main execution
async function main() {
  console.log('🚀 Streamlined Image Upload Script\n');
  console.log('📂 Source Directory:', IMAGES_DIR);
  console.log('🪣 Supabase Bucket:', BUCKET_NAME);
  console.log('📄 SQL Output:', SQL_OUTPUT_PATH);
  console.log();

  // Verify bucket exists
  console.log('🔍 Verifying Supabase Storage bucket...');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

  if (bucketError) {
    console.error('❌ Failed to list buckets:', bucketError.message);
    process.exit(1);
  }

  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
  if (!bucketExists) {
    console.error(`❌ Bucket "${BUCKET_NAME}" does not exist`);
    console.log('   Create it in Supabase Dashboard: Storage > New Bucket');
    process.exit(1);
  }
  console.log('✅ Bucket verified\n');

  // Get list of image files
  console.log('📋 Reading image files...');
  const files = await fs.readdir(IMAGES_DIR);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));

  console.log(`📦 Found ${imageFiles.length} images to upload\n`);

  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in directory');
    process.exit(0);
  }

  // Initialize SQL file with header
  const sqlHeader = `-- Product Images Upload
-- Generated: ${new Date().toISOString()}
-- Total Images: ${imageFiles.length}
-- Tenant ID: ${TENANT_ID}
--
-- Execute this SQL file using:
-- cat ${SQL_OUTPUT_PATH} | psql "postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
--

-- Start transaction
BEGIN;

`;
  await fs.writeFile(SQL_OUTPUT_PATH, sqlHeader);

  // Upload tracking
  let successCount = 0;
  let failureCount = 0;
  const failures: Array<{ filename: string; error: string }> = [];
  const startTime = Date.now();

  // Process images
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const filePath = path.join(IMAGES_DIR, filename);

    // Calculate progress
    const progress = Math.round(((i + 1) / imageFiles.length) * 100);
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = (i + 1) / elapsed;
    const remaining = (imageFiles.length - (i + 1)) / rate;

    // Progress bar
    const barLength = 40;
    const filled = Math.round((barLength * (i + 1)) / imageFiles.length);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

    process.stdout.write(
      `\r[${bar}] ${progress}% (${i + 1}/${imageFiles.length}) - ETA: ${formatTimeRemaining(remaining)}   `
    );

    // Upload image
    const result = await uploadImage(filename, filePath);

    if (result.success && result.url) {
      successCount++;

      // Generate SQL INSERT
      const skuCode = extractSkuCode(filename);
      const imageType = getImageType(filename);
      const displayOrder = getDisplayOrder(imageType);
      const sql = generateInsertSQL(skuCode, imageType, result.url, displayOrder);

      // Append to SQL file
      await fs.appendFile(SQL_OUTPUT_PATH, `${sql}\n\n`);
    } else {
      failureCount++;
      failures.push({ filename, error: result.error || 'Unknown error' });
    }

    // Small delay to avoid rate limiting
    if ((i + 1) % BATCH_SIZE === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Finalize SQL file
  await fs.appendFile(SQL_OUTPUT_PATH, '\n-- Commit transaction\nCOMMIT;\n');

  // Clear progress bar
  process.stdout.write('\r' + ' '.repeat(100) + '\r');

  // Summary
  console.log('\n');
  console.log('📊 Upload Summary');
  console.log('═'.repeat(60));
  console.log(`✅ Successful uploads: ${successCount}`);
  console.log(`❌ Failed uploads: ${failureCount}`);
  console.log(`📄 SQL file generated: ${SQL_OUTPUT_PATH}`);

  const totalTime = (Date.now() - startTime) / 1000;
  const avgRate = imageFiles.length / totalTime;
  console.log(`⏱️  Total time: ${formatTimeRemaining(totalTime)} (${avgRate.toFixed(1)} images/sec)`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Uploads:');
    failures.slice(0, 10).forEach(f => {
      console.log(`   - ${f.filename}: ${f.error}`);
    });
    if (failures.length > 10) {
      console.log(`   ... and ${failures.length - 10} more`);
    }
  }

  console.log('\n');
  console.log('🚀 Next Steps:');
  console.log('═'.repeat(60));
  console.log('1. Review the generated SQL file:');
  console.log(`   cat ${SQL_OUTPUT_PATH}`);
  console.log('');
  console.log('2. Execute SQL to create database records:');
  console.log(`   cat ${SQL_OUTPUT_PATH} | psql "postgresql://postgres.zqezunzlyjkseugujkrl:9gpGHuAIr2vKf4hO@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"`);
  console.log('');
  console.log('3. Verify uploads in Supabase Dashboard:');
  console.log(`   Storage > ${BUCKET_NAME}`);
  console.log('');

  if (failureCount > 0) {
    console.log('⚠️  Some uploads failed. Review errors above and retry if needed.');
    process.exit(1);
  }

  console.log('✅ Upload complete! Database records ready to be created.');
}

// Run main function
main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

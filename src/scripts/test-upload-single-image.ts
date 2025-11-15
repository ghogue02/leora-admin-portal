#!/usr/bin/env tsx
/**
 * Test Upload Script - Single Image
 *
 * Test the upload flow with a single image before processing all 2147.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
const BUCKET_NAME = 'product-images';
const IMAGES_DIR = '/Users/greghogue/Leora2/scripts/hal-scraper/output/images';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function getImageType(filename: string): string {
  if (filename.includes('-packshot.')) return 'packshot';
  if (filename.includes('-frontLabel.')) return 'frontLabel';
  if (filename.includes('-backLabel.')) return 'backLabel';
  return 'packshot';
}

function extractSkuCode(filename: string): string {
  const match = filename.match(/^([A-Z0-9]+)-/);
  return match ? match[1] : filename.split('.')[0];
}

function getDisplayOrder(imageType: string): number {
  switch (imageType) {
    case 'packshot': return 1;
    case 'frontLabel': return 2;
    case 'backLabel': return 3;
    default: return 0;
  }
}

async function main() {
  console.log('🧪 Testing single image upload...\n');

  // Get first image
  const files = await fs.readdir(IMAGES_DIR);
  const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
  const testFile = imageFiles[0];

  if (!testFile) {
    console.error('❌ No images found');
    process.exit(1);
  }

  console.log(`📸 Test image: ${testFile}`);

  // Read file
  const filePath = path.join(IMAGES_DIR, testFile);
  const fileBuffer = await fs.readFile(filePath);
  const stats = await fs.stat(filePath);

  console.log(`📦 File size: ${(stats.size / 1024).toFixed(1)} KB`);

  // Determine content type
  const ext = path.extname(testFile).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' : 'image/jpeg';

  console.log(`📝 Content-Type: ${contentType}`);
  console.log('\n🚀 Uploading...');

  // Upload
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testFile, fileBuffer, {
      contentType,
      upsert: true
    });

  if (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Upload successful!');

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(testFile);

  console.log(`🔗 Public URL: ${publicUrl}`);

  // Generate SQL
  const skuCode = extractSkuCode(testFile);
  const imageType = getImageType(testFile);
  const displayOrder = getDisplayOrder(imageType);

  console.log('\n📄 SQL INSERT:');
  console.log('─'.repeat(80));

  const sql = `INSERT INTO "ProductImage" (id, "tenantId", "skuCode", "imageType", "storageUrl", "displayOrder", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${TENANT_ID}',
  '${skuCode}',
  '${imageType}',
  '${publicUrl}',
  ${displayOrder},
  NOW(),
  NOW()
);`;

  console.log(sql);
  console.log('─'.repeat(80));

  console.log('\n✅ Test successful! Ready to process all images.');
  console.log(`   Total images to upload: ${imageFiles.length}`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

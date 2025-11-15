#!/usr/bin/env tsx

/**
 * Test Image Upload Setup
 *
 * Verifies environment configuration before running full upload:
 * - Supabase credentials
 * - Image directory access
 * - Database connectivity
 * - Sample image processing
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  sourceDir: '/Users/greghogue/Leora2/scripts/hal-scraper/output/images',
  supabaseBucket: 'product-images',
};

async function testEnvironmentVariables(): Promise<boolean> {
  console.log('1️⃣  Checking environment variables...');

  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (hasUrl) {
    console.log('   ✅ SUPABASE_URL is set');
  } else {
    console.log('   ❌ SUPABASE_URL is missing');
  }

  if (hasKey) {
    console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY is set');
  } else {
    console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY is missing');
  }

  return hasUrl && hasKey;
}

async function testImageDirectory(): Promise<boolean> {
  console.log('\n2️⃣  Checking image directory...');

  try {
    const stats = await fs.stat(CONFIG.sourceDir);
    if (!stats.isDirectory()) {
      console.log(`   ❌ ${CONFIG.sourceDir} is not a directory`);
      return false;
    }

    const files = await fs.readdir(CONFIG.sourceDir);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

    console.log(`   ✅ Directory exists: ${CONFIG.sourceDir}`);
    console.log(`   ✅ Found ${imageFiles.length} image files`);

    return imageFiles.length > 0;
  } catch (error) {
    console.log(`   ❌ Cannot access directory: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n3️⃣  Testing database connection...');

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    console.log('   ✅ Connected to database');

    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'well-crafted' },
    });

    if (!tenant) {
      console.log('   ❌ Tenant "well-crafted" not found');
      return false;
    }

    console.log(`   ✅ Found tenant: ${tenant.name}`);

    const productCount = await prisma.product.count({
      where: { tenantId: tenant.id },
    });

    console.log(`   ✅ Found ${productCount} products`);

    const skuCount = await prisma.sku.count({
      where: { tenantId: tenant.id },
    });

    console.log(`   ✅ Found ${skuCount} SKUs`);

    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`   ❌ Database error: ${error instanceof Error ? error.message : String(error)}`);
    await prisma.$disconnect();
    return false;
  }
}

async function testSupabaseConnection(): Promise<boolean> {
  console.log('\n4️⃣  Testing Supabase Storage connection...');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('   ⊘ Skipping (credentials not set)');
    return false;
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
      console.log(`   ❌ Failed to list buckets: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Connected to Supabase Storage`);
    console.log(`   ℹ️  Found ${buckets?.length || 0} buckets`);

    const bucketExists = buckets?.some(b => b.name === CONFIG.supabaseBucket);
    if (bucketExists) {
      console.log(`   ✅ Bucket "${CONFIG.supabaseBucket}" exists`);
    } else {
      console.log(`   ⚠️  Bucket "${CONFIG.supabaseBucket}" does not exist (will be created on upload)`);
    }

    return true;
  } catch (error) {
    console.log(`   ❌ Supabase error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testImageProcessing(): Promise<boolean> {
  console.log('\n5️⃣  Testing image processing with Sharp...');

  try {
    const files = await fs.readdir(CONFIG.sourceDir);
    const firstImage = files.find(f => /\.(jpg|jpeg|png)$/i.test(f));

    if (!firstImage) {
      console.log('   ❌ No test images found');
      return false;
    }

    console.log(`   📸 Testing with: ${firstImage}`);

    const imagePath = path.join(CONFIG.sourceDir, firstImage);
    const buffer = await fs.readFile(imagePath);

    // Test metadata extraction
    const metadata = await sharp(buffer).metadata();
    console.log(`   ✅ Image metadata: ${metadata.width}x${metadata.height}, ${metadata.format}`);

    // Test resizing
    const thumbnail = await sharp(buffer)
      .resize(200, 200, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .webp({ quality: 85 })
      .toBuffer();

    console.log(`   ✅ Thumbnail created: ${thumbnail.length} bytes (${((buffer.length - thumbnail.length) / buffer.length * 100).toFixed(1)}% reduction)`);

    // Test WebP conversion
    const webp = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();

    console.log(`   ✅ WebP conversion: ${webp.length} bytes (${((buffer.length - webp.length) / buffer.length * 100).toFixed(1)}% reduction)`);

    return true;
  } catch (error) {
    console.log(`   ❌ Processing error: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function testSKUMatching(): Promise<boolean> {
  console.log('\n6️⃣  Testing SKU code matching...');

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    const files = await fs.readdir(CONFIG.sourceDir);
    const imagePattern = /^([A-Z0-9]+)-(packshot|frontLabel|backLabel)\.(jpg|jpeg|png|webp)$/i;

    const sampleImages = files
      .filter(f => imagePattern.test(f))
      .slice(0, 10);

    if (sampleImages.length === 0) {
      console.log('   ❌ No valid image files found');
      return false;
    }

    console.log(`   Testing ${sampleImages.length} sample images...`);

    let matched = 0;
    let notFound = 0;

    for (const file of sampleImages) {
      const match = file.match(imagePattern);
      if (!match) continue;

      const skuCode = match[1];
      const imageType = match[2];

      const sku = await prisma.sku.findFirst({
        where: { code: skuCode },
        include: { product: true },
      });

      if (sku && sku.product) {
        matched++;
        console.log(`   ✅ ${skuCode}-${imageType}: Found product "${sku.product.name}"`);
      } else {
        notFound++;
        console.log(`   ⚠️  ${skuCode}-${imageType}: SKU not found in database`);
      }
    }

    console.log(`\n   Summary: ${matched} matched, ${notFound} not found`);

    await prisma.$disconnect();
    return matched > 0;
  } catch (error) {
    console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    await prisma.$disconnect();
    return false;
  }
}

async function main() {
  console.log('🧪 Image Upload Setup Test\n');
  console.log('='+ '='.repeat(60) + '\n');

  const results = {
    env: await testEnvironmentVariables(),
    directory: await testImageDirectory(),
    database: await testDatabaseConnection(),
    supabase: await testSupabaseConnection(),
    processing: await testImageProcessing(),
    skuMatching: await testSKUMatching(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;

  console.log(`   Environment variables:    ${results.env ? '✅' : '❌'}`);
  console.log(`   Image directory:          ${results.directory ? '✅' : '❌'}`);
  console.log(`   Database connection:      ${results.database ? '✅' : '❌'}`);
  console.log(`   Supabase Storage:         ${results.supabase ? '✅' : '❌'}`);
  console.log(`   Image processing:         ${results.processing ? '✅' : '❌'}`);
  console.log(`   SKU matching:             ${results.skuMatching ? '✅' : '❌'}`);

  console.log(`\n   Overall: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n✅ All tests passed! Ready to run upload script.');
    console.log('\nNext steps:');
    console.log('   1. Test with dry run: npm run upload:images:dry-run');
    console.log('   2. Run full upload:   npm run upload:images');
  } else {
    console.log('\n⚠️  Some tests failed. Please fix issues before uploading.');
    console.log('\nSee documentation: /web/docs/IMAGE_UPLOAD_GUIDE.md');
  }

  process.exit(passed === total ? 0 : 1);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:');
  console.error(error);
  process.exit(1);
});

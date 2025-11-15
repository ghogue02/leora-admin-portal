/**
 * Upload HAL Product Images to Supabase Storage
 *
 * This script uploads all product images from the HAL scraper output
 * and creates ProductImage database records linking them to SKUs.
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from web/.env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Debug: Verify environment variables loaded
if (!SUPABASE_SERVICE_KEY || SUPABASE_SERVICE_KEY.includes('<') || SUPABASE_SERVICE_KEY.includes('>')) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set correctly in .env file');
  console.error('Please update /Users/greghogue/Leora2/web/.env with actual service role key');
  process.exit(1);
}
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';
const IMAGES_DIR = '/Users/greghogue/Leora2/scripts/hal-scraper/output/images';
const BUCKET_NAME = 'product-images';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const prisma = new PrismaClient();

interface UploadResult {
  filename: string;
  skuCode: string;
  imageType: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

interface UploadStats {
  totalImages: number;
  uploaded: number;
  failed: number;
  skipped: number;
  dbRecordsCreated: number;
}

/**
 * Extract SKU code and image type from filename
 * Examples:
 *   "CAL1004-packshot.jpg" -> { sku: "CAL1004", type: "packshot" }
 *   "VINIFERA_CHARDONNAY-frontLabel.png" -> { sku: "VINIFERA_CHARDONNAY", type: "frontLabel" }
 */
function parseFilename(filename: string): { skuCode: string; imageType: string } | null {
  const match = filename.match(/^(.+?)-(packshot|frontLabel|backLabel)\.(jpg|jpeg|png|webp)$/i);
  if (!match) {
    console.warn(`⚠️  Skipping invalid filename format: ${filename}`);
    return null;
  }

  return {
    skuCode: match[1],
    imageType: match[2]
  };
}

/**
 * Get display order for image type
 */
function getDisplayOrder(imageType: string): number {
  const order: Record<string, number> = {
    'packshot': 1,
    'frontLabel': 2,
    'backLabel': 3
  };
  return order[imageType] || 99;
}

/**
 * Upload single image to Supabase Storage
 */
async function uploadImage(
  filename: string,
  filePath: string
): Promise<{ publicUrl: string } | null> {
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const contentType = filename.endsWith('.png') ? 'image/png' :
                        filename.endsWith('.webp') ? 'image/webp' :
                        'image/jpeg';

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`original/${filename}`, fileBuffer, {
        contentType,
        upsert: true // Overwrite if exists
      });

    if (error) {
      console.error(`❌ Upload failed for ${filename}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(`original/${filename}`);

    return { publicUrl: urlData.publicUrl };
  } catch (error) {
    console.error(`❌ Exception uploading ${filename}:`, error);
    return null;
  }
}

/**
 * Create ProductImage database record
 */
async function createProductImageRecord(
  skuCode: string,
  imageType: string,
  storageUrl: string
): Promise<boolean> {
  try {
    await prisma.productImage.create({
      data: {
        tenantId: TENANT_ID,
        skuCode,
        imageType,
        storageUrl,
        displayOrder: getDisplayOrder(imageType)
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Database insert failed for ${skuCode}:`, error);
    return false;
  }
}

/**
 * Main upload function
 */
async function uploadAllImages() {
  console.log('🚀 Starting HAL Product Image Upload\n');
  console.log(`📁 Source: ${IMAGES_DIR}`);
  console.log(`🪣 Bucket: ${BUCKET_NAME}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}\n`);

  // Read all image files
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  const stats: UploadStats = {
    totalImages: files.length,
    uploaded: 0,
    failed: 0,
    skipped: 0,
    dbRecordsCreated: 0
  };

  const results: UploadResult[] = [];

  console.log(`📊 Found ${stats.totalImages} images to process\n`);

  // Process each image
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filePath = path.join(IMAGES_DIR, filename);

    // Parse filename
    const parsed = parseFilename(filename);
    if (!parsed) {
      stats.skipped++;
      results.push({
        filename,
        skuCode: '',
        imageType: '',
        publicUrl: '',
        success: false,
        error: 'Invalid filename format'
      });
      continue;
    }

    const { skuCode, imageType } = parsed;

    // Upload image
    const uploadResult = await uploadImage(filename, filePath);

    if (!uploadResult) {
      stats.failed++;
      results.push({
        filename,
        skuCode,
        imageType,
        publicUrl: '',
        success: false,
        error: 'Upload failed'
      });
      continue;
    }

    stats.uploaded++;

    // Create database record
    const dbSuccess = await createProductImageRecord(
      skuCode,
      imageType,
      uploadResult.publicUrl
    );

    if (dbSuccess) {
      stats.dbRecordsCreated++;
    }

    results.push({
      filename,
      skuCode,
      imageType,
      publicUrl: uploadResult.publicUrl,
      success: dbSuccess,
      error: dbSuccess ? undefined : 'Database insert failed'
    });

    // Progress indicator
    const progress = ((i + 1) / stats.totalImages * 100).toFixed(1);
    console.log(`📤 [${i + 1}/${stats.totalImages}] (${progress}%) ${filename} -> ${skuCode} (${imageType})`);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Images:        ${stats.totalImages}`);
  console.log(`✅ Uploaded:          ${stats.uploaded}`);
  console.log(`💾 DB Records:        ${stats.dbRecordsCreated}`);
  console.log(`❌ Failed:            ${stats.failed}`);
  console.log(`⏭️  Skipped:           ${stats.skipped}`);
  console.log('='.repeat(80));

  // Print failed uploads
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n❌ FAILED UPLOADS:');
    failures.forEach(f => {
      console.log(`  - ${f.filename}: ${f.error}`);
    });
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../../docs/IMAGE_UPLOAD_REPORT.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    stats,
    results
  }, null, 2));
  console.log(`\n📝 Detailed report saved to: ${reportPath}`);

  return stats;
}

/**
 * Verify bucket exists before upload
 */
async function verifyBucket(): Promise<boolean> {
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Failed to list buckets:', error.message);
    return false;
  }

  const bucketExists = data.some(b => b.name === BUCKET_NAME);

  if (!bucketExists) {
    console.error(`❌ Bucket "${BUCKET_NAME}" does not exist!`);
    console.log('   Create it first using Supabase SQL:');
    console.log(`   INSERT INTO storage.buckets (id, name, public) VALUES ('${BUCKET_NAME}', '${BUCKET_NAME}', true);`);
    return false;
  }

  console.log(`✅ Bucket "${BUCKET_NAME}" verified\n`);
  return true;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Verify prerequisites
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      console.error('❌ Missing Supabase credentials in .env file');
      process.exit(1);
    }

    if (!fs.existsSync(IMAGES_DIR)) {
      console.error(`❌ Images directory not found: ${IMAGES_DIR}`);
      process.exit(1);
    }

    // Verify bucket exists
    const bucketReady = await verifyBucket();
    if (!bucketReady) {
      process.exit(1);
    }

    // Connect to database
    await prisma.$connect();
    console.log('✅ Database connected\n');

    // Upload all images
    const stats = await uploadAllImages();

    // Cleanup
    await prisma.$disconnect();

    // Exit with appropriate code
    process.exit(stats.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { uploadAllImages, verifyBucket };

#!/usr/bin/env npx tsx

import { readFileSync, readdirSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function executeBatch(batchFile: string, batchNum: number, totalBatches: number): Promise<number> {
  const sql = readFileSync(batchFile, 'utf-8');

  try {
    console.log(`Executing batch ${batchNum}/${totalBatches}: ${batchFile}`);

    // Execute the SQL directly
    await prisma.$executeRawUnsafe(sql);

    console.log(`✅ Batch ${batchNum}/${totalBatches} completed successfully`);
    return 0; // No errors
  } catch (error: any) {
    console.error(`❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
    return 1; // Error occurred
  }
}

async function main() {
  console.log('🚀 Starting ProductImage batch execution...\n');

  // Get all batch files sorted
  const batchFiles = readdirSync('/tmp')
    .filter(f => f.startsWith('images-batch-'))
    .sort()
    .map(f => `/tmp/${f}`);

  const totalBatches = batchFiles.length;
  console.log(`Found ${totalBatches} batch files to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  // Execute each batch sequentially
  for (let i = 0; i < batchFiles.length; i++) {
    const errors = await executeBatch(batchFiles[i], i + 1, totalBatches);
    if (errors === 0) {
      successCount++;
    } else {
      errorCount++;
    }

    // Progress report every 5 batches
    if ((i + 1) % 5 === 0) {
      console.log(`\n📊 Progress: ${i + 1}/${totalBatches} batches executed (${successCount} success, ${errorCount} errors)\n`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total batches: ${totalBatches}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);

  // Verify final count
  console.log('\n🔍 Verifying ProductImage records...');
  const count = await prisma.productImage.count({
    where: { tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed' }
  });

  console.log(`\n📸 Total ProductImage records: ${count}`);
  console.log(`Expected: 1,869 records`);
  console.log(count === 1869 ? '✅ Count matches!' : '⚠️  Count mismatch!');

  // Sample records
  console.log('\n📋 Sample ProductImage records:');
  const samples = await prisma.productImage.findMany({
    where: { tenantId: '58b8126a-2d2f-4f55-bc98-5b6784800bed' },
    take: 5,
    select: {
      skuCode: true,
      imageType: true,
      storageUrl: true,
      displayOrder: true
    }
  });

  console.table(samples);

  await prisma.$disconnect();
}

main().catch(console.error);

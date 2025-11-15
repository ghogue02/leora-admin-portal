import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Execute SQL batches directly via Prisma
 * This is more reliable than MCP for large batch operations
 */
async function executeBatches() {
  console.log('🔄 Starting batch execution...\n');

  const scriptsDir = '/Users/greghogue/Leora2/scripts';
  const batchFiles = readdirSync(scriptsDir)
    .filter(f => f.startsWith('batch-') && f.endsWith('.sql'))
    .sort((a, b) => {
      const numA = parseInt(a.match(/batch-(\d+)\.sql/)?.[1] || '0');
      const numB = parseInt(b.match(/batch-(\d+)\.sql/)?.[1] || '0');
      return numA - numB;
    });

  console.log(`📦 Found ${batchFiles.length} batch files to execute\n`);

  let totalUpdated = 0;
  let successfulBatches = 0;
  let failedBatches = 0;

  for (const batchFile of batchFiles) {
    const batchPath = join(scriptsDir, batchFile);
    const batchNumber = batchFile.match(/batch-(\d+)\.sql/)?.[1] || '?';

    try {
      const sql = readFileSync(batchPath, 'utf-8');

      console.log(`⚡ Executing Batch ${batchNumber}/${batchFiles.length}...`);

      // Execute the batch SQL
      await prisma.$executeRawUnsafe(sql);

      successfulBatches++;
      console.log(`✅ Batch ${batchNumber} completed successfully\n`);

    } catch (error: any) {
      failedBatches++;
      console.error(`❌ Batch ${batchNumber} failed:`, error.message);
      console.error(`   File: ${batchFile}\n`);

      // Continue with next batch despite error
      // Log the error but don't stop execution
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 EXECUTION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total batches: ${batchFiles.length}`);
  console.log(`✅ Successful: ${successfulBatches}`);
  console.log(`❌ Failed: ${failedBatches}`);
  console.log('='.repeat(60) + '\n');

  // Now verify the updates by checking some sample products
  console.log('🔍 Verifying sample products...\n');

  const sampleSKUs = ['SPA1072', 'SPA1074', 'ARG1001'];

  for (const skuCode of sampleSKUs) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          skus: {
            some: {
              code: skuCode
            }
          }
        },
        include: {
          skus: {
            where: {
              code: skuCode
            }
          }
        }
      });

      if (product) {
        console.log(`\n📦 ${skuCode}:`);
        console.log(`   Product: ${product.name}`);
        console.log(`   Description: ${product.description?.substring(0, 100)}...`);
      } else {
        console.log(`\n⚠️  ${skuCode}: Not found`);
      }
    } catch (error: any) {
      console.error(`❌ Error checking ${skuCode}:`, error.message);
    }
  }

  // Count total products with descriptions
  console.log('\n📊 Counting products with descriptions...\n');

  try {
    const totalProducts = await prisma.product.count();
    const productsWithDescriptions = await prisma.product.count({
      where: {
        description: {
          not: null,
          not: ''
        }
      }
    });

    const productsWithTestDesc = await prisma.product.count({
      where: {
        OR: [
          { description: { contains: 'test' } },
          { description: { contains: 'Test' } },
          { description: { contains: 'placeholder' } }
        ]
      }
    });

    console.log(`Total products: ${totalProducts}`);
    console.log(`Products with descriptions: ${productsWithDescriptions}`);
    console.log(`Products with "test" descriptions: ${productsWithTestDesc}`);
    console.log(`Percentage with descriptions: ${((productsWithDescriptions / totalProducts) * 100).toFixed(1)}%`);

  } catch (error: any) {
    console.error('❌ Error counting products:', error.message);
  }
}

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');

    await executeBatches();

  } catch (error: any) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Database disconnected');
  }
}

main();

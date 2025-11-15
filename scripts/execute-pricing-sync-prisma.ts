#!/usr/bin/env tsx
/**
 * Execute pricing sync using Prisma's raw SQL execution
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Executing pricing sync to database...\n');

  // Generate fresh SQL
  console.log('📝 Generating SQL statements...');
  execSync('npx tsx /Users/greghogue/Leora2/scripts/generate-pricing-sync-sql.ts > /tmp/pricing-sync-final.sql 2>&1');

  const sqlContent = readFileSync('/tmp/pricing-sync-final.sql', 'utf-8');
  const statements = sqlContent
    .split('\n')
    .filter(line => line.trim().startsWith('INSERT'))
    .map(line => line.trim());

  console.log(`   Generated ${statements.length} INSERT statements\n`);

  // Execute in batches
  const BATCH_SIZE = 100;
  let executed = 0;
  let errors = 0;

  console.log('⚡ Executing SQL in batches...');

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(statements.length / BATCH_SIZE);

    process.stdout.write(`   Batch ${batchNum}/${totalBatches} (${batch.length} statements)... `);

    try {
      // Execute each statement in the batch
      for (const sql of batch) {
        await prisma.$executeRawUnsafe(sql);
        executed++;
      }
      console.log('✅');
    } catch (error) {
      console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
      errors++;
    }
  }

  console.log(`\n📊 Execution Summary:`);
  console.log(`   Total statements: ${statements.length}`);
  console.log(`   Executed successfully: ${executed}`);
  console.log(`   Errors: ${errors}\n`);

  // Verify key SKUs
  console.log('🔍 Verifying key SKUs...');
  const keySkus = await prisma.$queryRaw`
    SELECT
      s.code,
      pl.name as "priceList",
      pli.price
    FROM "PriceListItem" pli
    JOIN "SKU" s ON s.id = pli."skuId"
    JOIN "PriceList" pl ON pl.id = pli."priceListId"
    WHERE s.code IN ('ITA1140', 'SPA1074', 'CAL1004')
      AND s."tenantId" = '123e4567-e89b-12d3-a456-426614174000'
    ORDER BY s.code, pl.name
  `;
  console.table(keySkus);

  // Get price list counts
  console.log('\n📊 Price list item counts:');
  const counts = await prisma.$queryRaw`
    SELECT
      pl.name,
      COUNT(*)::int as "itemCount"
    FROM "PriceListItem" pli
    JOIN "PriceList" pl ON pl.id = pli."priceListId"
    WHERE pl."tenantId" = '123e4567-e89b-12d3-a456-426614174000'
    GROUP BY pl.name
    ORDER BY pl.name
  `;
  console.table(counts);

  console.log('\n✅ Pricing sync completed!\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

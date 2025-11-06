#!/usr/bin/env tsx

/**
 * Upload Enrichment via Direct SQL (psql)
 *
 * Since Prisma has connection issues but psql works,
 * this generates SQL UPDATE statements and executes them directly.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const dataPath = resolve(__dirname, '../data/real-products-enriched.json');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

console.log('🍷 Uploading Enrichment via Direct SQL\n');
console.log('═'.repeat(80));
console.log(`📊 Processing ${data.length} products\n`);

// Generate SQL UPDATE statements in batches
const batchSize = 100;
let totalSuccess = 0;
let totalErrors = 0;

for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, Math.min(i + batchSize, data.length));

  // Build SQL for this batch
  const sqlStatements = batch.map((item: any) => {
    const desc = item.enrichment.description.replace(/'/g, "''");
    const tastingNotes = JSON.stringify(item.enrichment.tastingNotes).replace(/'/g, "''");
    const foodPairings = JSON.stringify(item.enrichment.foodPairings).replace(/'/g, "''");
    const servingInfo = JSON.stringify(item.enrichment.servingInfo).replace(/'/g, "''");
    const wineDetails = JSON.stringify(item.enrichment.wineDetails).replace(/'/g, "''");

    return `UPDATE "Product" SET
      description = '${desc}',
      "tastingNotes" = '${tastingNotes}'::jsonb,
      "foodPairings" = '${foodPairings}'::jsonb,
      "servingInfo" = '${servingInfo}'::jsonb,
      "wineDetails" = '${wineDetails}'::jsonb,
      "enrichedAt" = NOW(),
      "enrichedBy" = 'claude-code'
    WHERE id = '${item.productId}'::uuid;`;
  }).join('\n\n');

  // Write to temp file
  const sqlFile = '/tmp/batch_update.sql';
  writeFileSync(sqlFile, sqlStatements);

  // Execute via psql
  try {
    execSync(
      `npx dotenv-cli -e .env.local -- bash -c 'psql "$DATABASE_URL" -f ${sqlFile} -q'`,
      { cwd: resolve(__dirname, '..'), stdio: 'pipe' }
    );

    totalSuccess += batch.length;
    const progress = Math.min((i + batchSize) / data.length * 100, 100).toFixed(1);
    console.log(`   [${Math.min(i + batchSize, data.length)}/${data.length}] ${progress}% - Batch uploaded ✅`);
  } catch (error) {
    totalErrors += batch.length;
    console.error(`   ❌ Batch ${i / batchSize + 1} failed`);
  }
}

console.log('\n' + '═'.repeat(80));
console.log('\n📊 UPLOAD SUMMARY');
console.log(`✅ Successful: ~${totalSuccess}/${data.length}`);
console.log(`❌ Errors: ~${totalErrors}/${data.length}`);
console.log('\n✅ Enrichment upload complete!');
console.log('═'.repeat(80));
console.log();

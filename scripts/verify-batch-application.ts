import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

interface VerificationResult {
  batchNumber: number;
  totalWinesInFile: number;
  appliedToDatabase: number;
  missingFromDatabase: number;
  wineNames: string[];
  missingWines: string[];
}

async function verifyBatchApplication() {
  console.log(`\n🔍 BATCH APPLICATION VERIFICATION`);
  console.log(`================================\n`);

  const results: VerificationResult[] = [];
  const missingBatches: number[] = [];
  let totalFilesChecked = 0;
  let totalWinesInFiles = 0;
  let totalApplied = 0;
  let totalMissing = 0;

  // Check batches 1-77
  for (let batchNum = 1; batchNum <= 77; batchNum++) {
    const filePath = resolve(__dirname, `../data/wine-research-results-batch-${batchNum}.json`);

    if (!existsSync(filePath)) {
      console.log(`⚠️  Batch ${batchNum}: File not found, skipping`);
      continue;
    }

    totalFilesChecked++;

    let batchData: any[];
    let wineNames: string[];

    try {
      const rawData = JSON.parse(readFileSync(filePath, 'utf-8'));
      // Handle both array format and object format with wines property
      batchData = Array.isArray(rawData) ? rawData : (rawData.wines || []);
      wineNames = batchData.map((w: any) => w.productName);
    } catch (error) {
      console.log(`❌ Batch ${batchNum}: Invalid JSON format - ${error}`);
      continue;
    }

    console.log(`Checking Batch ${batchNum}: ${wineNames.length} wines...`);

    // Check which wines from this batch are in the database with enrichment
    const enrichedProducts = await prisma.product.findMany({
      where: {
        name: { in: wineNames },
        enrichedAt: { not: null }
      },
      select: { name: true }
    });

    const enrichedNames = new Set(enrichedProducts.map(p => p.name));
    const missingWines = wineNames.filter((name: string) => !enrichedNames.has(name));

    const result: VerificationResult = {
      batchNumber: batchNum,
      totalWinesInFile: wineNames.length,
      appliedToDatabase: enrichedProducts.length,
      missingFromDatabase: missingWines.length,
      wineNames,
      missingWines
    };

    results.push(result);
    totalWinesInFiles += wineNames.length;
    totalApplied += enrichedProducts.length;
    totalMissing += missingWines.length;

    if (missingWines.length > 0) {
      missingBatches.push(batchNum);
      console.log(`  ⚠️  ${missingWines.length} wines missing from database`);
    } else {
      console.log(`  ✅ All wines applied`);
    }
  }

  // Generate report
  const reportLines = [
    '# Batch Verification Report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    `- Total batch files checked: ${totalFilesChecked}`,
    `- Total wines in files: ${totalWinesInFiles}`,
    `- Total wines applied to database: ${totalApplied}`,
    `- Total wines missing from database: ${totalMissing}`,
    `- Application rate: ${((totalApplied / totalWinesInFiles) * 100).toFixed(2)}%`,
    '',
    '## Missing Batches',
    missingBatches.length > 0
      ? `Batches with missing data: ${missingBatches.join(', ')}`
      : 'All batches fully applied ✅',
    '',
    '## Detailed Results',
    ''
  ];

  for (const result of results) {
    reportLines.push(`### Batch ${result.batchNumber}`);
    reportLines.push(`- Wines in file: ${result.totalWinesInFile}`);
    reportLines.push(`- Applied to DB: ${result.appliedToDatabase}`);
    reportLines.push(`- Missing from DB: ${result.missingFromDatabase}`);

    if (result.missingWines.length > 0) {
      reportLines.push('- Missing wines:');
      result.missingWines.forEach(name => {
        reportLines.push(`  - ${name}`);
      });
    }
    reportLines.push('');
  }

  // Write report
  const reportPath = resolve(__dirname, '../docs/batch-verification-report.md');
  writeFileSync(reportPath, reportLines.join('\n'));

  // Write missing batches JSON for reapplication script
  const missingDataPath = resolve(__dirname, '../data/missing-batches.json');
  writeFileSync(missingDataPath, JSON.stringify({
    missingBatches,
    totalMissing,
    verifiedAt: new Date().toISOString()
  }, null, 2));

  console.log(`\n\n📊 VERIFICATION COMPLETE`);
  console.log(`=======================`);
  console.log(`Files checked: ${totalFilesChecked}`);
  console.log(`Wines in files: ${totalWinesInFiles}`);
  console.log(`Applied to DB: ${totalApplied}`);
  console.log(`Missing from DB: ${totalMissing}`);
  console.log(`\nReport saved to: ${reportPath}`);
  console.log(`Missing batches: ${missingDataPath}`);

  if (missingBatches.length > 0) {
    console.log(`\n⚠️  BATCHES NEEDING REAPPLICATION: ${missingBatches.join(', ')}`);
  } else {
    console.log(`\n✅ ALL BATCHES FULLY APPLIED!`);
  }

  await prisma.$disconnect();
}

verifyBatchApplication().catch(console.error);

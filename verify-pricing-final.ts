import * as fs from 'fs';

// Read the verification data
const verificationData = JSON.parse(fs.readFileSync('pricing-verification-data.json', 'utf-8'));

// Database results will be pasted here
const dbResults = [
  // Results from SQL query
];

interface ComparisonResult {
  sku: string;
  status: 'MATCH' | 'MISMATCH' | 'MISSING';
  details: {
    priceList: string;
    csvPrice: number | null;
    dbPrice: number | null;
    match: boolean;
  }[];
}

function parseDBPrice(price: any): number | null {
  if (price === null || price === undefined) return null;
  const parsed = parseFloat(price.toString());
  return isNaN(parsed) ? null : parsed;
}

function comparePrices(csvPrice: number | null, dbPrice: number | null): boolean {
  if (csvPrice === null && dbPrice === null) return true;
  if (csvPrice === null || dbPrice === null) return false;
  return Math.abs(csvPrice - dbPrice) < 0.01;
}

function generateReport(dbResultsInput: any[]) {
  console.log('🔍 Pricing Sync Verification Report\n');
  console.log('='.repeat(80));

  const results: ComparisonResult[] = [];
  let totalComparisons = 0;
  let matches = 0;
  let mismatches = 0;
  let missing = 0;

  // Create a map of DB results
  const dbMap = new Map(dbResultsInput.map(r => [r.sku, r]));

  for (const skuData of verificationData.skus) {
    const dbRow = dbMap.get(skuData.sku);

    if (!dbRow) {
      console.log(`\n⚠️  SKU ${skuData.sku} - NOT FOUND IN DATABASE`);
      results.push({
        sku: skuData.sku,
        status: 'MISSING',
        details: [],
      });
      missing++;
      continue;
    }

    console.log(`\n📦 SKU: ${skuData.sku}`);
    const details: ComparisonResult['details'] = [];
    let skuHasMismatch = false;

    const priceListChecks = [
      { key: 'Well Crafted Wholesale 2025', csvPrice: skuData.expectedPrices['Well Crafted Wholesale 2025'], dbPrice: parseDBPrice(dbRow['Well Crafted Wholesale 2025']) },
      { key: 'VA, MD, DC wholesale', csvPrice: skuData.expectedPrices['VA, MD, DC wholesale'], dbPrice: parseDBPrice(dbRow['VA, MD, DC wholesale']) },
      { key: 'Custom S&V Group', csvPrice: skuData.expectedPrices['Custom S&V Group'], dbPrice: parseDBPrice(dbRow['Custom S&V Group']) },
      { key: 'DLC', csvPrice: skuData.expectedPrices['DLC'], dbPrice: parseDBPrice(dbRow['DLC']) },
    ];

    for (const check of priceListChecks) {
      const match = comparePrices(check.csvPrice, check.dbPrice);
      totalComparisons++;

      if (match) {
        matches++;
      } else {
        mismatches++;
        skuHasMismatch = true;
      }

      details.push({
        priceList: check.key,
        csvPrice: check.csvPrice,
        dbPrice: check.dbPrice,
        match,
      });

      const statusIcon = match ? '✅' : '❌';
      const csvDisplay = check.csvPrice !== null ? `$${check.csvPrice.toFixed(2)}` : 'null';
      const dbDisplay = check.dbPrice !== null ? `$${check.dbPrice.toFixed(2)}` : 'null';
      console.log(`   ${statusIcon} ${check.key}: CSV=${csvDisplay}, DB=${dbDisplay}`);
    }

    results.push({
      sku: skuData.sku,
      status: skuHasMismatch ? 'MISMATCH' : 'MATCH',
      details,
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 VERIFICATION SUMMARY\n');
  console.log(`Total SKUs Tested: ${verificationData.totalSkus}`);
  console.log(`Total Price Comparisons: ${totalComparisons}`);
  console.log(`\n✅ Matches: ${matches} (${((matches / totalComparisons) * 100).toFixed(2)}%)`);
  console.log(`❌ Mismatches: ${mismatches} (${((mismatches / totalComparisons) * 100).toFixed(2)}%)`);
  console.log(`⚠️  Missing SKUs: ${missing} (${((missing / verificationData.totalSkus) * 100).toFixed(2)}%)`);
  console.log(`\n🎯 Overall Accuracy: ${((matches / totalComparisons) * 100).toFixed(2)}%`);

  // Detailed mismatch report
  const mismatchResults = results.filter(r => r.status === 'MISMATCH');
  if (mismatchResults.length > 0) {
    console.log('\n\n🔍 DETAILED MISMATCH REPORT\n');
    console.log('='.repeat(80));

    for (const result of mismatchResults) {
      console.log(`\nSKU: ${result.sku}`);
      for (const detail of result.details) {
        if (!detail.match) {
          const csvDisplay = detail.csvPrice !== null ? `$${detail.csvPrice.toFixed(2)}` : 'null';
          const dbDisplay = detail.dbPrice !== null ? `$${detail.dbPrice.toFixed(2)}` : 'null';
          console.log(`  ❌ ${detail.priceList}:`);
          console.log(`     CSV: ${csvDisplay}`);
          console.log(`     DB:  ${dbDisplay}`);

          if (detail.csvPrice !== null && detail.dbPrice !== null) {
            const diff = detail.csvPrice - detail.dbPrice;
            console.log(`     Difference: $${diff.toFixed(2)}`);
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(80));
}

// Export the function so it can be called with DB results
if (require.main === module) {
  console.log('Please run this with database results.');
  console.log('Use the SQL query to fetch data, then call generateReport(dbResults)');
}

export { generateReport };

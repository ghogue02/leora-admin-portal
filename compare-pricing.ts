import * as fs from 'fs';

const verificationData = JSON.parse(fs.readFileSync('pricing-verification-data.json', 'utf-8'));

const dbResults = [{"sku":"CAL1218","Well Crafted Wholesale 2025":"23.33","VA, MD, DC wholesale":null,"Custom S&V Group":null,"DLC":null},{"sku":"CAL1247","Well Crafted Wholesale 2025":"6.67","VA, MD, DC wholesale":"6.33","Custom S&V Group":null,"DLC":null},{"sku":"CAL1255","Well Crafted Wholesale 2025":"59.99","VA, MD, DC wholesale":"59.99","Custom S&V Group":"59.99","DLC":null},{"sku":"CAL1320","Well Crafted Wholesale 2025":"4.66","VA, MD, DC wholesale":"4.66","Custom S&V Group":null,"DLC":null},{"sku":"CAL1368","Well Crafted Wholesale 2025":"39.99","VA, MD, DC wholesale":"36.67","Custom S&V Group":"34.00","DLC":null},{"sku":"CAL1370","Well Crafted Wholesale 2025":"70.00","VA, MD, DC wholesale":"70.00","Custom S&V Group":"70.00","DLC":"60.00"},{"sku":"CAL1371","Well Crafted Wholesale 2025":"80.00","VA, MD, DC wholesale":"80.00","Custom S&V Group":"80.00","DLC":"72.00"},{"sku":"CAL1372","Well Crafted Wholesale 2025":"156.66","VA, MD, DC wholesale":null,"Custom S&V Group":null,"DLC":null},{"sku":"CHL1023","Well Crafted Wholesale 2025":"9.99","VA, MD, DC wholesale":"9.66","Custom S&V Group":null,"DLC":null},{"sku":"FRA1079","Well Crafted Wholesale 2025":"10.67","VA, MD, DC wholesale":"10.33","Custom S&V Group":"10.33","DLC":null},{"sku":"FRA1113","Well Crafted Wholesale 2025":"47.33","VA, MD, DC wholesale":null,"Custom S&V Group":null,"DLC":"45.33"},{"sku":"ITA1006","Well Crafted Wholesale 2025":"7.99","VA, MD, DC wholesale":"7.33","Custom S&V Group":"6.33","DLC":"6.00"},{"sku":"ITA1018","Well Crafted Wholesale 2025":"9.99","VA, MD, DC wholesale":"9.33","Custom S&V Group":"9.00","DLC":"9.00"},{"sku":"ITA1094","Well Crafted Wholesale 2025":"9.99","VA, MD, DC wholesale":"9.66","Custom S&V Group":null,"DLC":null},{"sku":"ITA1119","Well Crafted Wholesale 2025":"9.99","VA, MD, DC wholesale":"9.49","Custom S&V Group":null,"DLC":null},{"sku":"ITA1130","Well Crafted Wholesale 2025":"12.25","VA, MD, DC wholesale":"12.25","Custom S&V Group":null,"DLC":null},{"sku":"ITA1138","Well Crafted Wholesale 2025":"14.66","VA, MD, DC wholesale":"13.33","Custom S&V Group":null,"DLC":null},{"sku":"ITA1145","Well Crafted Wholesale 2025":"23.33","VA, MD, DC wholesale":"22.66","Custom S&V Group":"22.66","DLC":null},{"sku":"NON1006","Well Crafted Wholesale 2025":"17.33","VA, MD, DC wholesale":"16.67","Custom S&V Group":null,"DLC":null},{"sku":"NON1011","Well Crafted Wholesale 2025":"16.67","VA, MD, DC wholesale":"15.99","Custom S&V Group":null,"DLC":null},{"sku":"NON1022","Well Crafted Wholesale 2025":"23.33","VA, MD, DC wholesale":"22.33","Custom S&V Group":"23.33","DLC":"21.33"},{"sku":"NON1026","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"13.33","Custom S&V Group":"13.33","DLC":null},{"sku":"NON1036","Well Crafted Wholesale 2025":"2.92","VA, MD, DC wholesale":"2.67","Custom S&V Group":null,"DLC":"2.50"},{"sku":"NWZ1001","Well Crafted Wholesale 2025":"10.67","VA, MD, DC wholesale":"9.99","Custom S&V Group":"9.66","DLC":"9.49"},{"sku":"NWZ1009","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":null,"DLC":null},{"sku":"NWZ1020","Well Crafted Wholesale 2025":"39.99","VA, MD, DC wholesale":"39.99","Custom S&V Group":null,"DLC":null},{"sku":"NYS1009","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":"12.00","DLC":null},{"sku":"ORO1011","Well Crafted Wholesale 2025":"2.99","VA, MD, DC wholesale":null,"Custom S&V Group":null,"DLC":null},{"sku":"ORO1026","Well Crafted Wholesale 2025":"14.33","VA, MD, DC wholesale":"13.33","Custom S&V Group":null,"DLC":null},{"sku":"ORO1033","Well Crafted Wholesale 2025":"22.00","VA, MD, DC wholesale":"22.00","Custom S&V Group":null,"DLC":null},{"sku":"ORO1051","Well Crafted Wholesale 2025":"16.67","VA, MD, DC wholesale":"16.67","Custom S&V Group":"15.00","DLC":"15.50"},{"sku":"ORO1057","Well Crafted Wholesale 2025":"29.99","VA, MD, DC wholesale":null,"Custom S&V Group":null,"DLC":null},{"sku":"POR1031","Well Crafted Wholesale 2025":"25.00","VA, MD, DC wholesale":"23.33","Custom S&V Group":"24.00","DLC":"22.33"},{"sku":"POR1032","Well Crafted Wholesale 2025":"9.99","VA, MD, DC wholesale":"9.66","Custom S&V Group":"5.66","DLC":"6.67"},{"sku":"SAF1061","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":"12.00","DLC":null},{"sku":"SAF1067","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":null,"DLC":null},{"sku":"SAF1085","Well Crafted Wholesale 2025":"11.99","VA, MD, DC wholesale":"11.33","Custom S&V Group":"11.33","DLC":null},{"sku":"SAF1088","Well Crafted Wholesale 2025":"10.67","VA, MD, DC wholesale":"9.99","Custom S&V Group":"9.99","DLC":null},{"sku":"SAF1090","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":"12.66","DLC":null},{"sku":"SAF1096","Well Crafted Wholesale 2025":"23.33","VA, MD, DC wholesale":"21.33","Custom S&V Group":"21.33","DLC":"21.33"},{"sku":"SAF1109","Well Crafted Wholesale 2025":"18.66","VA, MD, DC wholesale":"17.99","Custom S&V Group":null,"DLC":null},{"sku":"SAF1110","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.99","Custom S&V Group":"11.50","DLC":null},{"sku":"SAF1112","Well Crafted Wholesale 2025":"14.66","VA, MD, DC wholesale":"13.99","Custom S&V Group":"12.50","DLC":null},{"sku":"SPA1001","Well Crafted Wholesale 2025":"17.33","VA, MD, DC wholesale":"16.67","Custom S&V Group":"13.00","DLC":null},{"sku":"SPA1076","Well Crafted Wholesale 2025":"43.33","VA, MD, DC wholesale":"43.33","Custom S&V Group":"43.33","DLC":null},{"sku":"SPA1080","Well Crafted Wholesale 2025":"6.67","VA, MD, DC wholesale":"5.99","Custom S&V Group":null,"DLC":null},{"sku":"SPA1097","Well Crafted Wholesale 2025":"33.33","VA, MD, DC wholesale":"49.99","Custom S&V Group":null,"DLC":"25.00"},{"sku":"SPA1334","Well Crafted Wholesale 2025":"13.33","VA, MD, DC wholesale":"12.66","Custom S&V Group":"12.00","DLC":"12.00"},{"sku":"UKR1006","Well Crafted Wholesale 2025":"17.33","VA, MD, DC wholesale":"17.33","Custom S&V Group":"15.50","DLC":"17.33"},{"sku":"WAS1005","Well Crafted Wholesale 2025":"14.67","VA, MD, DC wholesale":"13.99","Custom S&V Group":"12.00","DLC":null}];

function parsePrice(price: any): number | null {
  if (price === null || price === undefined) return null;
  const parsed = parseFloat(price.toString());
  return isNaN(parsed) ? null : parsed;
}

function comparePrices(csvPrice: number | null, dbPrice: number | null): boolean {
  if (csvPrice === null && dbPrice === null) return true;
  if (csvPrice === null || dbPrice === null) return false;
  return Math.abs(csvPrice - dbPrice) < 0.01;
}

console.log('🔍 Pricing Sync Verification Report\n');
console.log('='.repeat(80));

const dbMap = new Map(dbResults.map(r => [r.sku, r]));

let totalComparisons = 0;
let matches = 0;
let mismatches = 0;
let missing = 0;

const mismatchDetails: any[] = [];

for (const skuData of verificationData.skus) {
  const dbRow = dbMap.get(skuData.sku);

  if (!dbRow) {
    console.log(`\n⚠️  SKU ${skuData.sku} - NOT FOUND IN DATABASE`);
    missing++;
    continue;
  }

  const priceListChecks = [
    { key: 'Well Crafted Wholesale 2025', csvPrice: skuData.expectedPrices['Well Crafted Wholesale 2025'], dbPrice: parsePrice(dbRow['Well Crafted Wholesale 2025']) },
    { key: 'VA, MD, DC wholesale', csvPrice: skuData.expectedPrices['VA, MD, DC wholesale'], dbPrice: parsePrice(dbRow['VA, MD, DC wholesale']) },
    { key: 'Custom S&V Group', csvPrice: skuData.expectedPrices['Custom S&V Group'], dbPrice: parsePrice(dbRow['Custom S&V Group']) },
    { key: 'DLC', csvPrice: skuData.expectedPrices['DLC'], dbPrice: parsePrice(dbRow['DLC']) },
  ];

  let skuHasMismatch = false;
  const skuMismatches: any[] = [];

  for (const check of priceListChecks) {
    const match = comparePrices(check.csvPrice, check.dbPrice);
    totalComparisons++;

    if (match) {
      matches++;
    } else {
      mismatches++;
      skuHasMismatch = true;
      skuMismatches.push(check);
    }
  }

  if (skuHasMismatch) {
    mismatchDetails.push({ sku: skuData.sku, mismatches: skuMismatches });
  }
}

console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`Total SKUs Tested: ${verificationData.totalSkus}`);
console.log(`Total Price Comparisons: ${totalComparisons}`);
console.log(`\n✅ Matches: ${matches} (${((matches / totalComparisons) * 100).toFixed(2)}%)`);
console.log(`❌ Mismatches: ${mismatches} (${((mismatches / totalComparisons) * 100).toFixed(2)}%)`);
console.log(`⚠️  Missing SKUs: ${missing} (${((missing / verificationData.totalSkus) * 100).toFixed(2)}%)`);
console.log(`\n🎯 Overall Accuracy: ${((matches / totalComparisons) * 100).toFixed(2)}%`);

if (mismatchDetails.length > 0) {
  console.log('\n\n🔍 DETAILED MISMATCH REPORT\n');
  console.log('='.repeat(80));

  for (const detail of mismatchDetails) {
    console.log(`\nSKU: ${detail.sku}`);
    for (const mismatch of detail.mismatches) {
      const csvDisplay = mismatch.csvPrice !== null ? `$${mismatch.csvPrice.toFixed(2)}` : 'null';
      const dbDisplay = mismatch.dbPrice !== null ? `$${mismatch.dbPrice.toFixed(2)}` : 'null';
      console.log(`  ❌ ${mismatch.key}:`);
      console.log(`     CSV: ${csvDisplay}`);
      console.log(`     DB:  ${dbDisplay}`);

      if (mismatch.csvPrice !== null && mismatch.dbPrice !== null) {
        const diff = mismatch.csvPrice - mismatch.dbPrice;
        console.log(`     Difference: $${diff.toFixed(2)}`);
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Verification complete!\n');

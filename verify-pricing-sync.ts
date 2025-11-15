import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Use direct connection (port 5432) instead of pgbouncer (6543)
const directUrl = process.env.DATABASE_URL?.replace(':6543', ':5432').replace('pgbouncer=true', 'pgbouncer=false');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl,
    },
  },
});

const TENANT_ID = '410544b2-4001-4271-9855-fec4b6a6442a';

// Price List Mappings
const PRICE_LIST_IDS = {
  'Well Crafted Wholesale 2025': 'd8ad22e0-c069-493b-a23a-a0ad84af7079',
  'VA, MD, DC wholesale': 'df99bbaf-2253-4421-affb-93da669a6763',
  'Custom S&V Group': '3e6c13eb-5328-4015-8613-c99bcd1433ec',
  'DLC': 'cd64f651-c699-4013-8d47-0f2cc75dc215',
};

interface CSVRow {
  sku: string;
  frontlinePrice: string;
  discountPrice: string;
  btgPrice: string;
  specialPrice: string;
}

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

function parseCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Parse header to find column indices
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const skuIdx = header.indexOf('SKU');
  const frontlineIdx = header.indexOf('Frontline WCB Price');
  const discountIdx = header.indexOf('Discount WCB Price');
  const btgIdx = header.indexOf('BTG- On Premise Only');
  const specialIdx = header.indexOf('Special Pricing 1');

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    // Parse CSV with proper quote handling
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length > skuIdx && values[skuIdx]) {
      rows.push({
        sku: values[skuIdx].replace(/^"|"$/g, '').trim(),
        frontlinePrice: values[frontlineIdx]?.replace(/^"|"$/g, '').trim() || '',
        discountPrice: values[discountIdx]?.replace(/^"|"$/g, '').trim() || '',
        btgPrice: values[btgIdx]?.replace(/^"|"$/g, '').trim() || '',
        specialPrice: values[specialIdx]?.replace(/^"|"$/g, '').trim() || '',
      });
    }
  }

  return rows;
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr || priceStr === 'N/A' || priceStr === '') return null;
  const cleaned = priceStr.replace(/[$,]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function selectRandomSample<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

async function verifyPricingSync() {
  console.log('🔍 Pricing Sync Verification\n');
  console.log('=' .repeat(80));

  // Read CSV
  const csvPath = '/Users/greghogue/Leora2/Pricing Single Source - Pricing Single Source.csv';
  console.log(`\n📄 Reading CSV: ${csvPath}`);
  const allRows = parseCSV(csvPath);
  console.log(`   Found ${allRows.length} SKUs in CSV`);

  // Select 50 random SKUs
  const sampleRows = selectRandomSample(allRows, 50);
  console.log(`   Selected ${sampleRows.length} random SKUs for verification\n`);

  const results: ComparisonResult[] = [];
  let totalComparisons = 0;
  let matches = 0;
  let mismatches = 0;
  let missing = 0;

  for (const row of sampleRows) {
    console.log(`\n📦 Verifying SKU: ${row.sku}`);

    // Get SKU from database
    const sku = await prisma.sku.findUnique({
      where: {
        tenantId_code: {
          tenantId: TENANT_ID,
          code: row.sku,
        },
      },
      include: {
        skuPriceLists: {
          include: {
            priceList: true,
          },
        },
      },
    });

    if (!sku) {
      console.log(`   ⚠️  SKU not found in database`);
      results.push({
        sku: row.sku,
        status: 'MISSING',
        details: [],
      });
      missing++;
      continue;
    }

    const details: ComparisonResult['details'] = [];
    let skuHasMismatch = false;

    // Check each price list
    const priceChecks = [
      { csvField: row.frontlinePrice, listName: 'Well Crafted Wholesale 2025' },
      { csvField: row.discountPrice, listName: 'VA, MD, DC wholesale' },
      { csvField: row.btgPrice, listName: 'Custom S&V Group' },
      { csvField: row.specialPrice, listName: 'DLC' },
    ];

    for (const check of priceChecks) {
      const csvPrice = parsePrice(check.csvField);
      const priceListId = PRICE_LIST_IDS[check.listName as keyof typeof PRICE_LIST_IDS];

      const skuPriceList = sku.skuPriceLists.find(spl => spl.priceListId === priceListId);
      const dbPrice = skuPriceList?.price ? parseFloat(skuPriceList.price.toString()) : null;

      const match = (csvPrice === null && dbPrice === null) ||
                   (csvPrice !== null && dbPrice !== null && Math.abs(csvPrice - dbPrice) < 0.01);

      totalComparisons++;
      if (match) {
        matches++;
      } else {
        mismatches++;
        skuHasMismatch = true;
      }

      details.push({
        priceList: check.listName,
        csvPrice,
        dbPrice,
        match,
      });

      const statusIcon = match ? '✅' : '❌';
      const csvDisplay = csvPrice !== null ? `$${csvPrice.toFixed(2)}` : 'null';
      const dbDisplay = dbPrice !== null ? `$${dbPrice.toFixed(2)}` : 'null';
      console.log(`   ${statusIcon} ${check.listName}: CSV=${csvDisplay}, DB=${dbDisplay}`);
    }

    results.push({
      sku: row.sku,
      status: skuHasMismatch ? 'MISMATCH' : 'MATCH',
      details,
    });
  }

  // Generate report
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 VERIFICATION REPORT\n');
  console.log(`Total SKUs Tested: ${sampleRows.length}`);
  console.log(`Total Price Comparisons: ${totalComparisons}`);
  console.log(`\n✅ Matches: ${matches} (${((matches / totalComparisons) * 100).toFixed(2)}%)`);
  console.log(`❌ Mismatches: ${mismatches} (${((mismatches / totalComparisons) * 100).toFixed(2)}%)`);
  console.log(`⚠️  Missing SKUs: ${missing} (${((missing / sampleRows.length) * 100).toFixed(2)}%)`);
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

  // Missing SKUs report
  const missingResults = results.filter(r => r.status === 'MISSING');
  if (missingResults.length > 0) {
    console.log('\n\n⚠️  MISSING SKUs\n');
    console.log('='.repeat(80));
    for (const result of missingResults) {
      console.log(`  ${result.sku}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Verification complete!\n');

  await prisma.$disconnect();
}

verifyPricingSync().catch((error) => {
  console.error('❌ Error during verification:', error);
  prisma.$disconnect();
  process.exit(1);
});

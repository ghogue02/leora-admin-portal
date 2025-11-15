import * as fs from 'fs';

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

async function main() {
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

  // Export the SKU list and price expectations
  const output = {
    totalSkus: sampleRows.length,
    skus: sampleRows.map(row => ({
      sku: row.sku,
      expectedPrices: {
        'Well Crafted Wholesale 2025': parsePrice(row.frontlinePrice),
        'VA, MD, DC wholesale': parsePrice(row.discountPrice),
        'Custom S&V Group': parsePrice(row.btgPrice),
        'DLC': parsePrice(row.specialPrice),
      },
    })),
    priceListIds: PRICE_LIST_IDS,
    tenantId: TENANT_ID,
  };

  fs.writeFileSync('pricing-verification-data.json', JSON.stringify(output, null, 2));
  console.log('✅ Exported verification data to pricing-verification-data.json');
  console.log('\nYou can now use MCP tools to query the database and compare.');
}

main();

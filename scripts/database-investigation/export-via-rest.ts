#!/usr/bin/env tsx

/**
 * Well Crafted Database Export using Supabase REST API
 */

import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const SERVICE_KEY = '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>';
const EXPECTED_ORDERLINES = 7774;

async function fetchTable(tableName: string): Promise<any[]> {
  console.log(`\n📊 Exporting ${tableName}...`);

  const allRecords: any[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=${limit}&offset=${offset}`;

    const response = await fetch(url, {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'X-Client-Info': 'supabase-js/2.39.0',
        'Prefer': 'return=representation'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();

    if (data.length === 0) break;

    allRecords.push(...data);
    console.log(`  ✓ Fetched ${data.length} (total: ${allRecords.length})`);
    offset += data.length;

    if (data.length < limit) break;
  }

  console.log(`✅ ${tableName}: ${allRecords.length} records`);
  return allRecords;
}

async function main() {
  console.log('🚀 Well Crafted Export\n');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const exportDir = `/Users/greghogue/Leora2/exports/wellcrafted-complete-${timestamp}`;

  fs.mkdirSync(exportDir, { recursive: true });

  const tables = ['Customer', 'Product', 'Sku', 'Order', 'OrderLine'];

  for (const table of tables) {
    const data = await fetchTable(table);
    const file = path.join(exportDir, `${table.toLowerCase()}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`💾 Saved: ${file}`);

    if (table === 'OrderLine' && data.length !== EXPECTED_ORDERLINES) {
      console.log(`\n❌ OrderLine count mismatch! Expected ${EXPECTED_ORDERLINES}, got ${data.length}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ VERIFIED: ${EXPECTED_ORDERLINES} OrderLines exported`);
  console.log(`📂 ${exportDir}\n`);
}

main().catch(console.error);

#!/usr/bin/env tsx
/**
 * Database Connection & Verification Script
 * Connects to both Well Crafted and Lovable databases
 */

import { createClient } from '@supabase/supabase-js';

// Well Crafted Database (Legacy Source)
const wellCrafted = createClient(
  'https://zqezunzlyjkseugujkrl.supabase.co',
  '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>'
);

// Lovable Database (Primary/Production)
const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

interface DatabaseInfo {
  name: string;
  tables: {
    name: string;
    count: number;
  }[];
  connected: boolean;
  error?: string;
}

async function getTableCounts(client: any, tables: string[]): Promise<{ name: string; count: number }[]> {
  const results = [];

  for (const table of tables) {
    try {
      const { count, error } = await client
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`Error querying ${table}:`, error.message);
        results.push({ name: table, count: -1 });
      } else {
        results.push({ name: table, count: count || 0 });
      }
    } catch (err) {
      console.error(`Exception querying ${table}:`, err);
      results.push({ name: table, count: -1 });
    }
  }

  return results;
}

async function verifyDatabase(client: any, name: string, tables: string[]): Promise<DatabaseInfo> {
  console.log(`\n🔍 Verifying ${name} database...`);

  try {
    const tableCounts = await getTableCounts(client, tables);

    console.log(`✅ ${name} connected successfully`);
    tableCounts.forEach(t => {
      if (t.count >= 0) {
        console.log(`   ${t.name}: ${t.count.toLocaleString()} records`);
      } else {
        console.log(`   ${t.name}: ❌ ERROR`);
      }
    });

    return {
      name,
      tables: tableCounts,
      connected: true
    };
  } catch (error) {
    console.error(`❌ ${name} connection failed:`, error);
    return {
      name,
      tables: [],
      connected: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🚀 Database Connection Verification\n');
  console.log('=' .repeat(60));

  // Well Crafted tables (PascalCase)
  const wellCraftedTables = [
    'Customer',
    'Order',
    'OrderLine',
    'Sku',
    'Product',
    'Tenant',
    'Invoice',
    'SupplierInvoice'
  ];

  // Lovable tables (lowercase)
  const lovableTables = [
    'customer',
    'order',
    'orderline',
    'skus',
    'product',
    'invoice'
  ];

  const wcInfo = await verifyDatabase(wellCrafted, 'Well Crafted (Legacy)', wellCraftedTables);
  const lovableInfo = await verifyDatabase(lovable, 'Lovable (Production)', lovableTables);

  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');

  console.log(`Well Crafted: ${wcInfo.connected ? '✅ Connected' : '❌ Failed'}`);
  if (wcInfo.connected) {
    const total = wcInfo.tables.reduce((sum, t) => sum + Math.max(0, t.count), 0);
    console.log(`  Total records: ${total.toLocaleString()}`);
  }

  console.log(`\nLovable: ${lovableInfo.connected ? '✅ Connected' : '❌ Failed'}`);
  if (lovableInfo.connected) {
    const total = lovableInfo.tables.reduce((sum, t) => sum + Math.max(0, t.count), 0);
    console.log(`  Total records: ${total.toLocaleString()}`);
  }

  return { wellCrafted: wcInfo, lovable: lovableInfo };
}

main()
  .then(result => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

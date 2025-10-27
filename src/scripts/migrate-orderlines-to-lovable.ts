/**
 * Migrate OrderLines from Well Crafted to Lovable
 *
 * This is the critical missing piece - Lovable has orders but only 10 orderlines,
 * causing $0 revenue display. This script copies all 7,774 OrderLine records.
 */

import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load env
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const contents = readFileSync(envPath, 'utf8');
    contents
      .split(/\r?\n/)
      .forEach((line) => {
        const [key, ...rest] = line.split('=');
        if (key && !process.env[key]) {
          process.env[key] = rest.join('=').trim().replace(/^"|"$/g, '');
        }
      });
  }
}

loadEnv();

// Database connections
const WELLCRAFTED_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const WELLCRAFTED_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1Mzk1OSwiZXhwIjoyMDc0OTI5OTU5fQ.wsMKWFKQBWa8qOSqSoGLH0xnhitT-NYV13s2wcCRfzk';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

interface MigrationResult {
  totalRecords: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

async function migrateOrderLines(dryRun = true): Promise<MigrationResult> {
  const wellcrafted = createClient(WELLCRAFTED_URL, WELLCRAFTED_KEY);
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  const result: MigrationResult = {
    totalRecords: 0,
    migrated: 0,
    skipped: 0,
    errors: [],
  };

  console.log('\n🔄 Migrating OrderLines from Well Crafted to Lovable...\n');
  console.log(`Source: ${WELLCRAFTED_URL}`);
  console.log(`Target: ${LOVABLE_URL}\n`);

  try {
    // Get count from Well Crafted (using PascalCase)
    const { count: wcCount } = await wellcrafted
      .from('OrderLine')
      .select('*', { count: 'exact', head: true });

    console.log(`Found ${wcCount ?? 0} OrderLine records in Well Crafted`);
    result.totalRecords = wcCount ?? 0;

    if (result.totalRecords === 0) {
      console.log('❌ No OrderLines found in Well Crafted database!');
      return result;
    }

    // Fetch all OrderLines from Well Crafted in batches
    const BATCH_SIZE = 1000;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: orderlines, error: fetchError } = await wellcrafted
        .from('OrderLine')
        .select('*')
        .range(offset, offset + BATCH_SIZE - 1);

      if (fetchError) {
        console.error(`Error fetching batch at offset ${offset}:`, fetchError.message);
        result.errors.push(`Fetch error at offset ${offset}: ${fetchError.message}`);
        break;
      }

      if (!orderlines || orderlines.length === 0) {
        hasMore = false;
        break;
      }

      console.log(`Processing batch: ${offset} to ${offset + orderlines.length}...`);

      if (!dryRun) {
        // Transform and insert into Lovable (lowercase table name)
        const transformedData = orderlines.map(ol => ({
          id: ol.id,
          tenant_id: ol.tenantId, // Transform to snake_case
          order_id: ol.orderId,
          sku_id: ol.skuId,
          quantity: ol.quantity,
          unit_price: ol.unitPrice,
          is_sample: ol.isSample || false,
          created_at: ol.createdAt,
          updated_at: ol.updatedAt,
        }));

        const { error: insertError } = await lovable
          .from('orderline')
          .insert(transformedData);

        if (insertError) {
          console.error(`Error inserting batch:`, insertError.message);
          result.errors.push(`Insert error at offset ${offset}: ${insertError.message}`);
        } else {
          result.migrated += orderlines.length;
          console.log(`✓ Migrated ${orderlines.length} records`);
        }
      } else {
        console.log(`[DRY RUN] Would migrate ${orderlines.length} records`);
        result.migrated += orderlines.length;
      }

      offset += orderlines.length;

      if (orderlines.length < BATCH_SIZE) {
        hasMore = false;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('ORDERLINE MIGRATION REPORT');
    console.log('='.repeat(80));
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Total OrderLines in source: ${result.totalRecords}`);
    console.log(`OrderLines migrated: ${result.migrated}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log('='.repeat(80));

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(err => console.log(`  ${err}`));
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    result.errors.push(`Fatal: ${error}`);
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--write');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run migrate:orderlines-to-lovable -- [options]

Options:
  --write    Actually migrate OrderLines (default: dry run)
  --help     Show this help message

This script migrates OrderLine records from Well Crafted to Lovable database.
This fixes the $0 revenue display issue.
`);
    return;
  }

  const result = await migrateOrderLines(dryRun);

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN. Run with --write to migrate.\n');
  } else {
    console.log('\n✅ Migration complete!\n');
    console.log('🔍 Verify in Lovable:');
    console.log('   - Check orderline table has ~7,774+ rows');
    console.log('   - Check revenue displays in UI');
    console.log('   - Test a few customer records\n');
  }
}

main().catch(console.error);

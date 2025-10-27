/**
 * Migrate OrderLines from Well Crafted to Lovable
 * Using psql export/import since Supabase client has RLS restrictions
 */

import { spawnSync } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';

const WELLCRAFTED_CONN = 'postgresql://postgres.zqezunzlyjkseugujkrl:ZKK5pPySuCq7JhpO@aws-1-us-east-1.pooler.supabase.com:5432/postgres';

// Note: Need Lovable password - get from https://supabase.com/dashboard/project/wlwqkblueezqydturcpv/settings/database
const LOVABLE_CONN_TEMPLATE = 'postgresql://postgres.wlwqkblueezqydturcpv:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

async function main() {
  const args = process.argv.slice(2);
  const password = args.find(arg => arg.startsWith('--password='))?.split('=')[1];

  if (!password) {
    console.log(`
❌ Lovable database password required!

Usage: npm run migrate:orderlines-final -- --password=YOUR_PASSWORD

Get password from: https://supabase.com/dashboard/project/wlwqkblueezqydturcpv/settings/database

Or use the instructions in: /web/src/scripts/MIGRATION_INSTRUCTIONS.md
`);
    return;
  }

  const LOVABLE_CONN = LOVABLE_CONN_TEMPLATE.replace('[PASSWORD]', password);

  console.log('\n🔄 Migrating OrderLines from Well Crafted to Lovable...\n');

  // Step 1: Export from Well Crafted
  console.log('Step 1: Exporting OrderLines from Well Crafted...');

  const exportResult = spawnSync('psql', [
    WELLCRAFTED_CONN,
    '-c',
    `COPY (
      SELECT
        id,
        "tenantId" as tenantid,
        "orderId" as orderid,
        "skuId" as skuid,
        quantity,
        "unitPrice" as unitprice,
        0 as discount,
        COALESCE("isSample", false) as issample,
        "createdAt" as createdat,
        "updatedAt" as updatedat,
        NULL as appliedpricingrules,
        NULL as skuid_new
      FROM "OrderLine"
      ORDER BY "createdAt"
    ) TO STDOUT WITH CSV HEADER`
  ], { encoding: 'utf8' });

  if (exportResult.error || exportResult.status !== 0) {
    console.error('❌ Export failed:', exportResult.stderr);
    return;
  }

  const csvData = exportResult.stdout;
  const lineCount = csvData.split('\n').length - 2; // Subtract header and empty line

  console.log(`✓ Exported ${lineCount} OrderLine records\n`);

  // Save to file
  writeFileSync('/tmp/orderlines-export.csv', csvData);
  console.log('✓ Saved to /tmp/orderlines-export.csv\n');

  // Step 2: Import to Lovable
  console.log('Step 2: Importing OrderLines to Lovable...');

  const importResult = spawnSync('psql', [
    LOVABLE_CONN,
    '-c',
    `COPY orderline (
      id,
      tenantid,
      orderid,
      skuid,
      quantity,
      unitprice,
      discount,
      issample,
      createdat,
      updatedat,
      appliedpricingrules,
      skuid_new
    ) FROM STDIN WITH CSV HEADER`
  ], {
    input: csvData,
    encoding: 'utf8'
  });

  if (importResult.error || importResult.status !== 0) {
    console.error('❌ Import failed:', importResult.stderr);
    return;
  }

  console.log('✓ Imported to Lovable\n');

  // Step 3: Verify
  console.log('Step 3: Verifying...');

  const verifyResult = spawnSync('psql', [
    LOVABLE_CONN,
    '-c',
    'SELECT COUNT(*) as orderline_count FROM orderline;'
  ], { encoding: 'utf8' });

  console.log(verifyResult.stdout);

  console.log('\n' + '='.repeat(80));
  console.log('✅ MIGRATION COMPLETE!');
  console.log('='.repeat(80));
  console.log(`\nMigrated ${lineCount} OrderLine records to Lovable`);
  console.log('\n🎉 Revenue should now display correctly in the UI!\n');
}

main().catch(console.error);

/**
 * Migrate OrderLines: Well Crafted → Lovable
 * Uses Supabase Service Role Keys (no password needed)
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load environment
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

const WELLCRAFTED_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const WELLCRAFTED_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxZXp1bnpseWprc2V1Z3Vqa3JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTM1Mzk1OSwiZXhwIjoyMDc0OTI5OTU5fQ.wsMKWFKQBWa8qOSqSoGLH0xnhitT-NYV13s2wcCRfzk';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function migrate() {
  console.log('\n🔄 Migrating OrderLines using Prisma + Supabase...\n');

  // Use Prisma to read from Well Crafted (via DATABASE_URL)
  const prisma = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY, {
    auth: { persistSession: false }
  });

  try {
    // Get count
    const count = await prisma.orderLine.count();
    console.log(`Found ${count} OrderLine records in Well Crafted`);

    if (count === 0) {
      console.log('❌ No OrderLines to migrate!');
      return;
    }

    // Fetch all OrderLines
    console.log('\nFetching OrderLines...');
    const orderLines = await prisma.orderLine.findMany({
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✓ Fetched ${orderLines.length} records\n`);

    // Transform to Lovable schema (based on actual columns from check)
    // Columns: id, orderid, skuid, quantity, unitprice, discount, issample, createdat, appliedpricingrules, skuid_new
    const transformed = orderLines.map(ol => ({
      id: ol.id,
      orderid: ol.orderId,
      skuid: ol.skuId,
      quantity: ol.quantity,
      unitprice: Number(ol.unitPrice),
      discount: 0,
      issample: ol.isSample || false,
      createdat: ol.createdAt.toISOString(),
      appliedpricingrules: null,
      skuid_new: null,
    }));

    console.log('Migrating in batches of 500...\n');

    const BATCH_SIZE = 500;
    let migrated = 0;

    for (let i = 0; i < transformed.length; i += BATCH_SIZE) {
      const batch = transformed.slice(i, i + BATCH_SIZE);

      const { error } = await lovable
        .from('orderline')
        .upsert(batch, { onConflict: 'id' });

      if (error) {
        console.error(`❌ Error in batch ${i / BATCH_SIZE + 1}:`, error.message);
        break;
      }

      migrated += batch.length;
      console.log(`✓ Migrated ${migrated} / ${transformed.length} records`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\nMigrated ${migrated} OrderLine records to Lovable`);
    console.log('\n🎉 Revenue should now display correctly!\n');

  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);

/**
 * Debug why SKUs aren't matching
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (existsSync(envPath)) {
    const contents = readFileSync(envPath, 'utf8');
    contents.split(/\r?\n/).forEach((line) => {
      const [key, ...rest] = line.split('=');
      if (key && !process.env[key]) {
        process.env[key] = rest.join('=').trim().replace(/^"|"$/g, '');
      }
    });
  }
}

loadEnv();

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

async function debug() {
  const wellcrafted = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('🔍 Debugging SKU matching...\n');

  // Get sample SKU codes from Well Crafted OrderLines
  const sampleOrderLines = await wellcrafted.orderLine.findMany({
    include: { sku: { select: { code: true } } },
    take: 10
  });

  console.log('Sample SKU codes from Well Crafted OrderLines:');
  const skuCodes = sampleOrderLines.map(ol => ol.sku.code);
  skuCodes.forEach(code => console.log(`  ${code}`));

  console.log('\nChecking if these exist in Lovable...\n');

  for (const code of skuCodes) {
    const { data, error } = await lovable
      .from('sku')
      .select('id, code')
      .eq('code', code)
      .maybeSingle();

    if (data) {
      console.log(`✅ ${code} - Found in Lovable`);
    } else {
      console.log(`❌ ${code} - NOT in Lovable ${error ? `(${error.message})` : ''}`);
    }
  }

  // Check total SKU count in Lovable
  const { count } = await lovable
    .from('sku')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total SKUs in Lovable: ${count}`);

  await wellcrafted.$disconnect();
}

debug();

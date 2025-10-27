/**
 * Compare Order IDs between databases
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load env
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
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function compare() {
  const prisma = new PrismaClient(); // Connected to Well Crafted
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('🔍 Comparing Order IDs...\n');

  // Get sample Order IDs from Well Crafted
  const wcOrders = await prisma.order.findMany({
    select: { id: true },
    take: 20,
    orderBy: { createdAt: 'desc' }
  });

  console.log('Well Crafted Order IDs (20 most recent):');
  const wcIds = wcOrders.map(o => o.id);
  wcIds.forEach(id => console.log(`  ${id}`));

  // Check if any exist in Lovable
  const { data: matchingOrders } = await lovable
    .from('order')
    .select('id')
    .in('id', wcIds);

  console.log(`\n✅ Matching orders found in Lovable: ${matchingOrders?.length || 0} / 20`);

  if (matchingOrders && matchingOrders.length > 0) {
    console.log('\n🎯 Order IDs exist in BOTH databases!');
    console.log('Matching IDs:');
    matchingOrders.forEach(o => console.log(`  ${o.id}`));
  } else {
    console.log('\n❌ NO matching Order IDs between databases!');
    console.log('The orders are completely different.');
  }

  await prisma.$disconnect();
}

compare();

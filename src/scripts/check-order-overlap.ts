/**
 * Check if orders can be matched between databases by customer name and amount
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
const LOVABLE_KEY = '***SUPABASE_JWT_REMOVED***';

async function checkOverlap() {
  const prisma = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('🔍 Checking if orders can be matched by customer + amount + date...\n');

  // Get sample from Well Crafted with customer info
  const wcOrders = await prisma.order.findMany({
    select: {
      id: true,
      total: true,
      orderedAt: true,
      customer: {
        select: { name: true }
      }
    },
    take: 10,
    where: {
      total: { not: null }
    },
    orderBy: { orderedAt: 'desc' }
  });

  console.log('Well Crafted Orders (sample):');
  wcOrders.forEach(o => {
    console.log(`  ${o.customer.name}: $${o.total} on ${o.orderedAt?.toISOString().split('T')[0]}`);
  });

  // Try to find matching orders in Lovable by amount
  console.log('\n🔎 Searching for matches in Lovable...\n');

  let matches = 0;

  for (const wcOrder of wcOrders) {
    const { data: lovableMatches } = await lovable
      .from('order')
      .select('id, total, orderedat')
      .eq('total', Number(wcOrder.total))
      .limit(5);

    if (lovableMatches && lovableMatches.length > 0) {
      console.log(`✓ Found ${lovableMatches.length} potential matches for $${wcOrder.total}`);
      matches++;
    }
  }

  console.log(`\n📊 Result: ${matches} / ${wcOrders.length} orders have potential matches by amount`);

  if (matches > 0) {
    console.log('\n🎯 Strategy: Orders might be matchable, but with different IDs');
    console.log('   Need to match by customer name + amount + date to link OrderLines');
  } else {
    console.log('\n❌ Orders appear to be completely different datasets');
  }

  await prisma.$disconnect();
}

checkOverlap();

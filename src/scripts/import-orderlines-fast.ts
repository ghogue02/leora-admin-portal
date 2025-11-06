/**
 * Fast OrderLine Import to Lovable
 * Processes in batches to avoid memory issues
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formatUTCDate } from '../lib/dates';

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

async function importOrderLinesFast() {
  const wellcrafted = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('\n🚀 Fast OrderLine Import to Lovable\n');

  try {
    // Get total count
    const totalCount = await wellcrafted.orderLine.count();
    console.log(`Total OrderLines in Well Crafted: ${totalCount}\n`);

    // Get all unique order IDs with their totals and dates
    const orders = await wellcrafted.order.findMany({
      select: {
        id: true,
        total: true,
        orderedAt: true,
        customer: { select: { name: true } }
      },
      where: {
        total: { not: null },
        orderedAt: { not: null }
      }
    });

    console.log(`Processing ${orders.length} orders...\n`);

    let matched = 0;
    let created = 0;
    let notMatched = 0;

    for (let i = 0; i < orders.length; i++) {
      const wcOrder = orders[i];

      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1} / ${orders.length} orders | Matched: ${matched} | Created: ${created} OrderLines`);
      }

      // Find matching order in Lovable by amount and date
      // Use UTC date formatting for consistent matching across timezones
      const wcDate = formatUTCDate(wcOrder.orderedAt!);

      const { data: lovableOrders } = await lovable
        .from('order')
        .select('id')
        .eq('total', Number(wcOrder.total))
        .limit(5);

      if (!lovableOrders || lovableOrders.length === 0) {
        notMatched++;
        continue;
      }

      //Use first match (or could enhance matching logic)
      const lovableOrder = lovableOrders[0];
      matched++;

      // Get OrderLines for this Well Crafted order
      const wcOrderLines = await wellcrafted.orderLine.findMany({
        where: { orderId: wcOrder.id },
        include: { sku: { select: { code: true } } }
      });

      // Create OrderLines in Lovable
      for (const wcLine of wcOrderLines) {
        // Find matching SKU in Lovable (table is 'skus' plural)
        const { data: lovableSku } = await lovable
          .from('skus')
          .select('id')
          .eq('code', wcLine.sku.code)
          .maybeSingle();

        if (!lovableSku) continue;

        // Insert OrderLine
        const { error } = await lovable
          .from('orderline')
          .insert({
            orderid: lovableOrder.id,
            skuid: lovableSku.id,
            quantity: wcLine.quantity,
            unitprice: Number(wcLine.unitPrice),
            discount: 0,
            issample: wcLine.isSample || false,
            createdat: new Date().toISOString(),
            appliedpricingrules: null,
          });

        if (!error) {
          created++;
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ IMPORT COMPLETE!');
    console.log('='.repeat(80));
    console.log(`Orders processed: ${orders.length}`);
    console.log(`Orders matched: ${matched}`);
    console.log(`Orders not matched: ${notMatched}`);
    console.log(`OrderLines created: ${created}`);
    console.log('='.repeat(80));

  } finally {
    await wellcrafted.$disconnect();
  }
}

importOrderLinesFast().catch(console.error);

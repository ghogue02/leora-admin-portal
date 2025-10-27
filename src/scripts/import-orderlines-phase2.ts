/**
 * Phase 2: Import Remaining OrderLines with Improved Matching
 *
 * Based on research findings, uses:
 * - Customer name normalization (LOWER + TRIM)
 * - Date tolerance (+/- 1 day)
 * - Amount tolerance (+/- $1.00)
 * - Handles NULL amounts
 * - Takes most recent Well Crafted order for duplicates
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

async function importPhase2() {
  const wellcrafted = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY);

  console.log('\n🚀 Phase 2: Improved OrderLine Migration\n');
  console.log('Using fuzzy matching with tolerances:\n');
  console.log('  ✓ Customer: LOWER + TRIM normalization');
  console.log('  ✓ Date: +/- 1 day tolerance');
  console.log('  ✓ Amount: +/- $1.00 tolerance OR NULL handling');
  console.log('  ✓ Duplicates: Takes most recent\n');

  try {
    // Get Lovable orders WITHOUT OrderLines
    const { data: lovableOrdersWithoutLines, error: lovableError } = await lovable
      .from('order')
      .select(`
        id,
        customerid,
        orderedat,
        total,
        customer:customerid (name)
      `)
      .is('total', null)
      .not('id', 'in', `(SELECT DISTINCT orderid FROM orderline)`);

    if (lovableError) {
      console.error('Error fetching Lovable orders:', lovableError);
      return;
    }

    // Also get orders WITH totals
    const { data: lovableOrdersWithTotals } = await lovable
      .from('order')
      .select(`
        id,
        customerid,
        orderedat,
        total,
        customer:customerid (name)
      `)
      .not('total', 'is', null)
      .not('id', 'in', `(SELECT DISTINCT orderid FROM orderline)`);

    const allLovableOrders = [...(lovableOrdersWithoutLines || []), ...(lovableOrdersWithTotals || [])];

    console.log(`Found ${allLovableOrders.length} Lovable orders without OrderLines\n`);

    let matched = 0;
    let created = 0;
    let notMatched = 0;

    for (let i = 0; i < allLovableOrders.length; i++) {
      const lovableOrder = allLovableOrders[i];

      if ((i + 1) % 50 === 0) {
        console.log(`Progress: ${i + 1} / ${allLovableOrders.length} | Matched: ${matched} | Created: ${created} OrderLines`);
      }

      const customerName = (lovableOrder.customer as any)?.name;
      if (!customerName) {
        notMatched++;
        continue;
      }

      const lovableDate = new Date(lovableOrder.orderedat);
      const lovableAmount = lovableOrder.total;

      // Find matching customer in Well Crafted (normalized)
      const wcCustomers = await wellcrafted.customer.findMany({
        where: {
          name: {
            mode: 'insensitive',
            equals: customerName.trim()
          }
        },
        select: { id: true }
      });

      if (wcCustomers.length === 0) {
        notMatched++;
        continue;
      }

      // Find matching orders with date & amount tolerance
      const wcOrders = await wellcrafted.order.findMany({
        where: {
          customerId: { in: wcCustomers.map(c => c.id) },
          orderedAt: {
            gte: new Date(lovableDate.getTime() - 24 * 60 * 60 * 1000), // -1 day
            lte: new Date(lovableDate.getTime() + 24 * 60 * 60 * 1000), // +1 day
          },
          ...(lovableAmount !== null ? {
            total: {
              gte: lovableAmount - 1,
              lte: lovableAmount + 1
            }
          } : {})
        },
        include: { _count: { select: { lines: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 1
      });

      if (wcOrders.length === 0) {
        notMatched++;
        continue;
      }

      const wcOrder = wcOrders[0];

      // Skip if no OrderLines in source
      if (wcOrder._count.lines === 0) {
        notMatched++;
        continue;
      }

      matched++;

      // Get OrderLines from Well Crafted
      const wcOrderLines = await wellcrafted.orderLine.findMany({
        where: { orderId: wcOrder.id },
        include: { sku: { select: { code: true } } }
      });

      // Import each OrderLine
      for (const wcLine of wcOrderLines) {
        const { data: lovableSku } = await lovable
          .from('skus')
          .select('id')
          .eq('code', wcLine.sku.code)
          .maybeSingle();

        if (!lovableSku) continue;

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
    console.log('✅ PHASE 2 COMPLETE!');
    console.log('='.repeat(80));
    console.log(`Orders processed: ${allLovableOrders.length}`);
    console.log(`Orders matched: ${matched}`);
    console.log(`Orders not matched: ${notMatched}`);
    console.log(`OrderLines created: ${created}`);
    console.log('='.repeat(80));

  } finally {
    await wellcrafted.$disconnect();
  }
}

importPhase2().catch(console.error);

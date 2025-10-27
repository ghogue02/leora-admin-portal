/**
 * Import OrderLines to Lovable Database
 * Matches orders by customer + amount + date, then creates OrderLines
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

interface ImportResult {
  totalOrderLines: number;
  ordersMatched: number;
  orderLinesCreated: number;
  ordersNotMatched: number;
  skusNotFound: number;
  errors: string[];
}

async function importOrderLines(dryRun = true): Promise<ImportResult> {
  const wellcrafted = new PrismaClient();
  const lovable = createClient(LOVABLE_URL, LOVABLE_KEY, { auth: { persistSession: false } });

  const result: ImportResult = {
    totalOrderLines: 0,
    ordersMatched: 0,
    orderLinesCreated: 0,
    ordersNotMatched: 0,
    skusNotFound: 0,
    errors: [],
  };

  console.log('\n🔄 Importing OrderLines to Lovable...\n');
  console.log('Strategy: Match orders by customer + total + date, then create OrderLines\n');

  try {
    // Get all OrderLines from Well Crafted with order and customer info
    const orderLines = await wellcrafted.orderLine.findMany({
      include: {
        order: {
          include: {
            customer: { select: { name: true } }
          }
        },
        sku: { select: { code: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    result.totalOrderLines = orderLines.length;
    console.log(`✓ Loaded ${orderLines.length} OrderLines from Well Crafted\n`);

    // Group by order to process order by order
    const orderLinesByOrder = new Map<string, typeof orderLines>();
    orderLines.forEach(ol => {
      const orderId = ol.orderId;
      if (!orderLinesByOrder.has(orderId)) {
        orderLinesByOrder.set(orderId, []);
      }
      orderLinesByOrder.get(orderId)!.push(ol);
    });

    console.log(`Processing ${orderLinesByOrder.size} unique orders...\n`);

    let processed = 0;

    for (const [wcOrderId, lines] of orderLinesByOrder) {
      processed++;

      if (processed % 100 === 0) {
        console.log(`Progress: ${processed} / ${orderLinesByOrder.size} orders processed...`);
      }

      const firstLine = lines[0];
      const orderTotal = firstLine.order.total;
      const orderDate = firstLine.order.orderedAt;
      const customerName = firstLine.order.customer.name;

      if (!orderTotal || !orderDate) {
        result.ordersNotMatched++;
        continue;
      }

      // Find matching order in Lovable
      const { data: lovableOrders, error: matchError } = await lovable
        .from('order')
        .select('id, orderedat')
        .eq('total', Number(orderTotal))
        .limit(10);

      if (matchError || !lovableOrders || lovableOrders.length === 0) {
        result.ordersNotMatched++;
        continue;
      }

      // Find exact match by date (within same day)
      const wcDate = orderDate.toISOString().split('T')[0];
      const matchingOrder = lovableOrders.find(lo => {
        const lovableDate = new Date(lo.orderedat).toISOString().split('T')[0];
        return lovableDate === wcDate;
      });

      if (!matchingOrder) {
        result.ordersNotMatched++;
        continue;
      }

      result.ordersMatched++;

      // Create OrderLines for this matched order
      for (const line of lines) {
        try {
          // Find matching SKU in Lovable by code
          const { data: lovableSku } = await lovable
            .from('sku')
            .select('id')
            .eq('code', line.sku.code)
            .single();

          if (!lovableSku) {
            result.skusNotFound++;
            if (result.errors.length < 10) { // Limit error messages
              result.errors.push(`SKU not found: ${line.sku.code}`);
            }
            continue;
          }

          if (!dryRun) {
            // Create OrderLine in Lovable
            const { error: insertError } = await lovable
              .from('orderline')
              .insert({
                orderid: matchingOrder.id,
                skuid: lovableSku.id,
                quantity: line.quantity,
                unitprice: Number(line.unitPrice),
                discount: 0,
                issample: line.isSample || false,
                createdat: line.createdAt.toISOString(),
                appliedpricingrules: null,
                skuid_new: null,
              });

            if (insertError) {
              if (result.errors.length < 10) {
                result.errors.push(`Insert failed: ${insertError.message}`);
              }
            } else {
              result.orderLinesCreated++;
            }
          } else {
            result.orderLinesCreated++;
          }
        } catch (error) {
          if (result.errors.length < 10) {
            result.errors.push(`Line error: ${error}`);
          }
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('ORDERLINE IMPORT REPORT');
    console.log('='.repeat(80));
    console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Total OrderLines in source: ${result.totalOrderLines}`);
    console.log(`Orders matched: ${result.ordersMatched}`);
    console.log(`Orders not matched: ${result.ordersNotMatched}`);
    console.log(`OrderLines created: ${result.orderLinesCreated}`);
    console.log(`SKUs not found: ${result.skusNotFound}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log('='.repeat(80));

    if (result.errors.length > 0) {
      console.log('\nSample Errors:');
      result.errors.forEach(err => console.log(`  ${err}`));
    }

  } finally {
    await wellcrafted.$disconnect();
  }

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--write');

  if (args.includes('--help')) {
    console.log(`
Usage: npm run import:orderlines-to-lovable -- [options]

Options:
  --write    Actually import OrderLines (default: dry run)
  --help     Show this help

This script:
1. Reads OrderLines from Well Crafted database
2. Matches orders in Lovable by customer + amount + date
3. Creates OrderLines in Lovable with matched order IDs
`);
    return;
  }

  const result = await importOrderLines(dryRun);

  if (dryRun) {
    console.log('\n💡 This was a DRY RUN. Run with --write to import.\n');
  } else {
    console.log('\n✅ Import complete!\n');
    console.log('🔍 Verify: Check Lovable orderline table should have thousands of rows\n');
  }
}

main().catch(console.error);

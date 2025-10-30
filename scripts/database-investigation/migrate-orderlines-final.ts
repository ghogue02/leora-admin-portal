import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Lovable Supabase credentials
const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const lovable = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

interface WCOrderLine {
  id: string;
  orderId: string;
  skuId: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  discount?: number;
  createdAt?: string;
}

interface LovableOrderLine {
  orderid: string;
  skuid: string;
  quantity: number;
  unitprice: number;
  issample: boolean;
  discount: number;
}

interface MigrationStats {
  totalProcessed: number;
  imported: number;
  skippedNoOrder: number;
  skippedNoSKU: number;
  skippedSKUNotInDB: number;
  errors: number;
  batchesProcessed: number;
}

const BATCH_SIZE = 100;

async function loadMappings() {
  console.log('📂 Loading UUID mappings...');

  const orderMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/order-uuid-map.json';
  const skuMapPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/sku-uuid-map-comprehensive.json';

  const orderMapArray = JSON.parse(fs.readFileSync(orderMapPath, 'utf-8'));
  const skuMapObject = JSON.parse(fs.readFileSync(skuMapPath, 'utf-8'));

  // Convert to Map objects for faster lookups
  const orderMap = new Map<string, string>();
  const skuMap = new Map<string, string>();

  // Order map is an array of {wellCraftedId, lovableId}
  if (Array.isArray(orderMapArray)) {
    orderMapArray.forEach((mapping: any) => {
      orderMap.set(mapping.wellCraftedId, mapping.lovableId);
    });
  }

  // SKU map is a simple object {wellCraftedId: lovableId}
  if (typeof skuMapObject === 'object' && !Array.isArray(skuMapObject)) {
    Object.entries(skuMapObject).forEach(([wcId, lovableId]) => {
      skuMap.set(wcId, lovableId as string);
    });
  }

  console.log(`✅ Loaded ${orderMap.size} order mappings`);
  console.log(`✅ Loaded ${skuMap.size} SKU mappings`);

  return { orderMap, skuMap };
}

async function loadOrderLines(): Promise<WCOrderLine[]> {
  console.log('📂 Loading OrderLine CSV...');

  const csvPath = '/Users/greghogue/Leora2/exports/wellcrafted-manual/OrderLine.csv';
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const orderLines: WCOrderLine[] = records.map((record: any) => ({
    id: record.id || record.Id,
    orderId: record.orderId || record.OrderId,
    skuId: record.skuId || record.SkuId,
    quantity: parseInt(record.quantity || record.Quantity || '0'),
    unitPrice: parseFloat(record.unitPrice || record.UnitPrice || '0'),
    isSample: (record.isSample || record.IsSample || 'false').toLowerCase() === 'true',
    discount: record.discount || record.Discount ? parseFloat(record.discount || record.Discount) : 0,
    createdAt: record.createdAt || record.CreatedAt
  }));

  console.log(`✅ Loaded ${orderLines.length} OrderLines from CSV`);
  return orderLines;
}

async function getSKUSchema() {
  console.log('🔍 Checking SKU table schema...');

  const { data, error } = await lovable
    .from('skus')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error checking SKU schema:', error);
    return null;
  }

  if (data && data.length > 0) {
    console.log('✅ SKU table columns:', Object.keys(data[0]));
    return Object.keys(data[0]);
  }

  return null;
}

async function checkSKUExists(skuId: string): Promise<boolean> {
  const { data, error } = await lovable
    .from('skus')
    .select('id')
    .eq('id', skuId)
    .single();

  return !error && data !== null;
}

async function getOrderLineSchema() {
  console.log('🔍 Checking OrderLine table schema...');

  const { data, error } = await lovable
    .from('orderline')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error checking OrderLine schema:', error);
    return null;
  }

  if (data && data.length > 0) {
    console.log('✅ OrderLine table columns:', Object.keys(data[0]));
    return Object.keys(data[0]);
  }

  return null;
}

async function importBatch(orderLines: LovableOrderLine[], batchNum: number): Promise<number> {
  console.log(`📦 Importing batch ${batchNum} (${orderLines.length} orderlines)...`);

  const { data, error } = await lovable
    .from('orderline')
    .insert(orderLines)
    .select();

  if (error) {
    console.error(`❌ Error importing batch ${batchNum}:`, error);
    throw error;
  }

  console.log(`✅ Batch ${batchNum} imported: ${data?.length || 0} orderlines`);
  return data?.length || 0;
}

async function verifyOrderLineIntegrity() {
  console.log('\n🔍 Verifying OrderLine integrity...');

  // Count total orderlines
  const { count: totalCount, error: countError } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting orderlines:', countError);
    return null;
  }

  // Check for orphaned orderlines (orderid not in order table)
  const { data: orderLines, error: olError } = await lovable
    .from('orderline')
    .select('orderid');

  let uniqueOrders = new Set<string>();
  let orphanedCount = 0;

  if (olError) {
    console.error('❌ Error checking orderlines:', olError);
  } else {
    const orderIds = [...new Set(orderLines?.map(ol => ol.orderid) || [])];
    uniqueOrders = new Set(orderIds);

    const { data: validOrders, error: ordersError } = await lovable
      .from('order')
      .select('id')
      .in('id', orderIds);

    if (ordersError) {
      console.error('❌ Error checking orders:', ordersError);
    } else {
      const validOrderIds = new Set(validOrders?.map(o => o.id) || []);
      orphanedCount = orderIds.filter(id => !validOrderIds.has(id)).length;
      console.log(`✅ Orphaned orderlines: ${orphanedCount}`);
      console.log(`✅ Orders with orderlines: ${uniqueOrders.size}`);
    }
  }

  // Get total orders count
  const { count: totalOrders, error: totalOrdersError } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  if (totalOrdersError) {
    console.error('❌ Error counting total orders:', totalOrdersError);
  } else {
    const coverage = totalOrders ? (uniqueOrders.size / totalOrders * 100).toFixed(2) : 0;
    console.log(`✅ Order coverage: ${coverage}% (${uniqueOrders.size}/${totalOrders})`);
  }

  return {
    totalOrderLines: totalCount,
    ordersWithOrderLines: uniqueOrders.size,
    totalOrders: totalOrders || 0,
    coverage: totalOrders ? (uniqueOrders.size / totalOrders * 100) : 0
  };
}

async function main() {
  console.log('🚀 OrderLine Final Migration - Starting...\n');

  const stats: MigrationStats = {
    totalProcessed: 0,
    imported: 0,
    skippedNoOrder: 0,
    skippedNoSKU: 0,
    skippedSKUNotInDB: 0,
    errors: 0,
    batchesProcessed: 0
  };

  try {
    // Check schemas first
    await getSKUSchema();
    await getOrderLineSchema();

    // Load mappings and data
    const { orderMap, skuMap } = await loadMappings();
    const wcOrderLines = await loadOrderLines();

    console.log(`\n📊 Processing ${wcOrderLines.length} OrderLines...\n`);

    // Build SKU existence cache
    console.log('🔍 Building SKU existence cache...');
    const skuExistsCache = new Map<string, boolean>();
    const allMappedSKUs = [...new Set(wcOrderLines
      .map(ol => skuMap.get(ol.skuId))
      .filter(Boolean))];

    for (const skuId of allMappedSKUs) {
      const exists = await checkSKUExists(skuId!);
      skuExistsCache.set(skuId!, exists);
    }
    console.log(`✅ Cached ${skuExistsCache.size} SKUs\n`);

    // Process orderlines and prepare batches
    const toImport: LovableOrderLine[] = [];

    for (const wcOL of wcOrderLines) {
      stats.totalProcessed++;

      // Check order mapping
      const lovableOrderId = orderMap.get(wcOL.orderId);
      if (!lovableOrderId) {
        stats.skippedNoOrder++;
        continue;
      }

      // Check SKU mapping
      const lovableSkuId = skuMap.get(wcOL.skuId);
      if (!lovableSkuId) {
        stats.skippedNoSKU++;
        continue;
      }

      // Check SKU exists in database
      const skuExists = skuExistsCache.get(lovableSkuId);
      if (!skuExists) {
        stats.skippedSKUNotInDB++;
        continue;
      }

      // Transform to Lovable schema
      const lovableOL: LovableOrderLine = {
        orderid: lovableOrderId,
        skuid: lovableSkuId,
        quantity: wcOL.quantity || 0,
        unitprice: wcOL.unitPrice || 0,
        issample: wcOL.isSample || false,
        discount: wcOL.discount || 0
      };

      toImport.push(lovableOL);

      // Import in batches
      if (toImport.length >= BATCH_SIZE) {
        try {
          const imported = await importBatch(toImport, stats.batchesProcessed + 1);
          stats.imported += imported;
          stats.batchesProcessed++;
          toImport.length = 0; // Clear batch

          // Progress update
          if (stats.batchesProcessed % 10 === 0) {
            console.log(`\n📊 Progress: ${stats.totalProcessed}/${wcOrderLines.length} processed, ${stats.imported} imported\n`);
          }
        } catch (error) {
          console.error('❌ Batch import failed:', error);
          stats.errors += toImport.length;
          toImport.length = 0;
        }
      }
    }

    // Import remaining orderlines
    if (toImport.length > 0) {
      try {
        const imported = await importBatch(toImport, stats.batchesProcessed + 1);
        stats.imported += imported;
        stats.batchesProcessed++;
      } catch (error) {
        console.error('❌ Final batch import failed:', error);
        stats.errors += toImport.length;
      }
    }

    // Verify integrity
    console.log('\n' + '='.repeat(60));
    const verification = await verifyOrderLineIntegrity();

    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log('\n📈 OrderLine Statistics:');
    console.log(`  Total WellCrafted OrderLines: ${wcOrderLines.length}`);
    console.log(`  Total Processed: ${stats.totalProcessed}`);
    console.log(`  ✅ Successfully Imported: ${stats.imported}`);
    console.log(`  ⏭️  Skipped (No Order Mapping): ${stats.skippedNoOrder}`);
    console.log(`  ⏭️  Skipped (No SKU Mapping): ${stats.skippedNoSKU}`);
    console.log(`  ⏭️  Skipped (SKU Not in DB): ${stats.skippedSKUNotInDB}`);
    console.log(`  ❌ Errors: ${stats.errors}`);
    console.log(`  📦 Batches Processed: ${stats.batchesProcessed}`);

    if (verification) {
      console.log('\n🎯 Coverage Metrics:');
      console.log(`  Total OrderLines in Lovable: ${verification.totalOrderLines}`);
      console.log(`  Orders with OrderLines: ${verification.ordersWithOrderLines}`);
      console.log(`  Total Orders in Lovable: ${verification.totalOrders}`);
      console.log(`  📊 Order Coverage: ${verification.coverage.toFixed(2)}%`);

      const targetCoverage = 70;
      const coverageMet = verification.coverage >= targetCoverage;
      console.log(`\n${coverageMet ? '✅' : '❌'} Target Coverage (${targetCoverage}%): ${coverageMet ? 'MET' : 'NOT MET'}`);

      if (coverageMet) {
        console.log('\n🎉 MIGRATION SUCCESSFUL! 70% coverage achieved!');
      } else {
        console.log(`\n⚠️  Coverage gap: ${(targetCoverage - verification.coverage).toFixed(2)}%`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ OrderLine migration complete!');
    console.log('='.repeat(60) + '\n');

    // Save detailed report
    const reportPath = '/Users/greghogue/Leora2/scripts/database-investigation/orderline-migration-report.json';
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      verification,
      targetCoverage: 70,
      coverageMet: verification ? verification.coverage >= 70 : false
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

main();

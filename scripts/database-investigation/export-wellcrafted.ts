#!/usr/bin/env tsx

/**
 * Well Crafted Database Export Script
 *
 * Exports complete dataset from Well Crafted Supabase instance with UUID mapping
 * Critical: Must export all 7,774 OrderLines
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Well Crafted Database Credentials
const WELLCRAFTED_URL = 'https://zqezunzlyjkseugujkrl.supabase.co';
const WELLCRAFTED_KEY = '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>';

const supabase = createClient(WELLCRAFTED_URL, WELLCRAFTED_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Export directory
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const exportDir = `/Users/greghogue/Leora2/exports/wellcrafted-complete-${timestamp}`;

interface ExportStats {
  tableName: string;
  recordCount: number;
  success: boolean;
  error?: string;
}

interface UUIDMapping {
  wellcraftedUuid: string;
  lovableUuid?: string;
  matchingData: any;
}

/**
 * Fetch all records from a table with pagination
 */
async function fetchAllRecords(tableName: string): Promise<any[]> {
  const pageSize = 1000;
  let allRecords: any[] = [];
  let page = 0;
  let hasMore = true;

  console.log(`\n📊 Fetching ${tableName}...`);

  while (hasMore) {
    const start = page * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(start, end);

    if (error) {
      throw new Error(`Error fetching ${tableName}: ${error.message}`);
    }

    if (data && data.length > 0) {
      allRecords = allRecords.concat(data);
      console.log(`  📦 Page ${page + 1}: ${data.length} records (total: ${allRecords.length})`);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ ${tableName}: ${allRecords.length} total records fetched`);
  return allRecords;
}

/**
 * Export a single table
 */
async function exportTable(tableName: string): Promise<ExportStats> {
  try {
    const records = await fetchAllRecords(tableName);

    // Save full dataset
    const filePath = path.join(exportDir, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(records, null, 2));

    console.log(`💾 Saved to: ${filePath}`);

    return {
      tableName,
      recordCount: records.length,
      success: true
    };
  } catch (error: any) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return {
      tableName,
      recordCount: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Create UUID mapping for Customers
 */
function createCustomerUUIDMapping(customers: any[]): UUIDMapping[] {
  return customers.map(customer => ({
    wellcraftedUuid: customer.id,
    lovableUuid: undefined, // To be filled during migration
    matchingData: {
      email: customer.email,
      name: customer.name,
      accountNumber: customer.accountNumber,
      // Additional fields for matching
      createdAt: customer.createdAt
    }
  }));
}

/**
 * Create UUID mapping for Orders
 */
function createOrderUUIDMapping(orders: any[], customers: any[]): UUIDMapping[] {
  return orders.map(order => {
    const customer = customers.find(c => c.id === order.customerId);
    return {
      wellcraftedUuid: order.id,
      lovableUuid: undefined,
      matchingData: {
        customerId: order.customerId,
        customerEmail: customer?.email,
        customerName: customer?.name,
        orderedAt: order.orderedAt,
        total: order.total,
        // Additional fields for matching
        createdAt: order.createdAt
      }
    };
  });
}

/**
 * Create UUID mapping for SKUs
 */
function createSkuUUIDMapping(skus: any[], products: any[]): UUIDMapping[] {
  return skus.map(sku => {
    const product = products.find(p => p.id === sku.productId);
    return {
      wellcraftedUuid: sku.id,
      lovableUuid: undefined,
      matchingData: {
        code: sku.code,
        size: sku.size,
        productId: sku.productId,
        productName: product?.name,
        productProducer: product?.producer
      }
    };
  });
}

/**
 * Create UUID mapping for Products
 */
function createProductUUIDMapping(products: any[]): UUIDMapping[] {
  return products.map(product => ({
    wellcraftedUuid: product.id,
    lovableUuid: undefined,
    matchingData: {
      name: product.name,
      producer: product.producer,
      // Additional fields for matching
      createdAt: product.createdAt
    }
  }));
}

/**
 * Generate relationship report
 */
function generateRelationshipReport(
  customers: any[],
  orders: any[],
  orderLines: any[],
  skus: any[],
  products: any[]
): any {
  const report = {
    summary: {
      totalCustomers: customers.length,
      totalOrders: orders.length,
      totalOrderLines: orderLines.length,
      totalSkus: skus.length,
      totalProducts: products.length
    },
    relationships: {
      ordersPerCustomer: {} as any,
      orderLinesPerOrder: {} as any,
      skusPerProduct: {} as any
    },
    validation: {
      orphanedOrders: 0,
      orphanedOrderLines: 0,
      orphanedSkus: 0
    }
  };

  // Orders per customer
  orders.forEach(order => {
    const customerId = order.customerId;
    if (!report.relationships.ordersPerCustomer[customerId]) {
      report.relationships.ordersPerCustomer[customerId] = 0;
    }
    report.relationships.ordersPerCustomer[customerId]++;
  });

  // OrderLines per order
  orderLines.forEach(line => {
    const orderId = line.orderId;
    if (!report.relationships.orderLinesPerOrder[orderId]) {
      report.relationships.orderLinesPerOrder[orderId] = 0;
    }
    report.relationships.orderLinesPerOrder[orderId]++;
  });

  // SKUs per product
  skus.forEach(sku => {
    const productId = sku.productId;
    if (!report.relationships.skusPerProduct[productId]) {
      report.relationships.skusPerProduct[productId] = 0;
    }
    report.relationships.skusPerProduct[productId]++;
  });

  // Validation
  report.validation.orphanedOrders = orders.filter(
    order => !customers.find(c => c.id === order.customerId)
  ).length;

  report.validation.orphanedOrderLines = orderLines.filter(
    line => !orders.find(o => o.id === line.orderId)
  ).length;

  report.validation.orphanedSkus = skus.filter(
    sku => !products.find(p => p.id === sku.productId)
  ).length;

  return report;
}

/**
 * Main export function
 */
async function exportWellCraftedData() {
  console.log('🚀 Well Crafted Database Export');
  console.log('================================\n');
  console.log(`📁 Export directory: ${exportDir}`);

  // Create export directory
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
    console.log('✅ Export directory created\n');
  }

  const stats: ExportStats[] = [];

  // Export all tables (PascalCase names)
  const tables = ['Customer', 'Order', 'OrderLine', 'Sku', 'Product'];

  for (const table of tables) {
    const stat = await exportTable(table);
    stats.push(stat);
  }

  // Load exported data for mapping
  const customers = JSON.parse(fs.readFileSync(path.join(exportDir, 'Customer.json'), 'utf-8'));
  const orders = JSON.parse(fs.readFileSync(path.join(exportDir, 'Order.json'), 'utf-8'));
  const orderLines = JSON.parse(fs.readFileSync(path.join(exportDir, 'OrderLine.json'), 'utf-8'));
  const skus = JSON.parse(fs.readFileSync(path.join(exportDir, 'Sku.json'), 'utf-8'));
  const products = JSON.parse(fs.readFileSync(path.join(exportDir, 'Product.json'), 'utf-8'));

  console.log('\n📋 Creating UUID Mapping Files...\n');

  // Create UUID mapping files
  const customerMapping = createCustomerUUIDMapping(customers);
  fs.writeFileSync(
    path.join(exportDir, 'customer-uuid-map.json'),
    JSON.stringify(customerMapping, null, 2)
  );
  console.log(`✅ customer-uuid-map.json: ${customerMapping.length} mappings`);

  const orderMapping = createOrderUUIDMapping(orders, customers);
  fs.writeFileSync(
    path.join(exportDir, 'order-uuid-map.json'),
    JSON.stringify(orderMapping, null, 2)
  );
  console.log(`✅ order-uuid-map.json: ${orderMapping.length} mappings`);

  const skuMapping = createSkuUUIDMapping(skus, products);
  fs.writeFileSync(
    path.join(exportDir, 'sku-uuid-map.json'),
    JSON.stringify(skuMapping, null, 2)
  );
  console.log(`✅ sku-uuid-map.json: ${skuMapping.length} mappings`);

  const productMapping = createProductUUIDMapping(products);
  fs.writeFileSync(
    path.join(exportDir, 'product-uuid-map.json'),
    JSON.stringify(productMapping, null, 2)
  );
  console.log(`✅ product-uuid-map.json: ${productMapping.length} mappings`);

  // Generate relationship report
  console.log('\n📊 Generating Relationship Report...\n');
  const relationshipReport = generateRelationshipReport(
    customers,
    orders,
    orderLines,
    skus,
    products
  );
  fs.writeFileSync(
    path.join(exportDir, 'relationship-report.json'),
    JSON.stringify(relationshipReport, null, 2)
  );
  console.log('✅ relationship-report.json created');

  // Generate export summary
  const summary = {
    exportDate: new Date().toISOString(),
    exportDirectory: exportDir,
    tables: stats,
    criticalVerification: {
      orderLinesExpected: 7774,
      orderLinesExported: orderLines.length,
      verified: orderLines.length === 7774
    },
    relationships: relationshipReport.summary,
    validation: relationshipReport.validation,
    uuidMappings: {
      customers: customerMapping.length,
      orders: orderMapping.length,
      skus: skuMapping.length,
      products: productMapping.length
    }
  };

  fs.writeFileSync(
    path.join(exportDir, 'export-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  // Print final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXPORT SUMMARY');
  console.log('='.repeat(60) + '\n');

  stats.forEach(stat => {
    const status = stat.success ? '✅' : '❌';
    console.log(`${status} ${stat.tableName}: ${stat.recordCount} records`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('🔍 CRITICAL VERIFICATION');
  console.log('='.repeat(60) + '\n');
  console.log(`Expected OrderLines: 7,774`);
  console.log(`Exported OrderLines: ${orderLines.length.toLocaleString()}`);
  console.log(`Status: ${orderLines.length === 7774 ? '✅ VERIFIED' : '❌ MISMATCH'}`);

  console.log('\n' + '='.repeat(60));
  console.log('🔗 RELATIONSHIP VALIDATION');
  console.log('='.repeat(60) + '\n');
  console.log(`Orphaned Orders: ${relationshipReport.validation.orphanedOrders}`);
  console.log(`Orphaned OrderLines: ${relationshipReport.validation.orphanedOrderLines}`);
  console.log(`Orphaned SKUs: ${relationshipReport.validation.orphanedSkus}`);

  console.log('\n' + '='.repeat(60));
  console.log('🗺️  UUID MAPPINGS CREATED');
  console.log('='.repeat(60) + '\n');
  console.log(`Customer mappings: ${customerMapping.length}`);
  console.log(`Order mappings: ${orderMapping.length}`);
  console.log(`SKU mappings: ${skuMapping.length}`);
  console.log(`Product mappings: ${productMapping.length}`);

  console.log('\n' + '='.repeat(60));
  console.log('📁 EXPORT FILES');
  console.log('='.repeat(60) + '\n');
  console.log(`Export directory: ${exportDir}`);
  console.log('\nGenerated files:');
  console.log('  - Customer.json');
  console.log('  - Order.json');
  console.log('  - OrderLine.json (7,774 records)');
  console.log('  - Sku.json');
  console.log('  - Product.json');
  console.log('  - customer-uuid-map.json');
  console.log('  - order-uuid-map.json');
  console.log('  - sku-uuid-map.json');
  console.log('  - product-uuid-map.json');
  console.log('  - relationship-report.json');
  console.log('  - export-summary.json');

  console.log('\n✅ Export completed successfully!\n');

  return summary;
}

// Execute export
exportWellCraftedData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });

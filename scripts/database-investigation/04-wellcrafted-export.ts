#!/usr/bin/env tsx
/**
 * Export all data from Well Crafted database
 * This will give us a complete picture of what needs to migrate
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const wellCrafted = createClient(
  'https://zqezunzlyjkseugujkrl.supabase.co',
  '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>'
);

async function exportData() {
  console.log('📤 Exporting data from Well Crafted...\n');

  // Get counts using raw SQL since PascalCase tables need quotes
  const tables = {
    Customer: 'Customer',
    Order: 'Order',
    OrderLine: 'OrderLine',
    Sku: 'Sku',
    Product: 'Product'
  };

  const report: any = {
    timestamp: new Date().toISOString(),
    database: 'Well Crafted',
    tables: {}
  };

  // Get customer sample
  const { data: customers, count: customerCount } = await wellCrafted
    .from('Customer')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`✅ Customers: ${customerCount?.toLocaleString() || 0}`);
  report.tables.Customer = { count: customerCount || 0, sample: customers };

  // Get order sample
  const { data: orders, count: orderCount } = await wellCrafted
    .from('Order')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`✅ Orders: ${orderCount?.toLocaleString() || 0}`);
  report.tables.Order = { count: orderCount || 0, sample: orders };

  // Get orderline sample
  const { data: orderlines, count: orderlineCount } = await wellCrafted
    .from('OrderLine')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`✅ OrderLines: ${orderlineCount?.toLocaleString() || 0}`);
  report.tables.OrderLine = { count: orderlineCount || 0, sample: orderlines };

  // Get SKU sample
  const { data: skus, count: skuCount } = await wellCrafted
    .from('Sku')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`✅ SKUs: ${skuCount?.toLocaleString() || 0}`);
  report.tables.Sku = { count: skuCount || 0, sample: skus };

  // Get product sample
  const { data: products, count: productCount } = await wellCrafted
    .from('Product')
    .select('*', { count: 'exact' })
    .limit(10);

  console.log(`✅ Products: ${productCount?.toLocaleString() || 0}`);
  report.tables.Product = { count: productCount || 0, sample: products };

  // Save report
  fs.writeFileSync(
    '/Users/greghogue/Leora2/docs/database-investigation/wellcrafted-export.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Export complete');
  console.log('📄 Report saved to: docs/database-investigation/wellcrafted-export.json');

  return report;
}

exportData()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Export failed:', error);
    process.exit(1);
  });

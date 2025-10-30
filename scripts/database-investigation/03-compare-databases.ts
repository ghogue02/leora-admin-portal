#!/usr/bin/env tsx
/**
 * Database Comparison Script
 * Identifies what data exists in Well Crafted but not in Lovable
 */

import { createClient } from '@supabase/supabase-js';

const wellCrafted = createClient(
  'https://zqezunzlyjkseugujkrl.supabase.co',
  '<WELL_CRAFTED_SUPABASE_SERVICE_ROLE_KEY>'
);

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

interface ComparisonReport {
  timestamp: string;
  differences: {
    customers: { inWC: number; inLovable: number; missing: number };
    orders: { inWC: number; inLovable: number; missing: number };
    orderlines: { inWC: number; inLovable: number; missing: number };
    skus: { inWC: number; inLovable: number; missing: number };
    products: { inWC: number; inLovable: number; missing: number };
  };
  missingData: {
    category: string;
    count: number;
    impact: string;
  }[];
  recommendations: string[];
}

async function compareCustomers() {
  console.log('\n👥 Comparing customers...');

  const { data: wcCustomers } = await wellCrafted
    .from('Customer')
    .select('name, email, accountNumber');

  const { data: lovableCustomers } = await lovable
    .from('customer')
    .select('name, email, accountnumber');

  const wcEmails = new Set(wcCustomers?.map(c => c.email?.toLowerCase()) || []);
  const lovableEmails = new Set(lovableCustomers?.map(c => c.email?.toLowerCase()) || []);

  const missing = [...wcEmails].filter(email => email && !lovableEmails.has(email));

  console.log(`   Well Crafted: ${wcCustomers?.length || 0}`);
  console.log(`   Lovable: ${lovableCustomers?.length || 0}`);
  console.log(`   Missing in Lovable: ${missing.length}`);

  if (missing.length > 0 && missing.length <= 10) {
    console.log(`   Missing emails: ${missing.join(', ')}`);
  }

  return {
    inWC: wcCustomers?.length || 0,
    inLovable: lovableCustomers?.length || 0,
    missing: missing.length
  };
}

async function compareSKUs() {
  console.log('\n📦 Comparing SKUs...');

  const { data: wcSkus } = await wellCrafted
    .from('Sku')
    .select('code, size');

  const { data: lovableSkus } = await lovable
    .from('skus')
    .select('code, size');

  const wcCodes = new Set(wcSkus?.map(s => s.code?.toUpperCase()) || []);
  const lovableCodes = new Set(lovableSkus?.map(s => s.code?.toUpperCase()) || []);

  const missing = [...wcCodes].filter(code => code && !lovableCodes.has(code));

  console.log(`   Well Crafted: ${wcSkus?.length || 0}`);
  console.log(`   Lovable: ${lovableSkus?.length || 0}`);
  console.log(`   Missing in Lovable: ${missing.length}`);

  if (missing.length > 0 && missing.length <= 20) {
    console.log(`   Sample missing SKUs: ${missing.slice(0, 10).join(', ')}`);
  }

  // Save full list of missing SKUs
  if (missing.length > 0) {
    const fs = require('fs');
    fs.writeFileSync(
      '/Users/greghogue/Leora2/docs/database-investigation/missing-skus.txt',
      missing.join('\n')
    );
    console.log(`   📄 Full list saved to: docs/database-investigation/missing-skus.txt`);
  }

  return {
    inWC: wcSkus?.length || 0,
    inLovable: lovableSkus?.length || 0,
    missing: missing.length
  };
}

async function compareProducts() {
  console.log('\n🍷 Comparing products...');

  const { data: wcProducts } = await wellCrafted
    .from('Product')
    .select('name, producer');

  const { data: lovableProducts } = await lovable
    .from('product')
    .select('name, producer');

  const wcNames = new Set(wcProducts?.map(p => p.name?.toLowerCase()) || []);
  const lovableNames = new Set(lovableProducts?.map(p => p.name?.toLowerCase()) || []);

  const missing = [...wcNames].filter(name => name && !lovableNames.has(name));

  console.log(`   Well Crafted: ${wcProducts?.length || 0}`);
  console.log(`   Lovable: ${lovableProducts?.length || 0}`);
  console.log(`   Missing in Lovable: ${missing.length}`);

  if (missing.length > 0 && missing.length <= 20) {
    console.log(`   Sample missing: ${missing.slice(0, 10).join(', ')}`);
  }

  return {
    inWC: wcProducts?.length || 0,
    inLovable: lovableProducts?.length || 0,
    missing: missing.length
  };
}

async function compareOrders() {
  console.log('\n📋 Comparing orders...');

  const { count: wcCount } = await wellCrafted
    .from('Order')
    .select('*', { count: 'exact', head: true });

  const { count: lovableCount } = await lovable
    .from('order')
    .select('*', { count: 'exact', head: true });

  console.log(`   Well Crafted: ${wcCount || 0}`);
  console.log(`   Lovable: ${lovableCount || 0}`);
  console.log(`   Difference: ${(wcCount || 0) - (lovableCount || 0)}`);

  return {
    inWC: wcCount || 0,
    inLovable: lovableCount || 0,
    missing: Math.max(0, (wcCount || 0) - (lovableCount || 0))
  };
}

async function compareOrderLines() {
  console.log('\n📊 Comparing orderlines...');

  const { count: wcCount } = await wellCrafted
    .from('OrderLine')
    .select('*', { count: 'exact', head: true });

  const { count: lovableCount } = await lovable
    .from('orderline')
    .select('*', { count: 'exact', head: true });

  const missing = (wcCount || 0) - (lovableCount || 0);
  const coverage = lovableCount && wcCount ? (lovableCount / wcCount) * 100 : 0;

  console.log(`   Well Crafted: ${wcCount || 0}`);
  console.log(`   Lovable: ${lovableCount || 0}`);
  console.log(`   Missing: ${missing} (${(100 - coverage).toFixed(1)}%)`);
  console.log(`   Coverage: ${coverage.toFixed(1)}%`);

  return {
    inWC: wcCount || 0,
    inLovable: lovableCount || 0,
    missing: Math.max(0, missing)
  };
}

async function analyzeSchemaAlignment() {
  console.log('\n🔍 Analyzing schema differences...');

  // Sample one record from each database to compare structure
  const { data: wcOrder } = await wellCrafted
    .from('Order')
    .select('*')
    .limit(1);

  const { data: lovableOrder } = await lovable
    .from('order')
    .select('*')
    .limit(1);

  console.log('\n   Well Crafted Order columns:');
  if (wcOrder && wcOrder[0]) {
    console.log('   ', Object.keys(wcOrder[0]).join(', '));
  }

  console.log('\n   Lovable order columns:');
  if (lovableOrder && lovableOrder[0]) {
    console.log('   ', Object.keys(lovableOrder[0]).join(', '));
  }

  // Compare column names
  const wcCols = new Set(wcOrder && wcOrder[0] ? Object.keys(wcOrder[0]) : []);
  const lovableCols = new Set(lovableOrder && lovableOrder[0] ? Object.keys(lovableOrder[0]) : []);

  const wcOnly = [...wcCols].filter(c => !lovableCols.has(c.toLowerCase()));
  const lovableOnly = [...lovableCols].filter(c => {
    const matches = [...wcCols].some(wc => wc.toLowerCase() === c);
    return !matches;
  });

  if (wcOnly.length > 0) {
    console.log(`\n   ⚠️  Columns in WC but not Lovable: ${wcOnly.join(', ')}`);
  }

  if (lovableOnly.length > 0) {
    console.log(`\n   ℹ️  Columns in Lovable but not WC: ${lovableOnly.join(', ')}`);
  }
}

async function main() {
  console.log('🔄 Database Comparison Report\n');
  console.log('=' .repeat(60));

  const report: ComparisonReport = {
    timestamp: new Date().toISOString(),
    differences: {
      customers: { inWC: 0, inLovable: 0, missing: 0 },
      orders: { inWC: 0, inLovable: 0, missing: 0 },
      orderlines: { inWC: 0, inLovable: 0, missing: 0 },
      skus: { inWC: 0, inLovable: 0, missing: 0 },
      products: { inWC: 0, inLovable: 0, missing: 0 }
    },
    missingData: [],
    recommendations: []
  };

  report.differences.customers = await compareCustomers();
  report.differences.orders = await compareOrders();
  report.differences.orderlines = await compareOrderLines();
  report.differences.skus = await compareSKUs();
  report.differences.products = await compareProducts();

  await analyzeSchemaAlignment();

  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPARISON SUMMARY\n');

  // Identify critical gaps
  if (report.differences.skus.missing > 0) {
    report.missingData.push({
      category: 'SKUs',
      count: report.differences.skus.missing,
      impact: 'HIGH - Cannot create orderlines for products using missing SKUs'
    });
    report.recommendations.push('Migrate missing SKUs from Well Crafted before importing orderlines');
  }

  if (report.differences.products.missing > 0) {
    report.missingData.push({
      category: 'Products',
      count: report.differences.products.missing,
      impact: 'MEDIUM - Missing product details for SKUs'
    });
    report.recommendations.push('Migrate missing products to maintain data completeness');
  }

  if (report.differences.orderlines.missing > 0) {
    report.missingData.push({
      category: 'OrderLines',
      count: report.differences.orderlines.missing,
      impact: 'CRITICAL - Orders show $0 revenue without orderlines'
    });
    report.recommendations.push('Prioritize orderline migration to fix revenue display');
  }

  if (report.differences.customers.missing > 0) {
    report.missingData.push({
      category: 'Customers',
      count: report.differences.customers.missing,
      impact: 'LOW - Historical customers not in current system'
    });
  }

  // Display missing data
  if (report.missingData.length > 0) {
    console.log('⚠️  MISSING DATA IN LOVABLE:\n');
    report.missingData.forEach(item => {
      console.log(`   ${item.category}: ${item.count.toLocaleString()}`);
      console.log(`   Impact: ${item.impact}\n`);
    });
  }

  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log('💡 RECOMMENDATIONS:\n');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
  }

  // Save report
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/greghogue/Leora2/docs/database-investigation/comparison-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Comparison complete');
  console.log('📄 Report saved to: docs/database-investigation/comparison-report.json');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Comparison failed:', error);
    process.exit(1);
  });

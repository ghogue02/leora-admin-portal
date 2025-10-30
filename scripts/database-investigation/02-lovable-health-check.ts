#!/usr/bin/env tsx
/**
 * Lovable Database Health Check
 * Comprehensive audit of data quality, integrity, and issues
 */

import { createClient } from '@supabase/supabase-js';

const lovable = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>'
);

interface HealthReport {
  timestamp: string;
  database: string;
  tables: {
    [key: string]: {
      totalRecords: number;
      issues: string[];
      samplesChecked: number;
    };
  };
  foreignKeyIssues: {
    table: string;
    issue: string;
    count: number;
  }[];
  dataQualityIssues: {
    category: string;
    description: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    count: number;
  }[];
  recommendations: string[];
}

async function checkCustomers() {
  console.log('\n📋 Checking customers table...');

  const { data: customers, count } = await lovable
    .from('customer')
    .select('*', { count: 'exact' });

  const issues: string[] = [];

  if (customers) {
    // Check for NULL names
    const nullNames = customers.filter(c => !c.name || c.name.trim() === '');
    if (nullNames.length > 0) {
      issues.push(`${nullNames.length} customers with NULL/empty names`);
    }

    // Check for duplicate emails
    const emails = customers.filter(c => c.email).map(c => c.email.toLowerCase());
    const duplicateEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
    if (duplicateEmails.length > 0) {
      issues.push(`${duplicateEmails.length} duplicate email addresses`);
    }

    // Check for duplicate account numbers
    const accountNumbers = customers.filter(c => c.accountnumber).map(c => c.accountnumber);
    const duplicateAccounts = accountNumbers.filter((a, i) => accountNumbers.indexOf(a) !== i);
    if (duplicateAccounts.length > 0) {
      issues.push(`${duplicateAccounts.length} duplicate account numbers`);
    }
  }

  console.log(`   Total: ${count?.toLocaleString() || 0}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ⚠️  ${i}`));
  } else {
    console.log('   ✅ No issues found');
  }

  return { totalRecords: count || 0, issues, samplesChecked: customers?.length || 0 };
}

async function checkOrders() {
  console.log('\n📋 Checking order table...');

  const { data: orders, count } = await lovable
    .from('order')
    .select('*', { count: 'exact' });

  const issues: string[] = [];

  if (orders) {
    // Check for NULL totals
    const nullTotals = orders.filter(o => o.total === null || o.total === undefined);
    if (nullTotals.length > 0) {
      issues.push(`${nullTotals.length} orders with NULL total (${((nullTotals.length / orders.length) * 100).toFixed(1)}%)`);
    }

    // Check for orders with $0 total
    const zeroTotals = orders.filter(o => o.total === 0);
    if (zeroTotals.length > 0) {
      issues.push(`${zeroTotals.length} orders with $0 total`);
    }

    // Check for invalid customer IDs (orphaned orders)
    const { data: customerIds } = await lovable
      .from('customer')
      .select('id');

    const validCustomerIds = new Set(customerIds?.map(c => c.id) || []);
    const orphanedOrders = orders.filter(o => !validCustomerIds.has(o.customerid));
    if (orphanedOrders.length > 0) {
      issues.push(`${orphanedOrders.length} orders reference non-existent customers`);
    }

    // Check for duplicate orders (same customer, date, amount)
    const orderKeys = orders.map(o => `${o.customerid}_${o.orderdate}_${o.total}`);
    const duplicates = orderKeys.filter((k, i) => orderKeys.indexOf(k) !== i);
    if (duplicates.length > 0) {
      issues.push(`${duplicates.length} potential duplicate orders`);
    }
  }

  console.log(`   Total: ${count?.toLocaleString() || 0}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ⚠️  ${i}`));
  } else {
    console.log('   ✅ No issues found');
  }

  return { totalRecords: count || 0, issues, samplesChecked: orders?.length || 0 };
}

async function checkOrderLines() {
  console.log('\n📋 Checking orderline table...');

  const { data: orderlines, count } = await lovable
    .from('orderline')
    .select('*', { count: 'exact' });

  const issues: string[] = [];

  if (orderlines) {
    // Check for invalid order IDs
    const { data: orderIds } = await lovable
      .from('order')
      .select('id');

    const validOrderIds = new Set(orderIds?.map(o => o.id) || []);
    const orphanedLines = orderlines.filter(ol => !validOrderIds.has(ol.orderid));
    if (orphanedLines.length > 0) {
      issues.push(`${orphanedLines.length} orderlines reference non-existent orders`);
    }

    // Check for invalid SKU IDs
    const { data: skuIds } = await lovable
      .from('skus')
      .select('id');

    const validSkuIds = new Set(skuIds?.map(s => s.id) || []);
    const invalidSkus = orderlines.filter(ol => !validSkuIds.has(ol.skuid));
    if (invalidSkus.length > 0) {
      issues.push(`${invalidSkus.length} orderlines reference non-existent SKUs`);
    }

    // Check for invalid quantities/prices
    const invalidQuantities = orderlines.filter(ol => ol.quantity <= 0);
    if (invalidQuantities.length > 0) {
      issues.push(`${invalidQuantities.length} orderlines with invalid quantity (<= 0)`);
    }

    const invalidPrices = orderlines.filter(ol => ol.unitprice < 0);
    if (invalidPrices.length > 0) {
      issues.push(`${invalidPrices.length} orderlines with negative unit price`);
    }
  }

  console.log(`   Total: ${count?.toLocaleString() || 0}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ⚠️  ${i}`));
  } else {
    console.log('   ✅ No issues found');
  }

  return { totalRecords: count || 0, issues, samplesChecked: orderlines?.length || 0 };
}

async function checkSKUs() {
  console.log('\n📋 Checking skus table...');

  const { data: skus, count } = await lovable
    .from('skus')
    .select('*', { count: 'exact' });

  const issues: string[] = [];

  if (skus) {
    // Check for NULL codes
    const nullCodes = skus.filter(s => !s.code || s.code.trim() === '');
    if (nullCodes.length > 0) {
      issues.push(`${nullCodes.length} SKUs with NULL/empty codes`);
    }

    // Check for duplicate codes
    const codes = skus.filter(s => s.code).map(s => s.code.toUpperCase());
    const duplicateCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
    if (duplicateCodes.length > 0) {
      issues.push(`${duplicateCodes.length} duplicate SKU codes`);
    }

    // Check for invalid product IDs
    const { data: productIds } = await lovable
      .from('product')
      .select('id');

    const validProductIds = new Set(productIds?.map(p => p.id) || []);
    const orphanedSkus = skus.filter(s => s.productid && !validProductIds.has(s.productid));
    if (orphanedSkus.length > 0) {
      issues.push(`${orphanedSkus.length} SKUs reference non-existent products`);
    }
  }

  console.log(`   Total: ${count?.toLocaleString() || 0}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ⚠️  ${i}`));
  } else {
    console.log('   ✅ No issues found');
  }

  return { totalRecords: count || 0, issues, samplesChecked: skus?.length || 0 };
}

async function checkProducts() {
  console.log('\n📋 Checking product table...');

  const { data: products, count } = await lovable
    .from('product')
    .select('*', { count: 'exact' });

  const issues: string[] = [];

  if (products) {
    // Check for NULL names
    const nullNames = products.filter(p => !p.name || p.name.trim() === '');
    if (nullNames.length > 0) {
      issues.push(`${nullNames.length} products with NULL/empty names`);
    }

    // Check for duplicate names
    const names = products.filter(p => p.name).map(p => p.name.toLowerCase().trim());
    const duplicateNames = names.filter((n, i) => names.indexOf(n) !== i);
    if (duplicateNames.length > 0) {
      issues.push(`${duplicateNames.length} potential duplicate product names`);
    }
  }

  console.log(`   Total: ${count?.toLocaleString() || 0}`);
  if (issues.length > 0) {
    issues.forEach(i => console.log(`   ⚠️  ${i}`));
  } else {
    console.log('   ✅ No issues found');
  }

  return { totalRecords: count || 0, issues, samplesChecked: products?.length || 0 };
}

async function analyzeOrderCoverage() {
  console.log('\n📊 Analyzing order coverage...');

  // Get orders with and without orderlines
  const { data: allOrders } = await lovable
    .from('order')
    .select('id, total, orderdate, customerid');

  const { data: ordersWithLines } = await lovable
    .from('orderline')
    .select('orderid');

  const orderIdsWithLines = new Set(ordersWithLines?.map(ol => ol.orderid) || []);

  const withLines = allOrders?.filter(o => orderIdsWithLines.has(o.id)) || [];
  const withoutLines = allOrders?.filter(o => !orderIdsWithLines.has(o.id)) || [];

  const coverage = allOrders ? (withLines.length / allOrders.length) * 100 : 0;

  console.log(`   Orders with orderlines: ${withLines.length.toLocaleString()} (${coverage.toFixed(1)}%)`);
  console.log(`   Orders without orderlines: ${withoutLines.length.toLocaleString()} (${(100 - coverage).toFixed(1)}%)`);

  if (withoutLines.length > 0) {
    const nullTotals = withoutLines.filter(o => o.total === null).length;
    const zeroTotals = withoutLines.filter(o => o.total === 0).length;
    const withRevenue = withoutLines.filter(o => o.total && o.total > 0).length;

    console.log(`   └─ Orders missing lines breakdown:`);
    console.log(`      NULL total: ${nullTotals}`);
    console.log(`      $0 total: ${zeroTotals}`);
    console.log(`      Has revenue (needs lines): ${withRevenue} ⚠️`);
  }

  return { coverage, withLines: withLines.length, withoutLines: withoutLines.length };
}

async function main() {
  console.log('🏥 Lovable Database Health Check\n');
  console.log('=' .repeat(60));

  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    database: 'Lovable (Production)',
    tables: {},
    foreignKeyIssues: [],
    dataQualityIssues: [],
    recommendations: []
  };

  // Check each table
  report.tables['customer'] = await checkCustomers();
  report.tables['order'] = await checkOrders();
  report.tables['orderline'] = await checkOrderLines();
  report.tables['skus'] = await checkSKUs();
  report.tables['product'] = await checkProducts();

  // Analyze coverage
  const coverage = await analyzeOrderCoverage();

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 HEALTH SUMMARY\n');

  let totalIssues = 0;
  Object.entries(report.tables).forEach(([table, data]) => {
    totalIssues += data.issues.length;
    if (data.issues.length > 0) {
      console.log(`${table}: ${data.issues.length} issue(s) found`);
    }
  });

  console.log(`\nOrder Coverage: ${coverage.coverage.toFixed(1)}%`);
  console.log(`Total Issues Found: ${totalIssues}`);

  if (coverage.withoutLines > 0) {
    console.log(`\n⚠️  CRITICAL: ${coverage.withoutLines} orders missing orderlines`);
    report.recommendations.push('Migrate remaining orderlines from Well Crafted database');
  }

  // Save report
  const fs = require('fs');
  fs.writeFileSync(
    '/Users/greghogue/Leora2/docs/database-investigation/lovable-health-report.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n✅ Health check complete');
  console.log('📄 Report saved to: docs/database-investigation/lovable-health-report.json');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Health check failed:', error);
    process.exit(1);
  });

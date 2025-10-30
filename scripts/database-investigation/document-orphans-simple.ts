#!/usr/bin/env tsx

/**
 * Simplified Orphan Documentation Script
 *
 * Documents all orphaned records using direct database queries.
 * More reliable than using stored procedures.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database Configuration
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const OUTPUT_DIR = '/Users/greghogue/Leora2/docs/database-investigation/orphans';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Utility: Convert to CSV
function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    )
  ];
  return csvRows.join('\n');
}

function saveCSV(filename: string, data: any[]): void {
  const filepath = path.join(OUTPUT_DIR, filename);
  const csv = arrayToCSV(data);
  fs.writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Saved ${data.length} records to ${filename}`);
}

// Levenshtein distance for string matching
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function similarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;
  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longerLength - editDistance) / longerLength;
}

// Main analysis functions
async function analyzeOrphanedOrders() {
  console.log('\n=== 1. Orders → Missing Customers ===');

  // Get all orders and customers
  const [{ data: allOrders }, { data: allCustomers }] = await Promise.all([
    supabase.from('order').select('*'),
    supabase.from('customer').select('id, name, email')
  ]);

  if (!allOrders || !allCustomers) {
    console.error('Failed to fetch orders or customers');
    return { category: 'Orders Missing Customers', totalOrphans: 0, recoverable: 0, unrecoverable: 0 };
  }

  const customerIds = new Set(allCustomers.map(c => c.id));
  const orphans = allOrders.filter(o => o.customerid && !customerIds.has(o.customerid));

  console.log(`Found ${orphans.length} orphaned orders`);

  // Try to match by customer name
  let recoverable = 0;
  const enriched = orphans.map(order => {
    let bestMatch = null;
    let bestScore = 0;

    if (order.customername && allCustomers) {
      for (const customer of allCustomers) {
        if (!customer.name) continue;
        const score = similarity(order.customername, customer.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = customer;
        }
      }
    }

    const isRecoverable = bestScore > 0.8;
    if (isRecoverable) recoverable++;

    return {
      ...order,
      possible_match_customer_id: bestMatch?.id || null,
      possible_match_customer_name: bestMatch?.name || null,
      match_confidence: Math.round(bestScore * 100),
      recoverable: isRecoverable
    };
  });

  saveCSV('orphaned-orders-missing-customers.csv', enriched);

  const financialImpact = enriched.reduce((sum, o) => sum + (parseFloat(o.totalamount) || 0), 0);

  return {
    category: 'Orders Missing Customers',
    totalOrphans: enriched.length,
    recoverable,
    unrecoverable: enriched.length - recoverable,
    financialImpact,
    samples: enriched.slice(0, 5)
  };
}

async function analyzeOrphanedOrderLinesMissingOrders() {
  console.log('\n=== 2. OrderLines → Missing Orders ===');

  const [{ data: allOrderLines }, { data: allOrders }] = await Promise.all([
    supabase.from('orderline').select('*'),
    supabase.from('order').select('id')
  ]);

  if (!allOrderLines || !allOrders) {
    console.error('Failed to fetch orderlines or orders');
    return { category: 'OrderLines Missing Orders', totalOrphans: 0, recoverable: 0, unrecoverable: 0 };
  }

  const orderIds = new Set(allOrders.map(o => o.id));
  const orphans = allOrderLines.filter(ol => ol.orderid && !orderIds.has(ol.orderid));

  console.log(`Found ${orphans.length} orphaned orderlines (missing orders)`);

  const enriched = orphans.map(ol => ({
    ...ol,
    recoverable: false // Difficult to recover without order context
  }));

  saveCSV('orphaned-orderlines-missing-orders.csv', enriched);

  const financialImpact = enriched.reduce((sum, ol) =>
    sum + ((parseFloat(ol.quantity) || 0) * (parseFloat(ol.unitprice) || 0)), 0
  );

  const uniqueOrderIds = [...new Set(orphans.map(o => o.orderid))];

  return {
    category: 'OrderLines Missing Orders',
    totalOrphans: enriched.length,
    recoverable: 0,
    unrecoverable: enriched.length,
    financialImpact,
    patterns: [`${uniqueOrderIds.length} unique missing order IDs`],
    samples: enriched.slice(0, 5)
  };
}

async function analyzeOrphanedOrderLinesMissingSKUs() {
  console.log('\n=== 3. OrderLines → Missing SKUs ===');

  const [{ data: allOrderLines }, { data: allSKUs }] = await Promise.all([
    supabase.from('orderline').select('*'),
    supabase.from('skus').select('id, sku, name')
  ]);

  if (!allOrderLines || !allSKUs) {
    console.error('Failed to fetch orderlines or SKUs');
    return { category: 'OrderLines Missing SKUs', totalOrphans: 0, recoverable: 0, unrecoverable: 0 };
  }

  const skuIds = new Set(allSKUs.map(s => s.id));
  const orphans = allOrderLines.filter(ol => ol.skuid && !skuIds.has(ol.skuid));

  console.log(`Found ${orphans.length} orphaned orderlines (missing SKUs)`);

  // Try to match by SKU name if available
  let recoverable = 0;
  const enriched = orphans.map(ol => {
    let bestMatch = null;
    let bestScore = 0;

    // Note: orderline table may not have SKU name directly
    // This is a placeholder for potential name matching
    const isRecoverable = false; // Conservative estimate

    return {
      ...ol,
      possible_match_sku_id: bestMatch?.id || null,
      recoverable: isRecoverable
    };
  });

  saveCSV('orphaned-orderlines-missing-skus.csv', enriched);

  const financialImpact = enriched.reduce((sum, ol) =>
    sum + ((parseFloat(ol.quantity) || 0) * (parseFloat(ol.unitprice) || 0)), 0
  );

  const uniqueSKUIds = [...new Set(orphans.map(o => o.skuid))];

  return {
    category: 'OrderLines Missing SKUs',
    totalOrphans: enriched.length,
    recoverable,
    unrecoverable: enriched.length - recoverable,
    financialImpact,
    patterns: [`${uniqueSKUIds.length} unique missing SKU IDs`],
    samples: enriched.slice(0, 5)
  };
}

async function analyzeOrphanedSKUsMissingProducts() {
  console.log('\n=== 4. SKUs → Missing Products ===');

  const [{ data: allSKUs }, { data: allProducts }] = await Promise.all([
    supabase.from('skus').select('*'),
    supabase.from('product').select('id, name')
  ]);

  if (!allSKUs || !allProducts) {
    console.error('Failed to fetch SKUs or products');
    return { category: 'SKUs Missing Products', totalOrphans: 0, recoverable: 0, unrecoverable: 0 };
  }

  const productIds = new Set(allProducts.map(p => p.id));
  const orphans = allSKUs.filter(s => s.productid && !productIds.has(s.productid));

  console.log(`Found ${orphans.length} orphaned SKUs (missing products)`);

  // Try to match by name
  let recoverable = 0;
  const enriched = orphans.map(sku => {
    let bestMatch = null;
    let bestScore = 0;

    if (sku.name && allProducts) {
      for (const product of allProducts) {
        if (!product.name) continue;
        const score = similarity(sku.name, product.name);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = product;
        }
      }
    }

    const isRecoverable = bestScore > 0.85;
    if (isRecoverable) recoverable++;

    return {
      ...sku,
      possible_match_product_id: bestMatch?.id || null,
      possible_match_product_name: bestMatch?.name || null,
      match_confidence: Math.round(bestScore * 100),
      recoverable: isRecoverable
    };
  });

  saveCSV('orphaned-skus-missing-products.csv', enriched);

  const uniqueProductIds = [...new Set(orphans.map(s => s.productid))];

  return {
    category: 'SKUs Missing Products',
    totalOrphans: enriched.length,
    recoverable,
    unrecoverable: enriched.length - recoverable,
    patterns: [`${uniqueProductIds.length} unique missing product IDs`],
    samples: enriched.slice(0, 5)
  };
}

function generateMarkdownReport(analyses: any[]) {
  const totalOrphans = analyses.reduce((sum, a) => sum + a.totalOrphans, 0);
  const totalRecoverable = analyses.reduce((sum, a) => sum + a.recoverable, 0);
  const totalFinancial = analyses.reduce((sum, a) => sum + (a.financialImpact || 0), 0);

  let md = `# Orphaned Records Analysis Summary\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Overview\n\n`;
  md += `- **Total Orphaned Records:** ${totalOrphans.toLocaleString()}\n`;
  md += `- **Recoverable:** ${totalRecoverable.toLocaleString()} (${totalOrphans > 0 ? ((totalRecoverable/totalOrphans)*100).toFixed(1) : 0}%)\n`;
  md += `- **Unrecoverable:** ${(totalOrphans - totalRecoverable).toLocaleString()}\n`;
  md += `- **Total Financial Impact:** $${totalFinancial.toLocaleString(undefined, {minimumFractionDigits: 2})}\n\n`;

  md += `## Category Breakdown\n\n`;

  for (const a of analyses) {
    md += `### ${a.category}\n\n`;
    md += `- **Total:** ${a.totalOrphans.toLocaleString()}\n`;
    md += `- **Recoverable:** ${a.recoverable.toLocaleString()}\n`;
    md += `- **Unrecoverable:** ${a.unrecoverable.toLocaleString()}\n`;
    if (a.financialImpact !== undefined) {
      md += `- **Financial Impact:** $${a.financialImpact.toLocaleString(undefined, {minimumFractionDigits: 2})}\n`;
    }
    if (a.patterns) {
      md += `\n**Patterns:**\n`;
      a.patterns.forEach((p: string) => md += `- ${p}\n`);
    }
    md += `\n**Sample Records:**\n\`\`\`json\n${JSON.stringify(a.samples, null, 2)}\n\`\`\`\n\n`;
  }

  md += `## Recommendations\n\n`;
  md += `1. Review ${totalRecoverable} potentially recoverable records\n`;
  md += `2. Archive all CSV files for audit trail\n`;
  md += `3. Investigate root causes of orphaning\n`;
  md += `4. Approve deletion of ${totalOrphans - totalRecoverable} unrecoverable records\n\n`;

  md += `## Generated Files\n\n`;
  md += `- orphaned-orders-missing-customers.csv (${analyses[0]?.totalOrphans || 0} records)\n`;
  md += `- orphaned-orderlines-missing-orders.csv (${analyses[1]?.totalOrphans || 0} records)\n`;
  md += `- orphaned-orderlines-missing-skus.csv (${analyses[2]?.totalOrphans || 0} records)\n`;
  md += `- orphaned-skus-missing-products.csv (${analyses[3]?.totalOrphans || 0} records)\n`;

  return md;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ORPHANED RECORDS DOCUMENTATION TOOL                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // Ensure output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('\n📊 Starting analysis...\n');

  const [a1, a2, a3, a4] = await Promise.all([
    analyzeOrphanedOrders(),
    analyzeOrphanedOrderLinesMissingOrders(),
    analyzeOrphanedOrderLinesMissingSKUs(),
    analyzeOrphanedSKUsMissingProducts()
  ]);

  const analyses = [a1, a2, a3, a4];

  // Generate reports
  const markdown = generateMarkdownReport(analyses);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'orphan-analysis-summary.md'), markdown, 'utf-8');
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'orphan-analysis-summary.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), analyses }, null, 2),
    'utf-8'
  );

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                   ANALYSIS COMPLETE                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const total = analyses.reduce((s, a) => s + a.totalOrphans, 0);
  const recoverable = analyses.reduce((s, a) => s + a.recoverable, 0);
  const financial = analyses.reduce((s, a) => s + (a.financialImpact || 0), 0);

  console.log(`\n📊 Total Orphans: ${total.toLocaleString()}`);
  console.log(`✅ Recoverable: ${recoverable.toLocaleString()}`);
  console.log(`❌ Unrecoverable: ${(total - recoverable).toLocaleString()}`);
  console.log(`💰 Financial Impact: $${financial.toLocaleString(undefined, {minimumFractionDigits: 2})}`);
  console.log(`\n📁 Output: ${OUTPUT_DIR}`);
}

main();

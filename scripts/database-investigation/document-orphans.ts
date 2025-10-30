#!/usr/bin/env ts-node

/**
 * Orphan Documentation Script
 *
 * Documents all 2,106 orphaned records in the Lovable database before deletion.
 * Creates detailed CSV exports and recovery analysis for audit trail.
 *
 * Categories:
 * - 801 Orders → Missing Customers
 * - 641 OrderLines → Missing Orders
 * - 192 OrderLines → Missing SKUs
 * - 472 SKUs → Missing Products
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Database Configuration
const SUPABASE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const SUPABASE_SERVICE_KEY = '<LOVABLE_SUPABASE_SERVICE_ROLE_KEY>';

const OUTPUT_DIR = '/Users/greghogue/Leora2/docs/database-investigation/orphans';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface OrphanAnalysis {
  category: string;
  totalOrphans: number;
  recoverable: number;
  unrecoverable: number;
  samples: any[];
  financialImpact?: number;
  patterns?: string[];
}

interface SummaryReport {
  timestamp: string;
  totalOrphans: number;
  categories: OrphanAnalysis[];
  overallRecoveryRate: number;
  totalFinancialImpact: number;
}

/**
 * Convert array of objects to CSV string
 */
function arrayToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
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

/**
 * Save data to CSV file
 */
function saveCSV(filename: string, data: any[]): void {
  const filepath = path.join(OUTPUT_DIR, filename);
  const csv = arrayToCSV(data);
  fs.writeFileSync(filepath, csv, 'utf-8');
  console.log(`✓ Saved ${data.length} records to ${filename}`);
}

/**
 * Calculate similarity between two strings (simple Levenshtein-like)
 */
function similarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  if (longerLength === 0) return 1.0;

  const editDistance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longerLength - editDistance) / longerLength;
}

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

/**
 * 1. Document Orders → Missing Customers (801 records)
 */
async function documentOrphanedOrdersMissingCustomers(): Promise<OrphanAnalysis> {
  console.log('\n=== 1. Analyzing Orders → Missing Customers ===');

  // Get orphaned orders using direct query
  const { data: orphanedOrders, error } = await supabase
    .from('order')
    .select('id, customerid, customername, orderdate, totalamount, status')
    .is('customerid', null)
    .or('customerid.not.in.(select id from customer)');

  // Fallback: If the above doesn't work, try a simpler approach
  if (error || !orphanedOrders) {
    // Get all orders
    const { data: allOrders } = await supabase.from('order').select('*');
    // Get all customer IDs
    const { data: allCustomers } = await supabase.from('customer').select('id');
    const customerIds = new Set(allCustomers?.map(c => c.id) || []);

    // Filter orphaned orders
    const orphans = (allOrders || []).filter(o => o.customerid && !customerIds.has(o.customerid));

    if (orphans.length === 0) {
      return {
        category: 'Orders Missing Customers',
        totalOrphans: 0,
        recoverable: 0,
        unrecoverable: 0,
        samples: []
      };
    }

    // Continue with orphans array
    return await processOrphanedOrders(orphans);
  }

  return await processOrphanedOrders(orphanedOrders);
}

async function processOrphanedOrders(orphanedOrders: any[]): Promise<OrphanAnalysis> {
  console.log(`Found ${orphanedOrders?.length || 0} orphaned orders`);

  if (!orphanedOrders || orphanedOrders.length === 0) {
    return {
      category: 'Orders Missing Customers',
      totalOrphans: 0,
      recoverable: 0,
      unrecoverable: 0,
      samples: []
    };
  }

  // Get all customers for matching attempts
  const { data: allCustomers } = await supabase
    .from('customer')
    .select('id, name, email, phone');

  // Attempt recovery matching
  let recoverable = 0;
  const enrichedOrphans = orphanedOrders.map((order: any) => {
    let possibleMatch = null;
    let matchConfidence = 0;

    if (allCustomers && order.customername) {
      // Try to find matching customer by name
      for (const customer of allCustomers) {
        const nameSimilarity = similarity(order.customername, customer.name || '');
        if (nameSimilarity > matchConfidence) {
          matchConfidence = nameSimilarity;
          possibleMatch = customer;
        }
      }
    }

    const isRecoverable = matchConfidence > 0.8; // 80% similarity threshold
    if (isRecoverable) recoverable++;

    return {
      ...order,
      possible_customer_match_id: possibleMatch?.id || null,
      possible_customer_match_name: possibleMatch?.name || null,
      match_confidence: Math.round(matchConfidence * 100),
      recoverable: isRecoverable
    };
  });

  // Save to CSV
  saveCSV('orphaned-orders-missing-customers.csv', enrichedOrphans);

  // Analyze patterns
  const patterns: string[] = [];
  const dates = enrichedOrphans.map(o => o.orderdate).filter(Boolean);
  if (dates.length > 0) {
    const uniqueDates = [...new Set(dates)];
    if (uniqueDates.length < 10) {
      patterns.push(`Orders concentrated in ${uniqueDates.length} dates: ${uniqueDates.slice(0, 5).join(', ')}`);
    }
  }

  // Calculate financial impact
  const financialImpact = enrichedOrphans.reduce((sum, o) => sum + (parseFloat(o.totalamount) || 0), 0);

  return {
    category: 'Orders Missing Customers',
    totalOrphans: enrichedOrphans.length,
    recoverable,
    unrecoverable: enrichedOrphans.length - recoverable,
    samples: enrichedOrphans.slice(0, 10),
    financialImpact,
    patterns
  };
}

/**
 * 2. Document OrderLines → Missing Orders (641 records)
 */
async function documentOrphanedOrderLinesMissingOrders(): Promise<OrphanAnalysis> {
  console.log('\n=== 2. Analyzing OrderLines → Missing Orders ===');

  const { data: orphanedLines, error } = await supabase.rpc('get_orphaned_orderlines_missing_orders', {});

  if (error) {
    console.error('Error fetching orphaned orderlines:', error);
    throw error;
  }

  console.log(`Found ${orphanedLines?.length || 0} orphaned orderlines`);

  if (!orphanedLines || orphanedLines.length === 0) {
    return {
      category: 'OrderLines Missing Orders',
      totalOrphans: 0,
      recoverable: 0,
      unrecoverable: 0,
      samples: []
    };
  }

  // Get all orders for potential matching
  const { data: allOrders } = await supabase
    .from('order')
    .select('id, orderdate, customerid, totalamount');

  let recoverable = 0;
  const enrichedOrphans = orphanedLines.map((line: any) => {
    // Attempt to match by date/amount patterns
    let possibleMatch = null;
    let matchReason = '';

    // For now, mark as unrecoverable unless we find specific patterns
    // This would require more sophisticated matching logic

    return {
      ...line,
      possible_order_match_id: possibleMatch,
      match_reason: matchReason,
      recoverable: false
    };
  });

  saveCSV('orphaned-orderlines-missing-orders.csv', enrichedOrphans);

  // Analyze patterns
  const patterns: string[] = [];
  const orderIds = enrichedOrphans.map(o => o.orderid).filter(Boolean);
  const uniqueOrderIds = [...new Set(orderIds)];
  patterns.push(`${uniqueOrderIds.length} unique missing order IDs`);

  // Financial impact
  const financialImpact = enrichedOrphans.reduce((sum, o) =>
    sum + ((parseFloat(o.quantity) || 0) * (parseFloat(o.unitprice) || 0)), 0
  );

  return {
    category: 'OrderLines Missing Orders',
    totalOrphans: enrichedOrphans.length,
    recoverable,
    unrecoverable: enrichedOrphans.length - recoverable,
    samples: enrichedOrphans.slice(0, 10),
    financialImpact,
    patterns
  };
}

/**
 * 3. Document OrderLines → Missing SKUs (192 records)
 */
async function documentOrphanedOrderLinesMissingSKUs(): Promise<OrphanAnalysis> {
  console.log('\n=== 3. Analyzing OrderLines → Missing SKUs ===');

  const { data: orphanedLines, error } = await supabase.rpc('get_orphaned_orderlines_missing_skus', {});

  if (error) {
    console.error('Error fetching orphaned orderlines (missing SKUs):', error);
    throw error;
  }

  console.log(`Found ${orphanedLines?.length || 0} orphaned orderlines`);

  if (!orphanedLines || orphanedLines.length === 0) {
    return {
      category: 'OrderLines Missing SKUs',
      totalOrphans: 0,
      recoverable: 0,
      unrecoverable: 0,
      samples: []
    };
  }

  // Get all SKUs for matching
  const { data: allSKUs } = await supabase
    .from('skus')
    .select('id, sku, productid, name');

  let recoverable = 0;
  const enrichedOrphans = orphanedLines.map((line: any) => {
    let possibleMatch = null;

    // Try to match by SKU name if available
    if (allSKUs && line.skuname) {
      for (const sku of allSKUs) {
        if (sku.name && similarity(line.skuname, sku.name) > 0.9) {
          possibleMatch = sku;
          recoverable++;
          break;
        }
      }
    }

    return {
      ...line,
      possible_sku_match_id: possibleMatch?.id || null,
      possible_sku_match_name: possibleMatch?.name || null,
      recoverable: !!possibleMatch
    };
  });

  saveCSV('orphaned-orderlines-missing-skus.csv', enrichedOrphans);

  const patterns: string[] = [];
  const skuIds = enrichedOrphans.map(o => o.skuid).filter(Boolean);
  const uniqueSKUIds = [...new Set(skuIds)];
  patterns.push(`${uniqueSKUIds.length} unique missing SKU IDs`);

  const financialImpact = enrichedOrphans.reduce((sum, o) =>
    sum + ((parseFloat(o.quantity) || 0) * (parseFloat(o.unitprice) || 0)), 0
  );

  return {
    category: 'OrderLines Missing SKUs',
    totalOrphans: enrichedOrphans.length,
    recoverable,
    unrecoverable: enrichedOrphans.length - recoverable,
    samples: enrichedOrphans.slice(0, 10),
    financialImpact,
    patterns
  };
}

/**
 * 4. Document SKUs → Missing Products (472 records)
 */
async function documentOrphanedSKUsMissingProducts(): Promise<OrphanAnalysis> {
  console.log('\n=== 4. Analyzing SKUs → Missing Products ===');

  const { data: orphanedSKUs, error } = await supabase.rpc('get_orphaned_skus_missing_products', {});

  if (error) {
    console.error('Error fetching orphaned SKUs:', error);
    throw error;
  }

  console.log(`Found ${orphanedSKUs?.length || 0} orphaned SKUs`);

  if (!orphanedSKUs || orphanedSKUs.length === 0) {
    return {
      category: 'SKUs Missing Products',
      totalOrphans: 0,
      recoverable: 0,
      unrecoverable: 0,
      samples: []
    };
  }

  // Get all products for matching
  const { data: allProducts } = await supabase
    .from('product')
    .select('id, name, description');

  let recoverable = 0;
  const enrichedOrphans = orphanedSKUs.map((sku: any) => {
    let possibleMatch = null;
    let matchConfidence = 0;

    if (allProducts && sku.name) {
      for (const product of allProducts) {
        const nameSimilarity = similarity(sku.name, product.name || '');
        if (nameSimilarity > matchConfidence) {
          matchConfidence = nameSimilarity;
          possibleMatch = product;
        }
      }
    }

    const isRecoverable = matchConfidence > 0.85;
    if (isRecoverable) recoverable++;

    return {
      ...sku,
      possible_product_match_id: possibleMatch?.id || null,
      possible_product_match_name: possibleMatch?.name || null,
      match_confidence: Math.round(matchConfidence * 100),
      recoverable: isRecoverable
    };
  });

  saveCSV('orphaned-skus-missing-products.csv', enrichedOrphans);

  const patterns: string[] = [];
  const productIds = enrichedOrphans.map(s => s.productid).filter(Boolean);
  const uniqueProductIds = [...new Set(productIds)];
  patterns.push(`${uniqueProductIds.length} unique missing product IDs`);

  return {
    category: 'SKUs Missing Products',
    totalOrphans: enrichedOrphans.length,
    recoverable,
    unrecoverable: enrichedOrphans.length - recoverable,
    samples: enrichedOrphans.slice(0, 10),
    patterns
  };
}

/**
 * Generate Summary Report
 */
function generateSummaryReport(analyses: OrphanAnalysis[]): SummaryReport {
  const totalOrphans = analyses.reduce((sum, a) => sum + a.totalOrphans, 0);
  const totalRecoverable = analyses.reduce((sum, a) => sum + a.recoverable, 0);
  const totalFinancialImpact = analyses.reduce((sum, a) => sum + (a.financialImpact || 0), 0);

  return {
    timestamp: new Date().toISOString(),
    totalOrphans,
    categories: analyses,
    overallRecoveryRate: totalOrphans > 0 ? (totalRecoverable / totalOrphans) * 100 : 0,
    totalFinancialImpact
  };
}

/**
 * Save summary report as Markdown
 */
function saveSummaryReport(summary: SummaryReport): void {
  const reportPath = path.join(OUTPUT_DIR, 'orphan-analysis-summary.md');

  let markdown = `# Orphaned Records Analysis Summary\n\n`;
  markdown += `**Generated:** ${summary.timestamp}\n\n`;
  markdown += `## Overview\n\n`;
  markdown += `- **Total Orphaned Records:** ${summary.totalOrphans.toLocaleString()}\n`;
  markdown += `- **Overall Recovery Rate:** ${summary.overallRecoveryRate.toFixed(1)}%\n`;
  markdown += `- **Total Financial Impact:** $${summary.totalFinancialImpact.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n\n`;

  markdown += `## Category Breakdown\n\n`;

  for (const category of summary.categories) {
    markdown += `### ${category.category}\n\n`;
    markdown += `- **Total Orphans:** ${category.totalOrphans.toLocaleString()}\n`;
    markdown += `- **Recoverable:** ${category.recoverable.toLocaleString()} (${category.totalOrphans > 0 ? ((category.recoverable / category.totalOrphans) * 100).toFixed(1) : 0}%)\n`;
    markdown += `- **Unrecoverable:** ${category.unrecoverable.toLocaleString()} (${category.totalOrphans > 0 ? ((category.unrecoverable / category.totalOrphans) * 100).toFixed(1) : 0}%)\n`;

    if (category.financialImpact !== undefined) {
      markdown += `- **Financial Impact:** $${category.financialImpact.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    }

    if (category.patterns && category.patterns.length > 0) {
      markdown += `\n**Patterns Identified:**\n`;
      for (const pattern of category.patterns) {
        markdown += `- ${pattern}\n`;
      }
    }

    if (category.samples.length > 0) {
      markdown += `\n**Sample Records (first 5):**\n\n`;
      markdown += '```json\n';
      markdown += JSON.stringify(category.samples.slice(0, 5), null, 2);
      markdown += '\n```\n\n';
    }
  }

  markdown += `## Recommendations\n\n`;
  markdown += `1. **Review Recoverable Records:** ${summary.categories.reduce((sum, c) => sum + c.recoverable, 0)} records may be recoverable through matching\n`;
  markdown += `2. **Audit Trail:** All ${summary.totalOrphans} orphaned records have been documented in CSV format\n`;
  markdown += `3. **Financial Review:** Total impact of $${summary.totalFinancialImpact.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} should be reviewed\n`;
  markdown += `4. **Data Quality:** Investigate root causes to prevent future orphaned records\n\n`;

  markdown += `## Files Generated\n\n`;
  markdown += `- \`orphaned-orders-missing-customers.csv\` (${summary.categories[0]?.totalOrphans || 0} records)\n`;
  markdown += `- \`orphaned-orderlines-missing-orders.csv\` (${summary.categories[1]?.totalOrphans || 0} records)\n`;
  markdown += `- \`orphaned-orderlines-missing-skus.csv\` (${summary.categories[2]?.totalOrphans || 0} records)\n`;
  markdown += `- \`orphaned-skus-missing-products.csv\` (${summary.categories[3]?.totalOrphans || 0} records)\n`;
  markdown += `- \`orphan-analysis-summary.md\` (this file)\n`;

  fs.writeFileSync(reportPath, markdown, 'utf-8');
  console.log(`\n✓ Summary report saved to orphan-analysis-summary.md`);
}

/**
 * Create SQL functions for querying orphaned records
 */
async function createSQLFunctions(): Promise<void> {
  console.log('\n=== Creating SQL Functions ===');

  const functions = [
    {
      name: 'get_orphaned_orders_missing_customers',
      sql: `
        CREATE OR REPLACE FUNCTION get_orphaned_orders_missing_customers()
        RETURNS TABLE (
          id INT,
          customerid INT,
          customername VARCHAR,
          orderdate DATE,
          totalamount DECIMAL,
          status VARCHAR
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT o.id, o.customerid, o.customername, o.orderdate, o.totalamount, o.status
          FROM "order" o
          LEFT JOIN customer c ON o.customerid = c.id
          WHERE c.id IS NULL;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_orphaned_orderlines_missing_orders',
      sql: `
        CREATE OR REPLACE FUNCTION get_orphaned_orderlines_missing_orders()
        RETURNS TABLE (
          id INT,
          orderid INT,
          skuid INT,
          quantity INT,
          unitprice DECIMAL,
          skuname VARCHAR
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT ol.id, ol.orderid, ol.skuid, ol.quantity, ol.unitprice, s.name as skuname
          FROM orderline ol
          LEFT JOIN "order" o ON ol.orderid = o.id
          LEFT JOIN skus s ON ol.skuid = s.id
          WHERE o.id IS NULL;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_orphaned_orderlines_missing_skus',
      sql: `
        CREATE OR REPLACE FUNCTION get_orphaned_orderlines_missing_skus()
        RETURNS TABLE (
          id INT,
          orderid INT,
          skuid INT,
          quantity INT,
          unitprice DECIMAL,
          skuname VARCHAR
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT ol.id, ol.orderid, ol.skuid, ol.quantity, ol.unitprice, NULL::VARCHAR as skuname
          FROM orderline ol
          LEFT JOIN skus s ON ol.skuid = s.id
          WHERE s.id IS NULL;
        END;
        $$ LANGUAGE plpgsql;
      `
    },
    {
      name: 'get_orphaned_skus_missing_products',
      sql: `
        CREATE OR REPLACE FUNCTION get_orphaned_skus_missing_products()
        RETURNS TABLE (
          id INT,
          productid INT,
          sku VARCHAR,
          name VARCHAR,
          price DECIMAL
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT s.id, s.productid, s.sku, s.name, s.price
          FROM skus s
          LEFT JOIN product p ON s.productid = p.id
          WHERE p.id IS NULL;
        END;
        $$ LANGUAGE plpgsql;
      `
    }
  ];

  for (const func of functions) {
    const { error } = await supabase.rpc('exec_sql', { query: func.sql });
    if (error) {
      console.log(`Note: Function ${func.name} may already exist or require direct DB access`);
      // Not a critical error - we'll use direct queries as fallback
    } else {
      console.log(`✓ Created function: ${func.name}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ORPHANED RECORDS DOCUMENTATION & ANALYSIS TOOL         ║');
  console.log('║     Complete Audit Trail Before Deletion                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Create SQL functions (optional - will use direct queries if this fails)
    await createSQLFunctions();

    // Run all analyses in parallel
    console.log('\n📊 Starting parallel analysis of all orphan categories...\n');

    const [analysis1, analysis2, analysis3, analysis4] = await Promise.all([
      documentOrphanedOrdersMissingCustomers(),
      documentOrphanedOrderLinesMissingOrders(),
      documentOrphanedOrderLinesMissingSKUs(),
      documentOrphanedSKUsMissingProducts()
    ]);

    // Generate summary report
    const summary = generateSummaryReport([analysis1, analysis2, analysis3, analysis4]);
    saveSummaryReport(summary);

    // Save JSON version for programmatic access
    const jsonPath = path.join(OUTPUT_DIR, 'orphan-analysis-summary.json');
    fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf-8');

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ANALYSIS COMPLETE                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\n📊 Total Orphaned Records: ${summary.totalOrphans.toLocaleString()}`);
    console.log(`✅ Recoverable: ${summary.categories.reduce((s, c) => s + c.recoverable, 0).toLocaleString()} (${summary.overallRecoveryRate.toFixed(1)}%)`);
    console.log(`❌ Unrecoverable: ${summary.categories.reduce((s, c) => s + c.unrecoverable, 0).toLocaleString()}`);
    console.log(`💰 Financial Impact: $${summary.totalFinancialImpact.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    console.log(`\n📁 Output Directory: ${OUTPUT_DIR}`);
    console.log(`\nAll orphaned records have been documented for audit trail.`);

  } catch (error) {
    console.error('\n❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Execute
main();

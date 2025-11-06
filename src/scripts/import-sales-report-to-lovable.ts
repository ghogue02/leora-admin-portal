#!/usr/bin/env tsx
/**
 * Import Sales Report CSV to Lovable Supabase
 * Based on: SALES_REPORT_IMPORT_GUIDE.md
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  '***SUPABASE_JWT_REMOVED***'
);

// Get tenant ID (WellCrafted tenant in Lovable)
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed'; // Well Crafted Wine & Beverage Co.

interface CSVRow {
  invoiceNumber: string;
  invoiceDate: string;
  status: string;
  customer: string;
  salesperson: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  country: string;
  postal: string;
  sku: string;
  item: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  netPrice: number;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n');
  const rows: CSVRow[] = [];

  // Skip first 3 lines (headers)
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    if (cols.length < 26) continue;

    rows.push({
      invoiceNumber: cols[0],
      invoiceDate: cols[1],
      status: cols[8],
      customer: cols[9],
      salesperson: cols[10],
      address1: cols[11],
      address2: cols[12],
      city: cols[13],
      state: cols[14],
      country: cols[15],
      postal: cols[16],
      sku: cols[18],
      item: cols[19],
      supplier: cols[20],
      quantity: parseFloat(cols[21]) || 0,
      unitPrice: parseFloat(cols[24]?.replace(/,/g, '') || '0'),
      netPrice: parseFloat(cols[25]?.replace(/,/g, '') || '0'),
    });
  }

  return rows;
}

async function matchOrCreateCustomer(customerName: string, row: CSVRow): Promise<string | null> {
  // Try to find existing customer
  const { data: existing } = await supabase
    .from('customer')
    .select('id')
    .eq('tenantid', TENANT_ID)
    .ilike('name', customerName)
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customer')
    .insert({
      tenantid: TENANT_ID,
      name: customerName,
      street1: row.address1 || null,
      street2: row.address2 || null,
      address: [row.address1, row.address2].filter(Boolean).join(', ') || null,
      city: row.city || null,
      state: row.state || null,
      zipcode: row.postal || null,
      country: row.country || 'United States',
      riskstatus: 'HEALTHY',
      establishedrevenue: 0,
      ispermanentlyclosed: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Error creating customer ${customerName}:`, error.message);
    return null;
  }

  return newCustomer.id;
}

async function matchOrCreateProduct(itemName: string, supplier: string): Promise<string | null> {
  // Try to find existing product
  const { data: existing } = await supabase
    .from('product')
    .select('id')
    .eq('tenantid', TENANT_ID)
    .ilike('name', itemName)
    .limit(1)
    .single();

  if (existing) {
    return existing.id;
  }

  // Create new product
  const { data: newProduct, error } = await supabase
    .from('product')
    .insert({
      tenantid: TENANT_ID,
      sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: itemName,
      description: `Imported from sales report - Supplier: ${supplier}`,
      producer: supplier,
      unitprice: 0, // Will be set from order line
      isactive: true,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Error creating product ${itemName}:`, error.message);
    return null;
  }

  return newProduct.id;
}

async function importSalesReport() {
  console.log('🚀 Importing Sales Report to Lovable\n');

  // Read CSV file
  const csvPath = resolve(__dirname, '../../Sales report 2025-09-26 to 2025-10-22.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');

  console.log('📄 Parsing CSV...');
  const rows = parseCSV(csvContent);
  console.log(`✅ Parsed ${rows.length} line items\n`);

  // Group by invoice
  const invoiceMap = new Map<string, CSVRow[]>();
  rows.forEach(row => {
    if (!invoiceMap.has(row.invoiceNumber)) {
      invoiceMap.set(row.invoiceNumber, []);
    }
    invoiceMap.get(row.invoiceNumber)!.push(row);
  });

  console.log(`📦 Found ${invoiceMap.size} unique invoices\n`);

  let ordersCreated = 0;
  let ordersSkipped = 0;
  let orderLinesCreated = 0;
  let customersCreated = 0;
  let productsCreated = 0;
  let errors = 0;

  // Process each invoice
  let index = 0;
  for (const [invoiceNumber, invoiceRows] of invoiceMap.entries()) {
    index++;
    const firstRow = invoiceRows[0];

    try {
      // Check for duplicate
      const { data: existingOrder } = await supabase
        .from('order')
        .select('id')
        .eq('ordernumber', invoiceNumber)
        .limit(1)
        .single();

      if (existingOrder) {
        ordersSkipped++;
        if (index % 10 === 0) {
          console.log(`  Progress: ${index}/${invoiceMap.size} invoices (${ordersCreated} created, ${ordersSkipped} skipped)`);
        }
        continue;
      }

      // Match or create customer
      const customerId = await matchOrCreateCustomer(firstRow.customer, firstRow);
      if (!customerId) {
        errors++;
        continue;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('order')
        .insert({
          tenantid: TENANT_ID,
          customerid: customerId,
          ordernumber: invoiceNumber,
          orderdate: new Date(firstRow.invoiceDate).toISOString(),
          status: firstRow.status.toUpperCase() === 'DELIVERED' ? 'FULFILLED' : 'SUBMITTED',
          subtotal: 0, // Will calculate
          tax: 0,
          total: 0,
        })
        .select('id')
        .single();

      if (orderError) {
        console.error(`Error creating order ${invoiceNumber}:`, orderError.message);
        errors++;
        continue;
      }

      ordersCreated++;

      // Create order lines
      let orderTotal = 0;
      for (const row of invoiceRows) {
        // Match or create product
        const productId = await matchOrCreateProduct(row.item, row.supplier);
        if (!productId) continue;

        const { error: lineError } = await supabase
          .from('orderline')
          .insert({
            orderid: order.id,
            skuid: productId, // Using product ID as SKU ID for now
            quantity: row.quantity,
            unitprice: row.unitPrice,
            discount: 0,
            issample: false,
          });

        if (!lineError) {
          orderLinesCreated++;
          orderTotal += row.netPrice;
        }
      }

      // Update order total
      await supabase
        .from('order')
        .update({
          subtotal: orderTotal * 0.9,
          tax: orderTotal * 0.1,
          total: orderTotal,
        })
        .eq('id', order.id);

      if (index % 10 === 0) {
        console.log(`  Progress: ${index}/${invoiceMap.size} invoices (${ordersCreated} created, ${ordersSkipped} skipped)`);
      }

    } catch (error: any) {
      console.error(`Error processing invoice ${invoiceNumber}:`, error.message);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('🎉 IMPORT COMPLETE');
  console.log('='.repeat(70));
  console.log(`\n📊 Results:`);
  console.log(`  Total Invoices: ${invoiceMap.size}`);
  console.log(`  Orders Created: ${ordersCreated}`);
  console.log(`  Orders Skipped: ${ordersSkipped}`);
  console.log(`  Order Lines Created: ${orderLinesCreated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\n✅ Success Rate: ${((ordersCreated / invoiceMap.size) * 100).toFixed(1)}%\n`);
}

importSalesReport().catch(console.error);

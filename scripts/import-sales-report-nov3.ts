import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

interface SalesReportRow {
  invoiceNumber: string;
  invoiceDate: string;
  postedDate: string;
  dueDate: string;
  purchaseOrderNumber: string;
  deliveryStartTime: string;
  deliveryEndTime: string;
  specialInstructions: string;
  status: string;
  customer: string;
  salesperson: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingProvince: string;
  shippingCountry: string;
  shippingPostalCode: string;
  itemNumber: string;
  sku: string;
  item: string;
  supplier: string;
  qty: string;
  cases: string;
  liters: string;
  unitPrice: string;
  netPrice: string;
}

interface ImportStats {
  totalRows: number;
  uniqueInvoices: number;
  uniqueCustomers: number;
  uniqueSkus: number;
  existingInvoices: number;
  newInvoices: number;
  skippedRows: number;
  missingCustomers: string[];
  missingSkus: string[];
  createdOrders: number;
  createdOrderLines: number;
  createdInvoices: number;
  errors: Array<{ row: number; error: string }>;
}

async function importSalesReport(csvPath: string) {
  console.log('🚀 Starting sales report import...\n');
  console.log(`📁 File: ${csvPath}\n`);

  const stats: ImportStats = {
    totalRows: 0,
    uniqueInvoices: 0,
    uniqueCustomers: 0,
    uniqueSkus: 0,
    existingInvoices: 0,
    newInvoices: 0,
    skippedRows: 0,
    missingCustomers: [],
    missingSkus: [],
    createdOrders: 0,
    createdOrderLines: 0,
    createdInvoices: 0,
    errors: []
  };

  try {
    // Read and parse CSV
    console.log('📖 Reading CSV file...');
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: [
        'invoiceNumber',
        'invoiceDate',
        'postedDate',
        'dueDate',
        'purchaseOrderNumber',
        'deliveryStartTime',
        'deliveryEndTime',
        'specialInstructions',
        'status',
        'customer',
        'salesperson',
        'shippingAddress1',
        'shippingAddress2',
        'shippingCity',
        'shippingProvince',
        'shippingCountry',
        'shippingPostalCode',
        'itemNumber',
        'sku',
        'item',
        'supplier',
        'qty',
        'cases',
        'liters',
        'unitPrice',
        'netPrice'
      ],
      skip_empty_lines: true,
      from_line: 5, // Skip header rows
      relax_column_count: true
    }) as SalesReportRow[];

    console.log(`✅ Parsed ${records.length} rows\n`);
    stats.totalRows = records.length;

    // Get tenant ID
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      throw new Error('No tenant found in database');
    }
    const tenantId = tenant.id;

    // Collect unique values
    const invoiceNumbers = new Set<string>();
    const customerNames = new Set<string>();
    const skuCodes = new Set<string>();

    records.forEach(row => {
      if (row.invoiceNumber && row.invoiceNumber.match(/^\d+$/)) {
        invoiceNumbers.add(row.invoiceNumber);
      }
      if (row.customer) customerNames.add(row.customer);
      if (row.sku) skuCodes.add(row.sku);
    });

    stats.uniqueInvoices = invoiceNumbers.size;
    stats.uniqueCustomers = customerNames.size;
    stats.uniqueSkus = skuCodes.size;

    console.log('📊 Data Summary:');
    console.log(`   • ${stats.uniqueInvoices} unique invoices`);
    console.log(`   • ${stats.uniqueCustomers} unique customers`);
    console.log(`   • ${stats.uniqueSkus} unique SKUs\n`);

    // Check for existing invoices
    console.log('🔍 Checking for existing invoices...');
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        invoiceNumber: { in: Array.from(invoiceNumbers) }
      },
      select: { invoiceNumber: true }
    });

    const existingInvoiceNumbers = new Set(
      existingInvoices.map(inv => inv.invoiceNumber).filter(Boolean) as string[]
    );
    stats.existingInvoices = existingInvoiceNumbers.size;
    console.log(`   ✅ Found ${stats.existingInvoices} existing invoices (will skip)`);
    console.log(`   📝 ${stats.uniqueInvoices - stats.existingInvoices} new invoices to import\n`);

    // Validate customers
    console.log('👥 Validating customers...');
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        name: { in: Array.from(customerNames) }
      },
      select: { id: true, name: true }
    });

    const customerMap = new Map(customers.map(c => [c.name, c.id]));
    const missingCustomers = Array.from(customerNames).filter(
      name => !customerMap.has(name)
    );

    if (missingCustomers.length > 0) {
      console.log(`   ⚠️  Found ${missingCustomers.length} missing customers:`);
      missingCustomers.forEach(name => console.log(`      - ${name}`));
      console.log(`   📝 Creating missing customers...\n`);

      // Create missing customers
      for (const name of missingCustomers) {
        try {
          const newCustomer = await prisma.customer.create({
            data: {
              tenantId,
              name,
              accountNumber: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            }
          });
          customerMap.set(name, newCustomer.id);
          console.log(`      ✅ Created customer: ${name}`);
        } catch (error) {
          console.error(`      ❌ Failed to create customer ${name}:`, error);
          stats.missingCustomers.push(name);
        }
      }
      console.log();
    } else {
      console.log(`   ✅ All customers found in database\n`);
    }

    // Validate SKUs
    console.log('🏷️  Validating SKUs...');
    const skus = await prisma.sku.findMany({
      where: {
        code: { in: Array.from(skuCodes) }
      },
      select: { id: true, code: true, productId: true }
    });

    const skuMap = new Map(skus.map(s => [s.code, s]));
    stats.missingSkus = Array.from(skuCodes).filter(code => !skuMap.has(code));

    if (stats.missingSkus.length > 0) {
      console.log(`   ⚠️  Found ${stats.missingSkus.length} missing SKUs - rows will be skipped:`);
      stats.missingSkus.slice(0, 10).forEach(code => console.log(`      - ${code}`));
      if (stats.missingSkus.length > 10) {
        console.log(`      ... and ${stats.missingSkus.length - 10} more`);
      }
      console.log();
    } else {
      console.log(`   ✅ All SKUs found in database\n`);
    }

    // Group records by invoice
    console.log('📦 Grouping line items by invoice...');
    const invoiceGroups = new Map<string, SalesReportRow[]>();

    for (const row of records) {
      if (!row.invoiceNumber || !row.invoiceNumber.match(/^\d+$/)) {
        continue;
      }

      if (!invoiceGroups.has(row.invoiceNumber)) {
        invoiceGroups.set(row.invoiceNumber, []);
      }
      invoiceGroups.get(row.invoiceNumber)!.push(row);
    }

    console.log(`   ✅ Grouped into ${invoiceGroups.size} invoices\n`);

    // Import invoices
    console.log('💾 Starting import process...\n');

    for (const [invoiceNumber, lineItems] of invoiceGroups) {
      try {
        // Skip if invoice already exists
        if (existingInvoiceNumbers.has(invoiceNumber)) {
          stats.skippedRows += lineItems.length;
          continue;
        }

        // Get first line item for invoice-level data
        const firstItem = lineItems[0];

        // Validate customer
        const customerId = customerMap.get(firstItem.customer);
        if (!customerId) {
          console.log(`   ⚠️  Skipping invoice ${invoiceNumber}: customer "${firstItem.customer}" not found`);
          stats.skippedRows += lineItems.length;
          stats.errors.push({
            row: records.indexOf(firstItem),
            error: `Customer not found: ${firstItem.customer}`
          });
          continue;
        }

        // Validate all line items have valid SKUs
        const invalidLineItems = lineItems.filter(item => !skuMap.has(item.sku));
        if (invalidLineItems.length > 0) {
          console.log(`   ⚠️  Skipping invoice ${invoiceNumber}: ${invalidLineItems.length} items have missing SKUs`);
          stats.skippedRows += lineItems.length;
          continue;
        }

        // Parse dates
        const invoiceDate = new Date(firstItem.invoiceDate);
        const postedDate = firstItem.postedDate ? new Date(firstItem.postedDate) : null;
        const dueDate = firstItem.dueDate ? new Date(firstItem.dueDate) : null;

        // Calculate totals
        const subtotal = lineItems.reduce((sum, item) => {
          const netPrice = parseFloat(item.netPrice) || 0;
          return sum + netPrice;
        }, 0);

        // Create order with line items
        const order = await prisma.order.create({
          data: {
            tenantId,
            customerId,
            status: firstItem.status === 'Delivered' ? 'DELIVERED' : 'PENDING',
            orderedAt: invoiceDate,
            deliveredAt: firstItem.status === 'Delivered' ? postedDate : null,
            total: subtotal,
            currency: 'USD',
            lines: {
              create: lineItems.map(item => {
                const sku = skuMap.get(item.sku)!;
                const qty = parseInt(item.qty) || 0;
                const unitPrice = parseFloat(item.unitPrice) || 0;
                const netPrice = parseFloat(item.netPrice) || 0;

                return {
                  tenantId,
                  productId: sku.productId,
                  skuId: sku.id,
                  quantity: qty,
                  unitPrice,
                  subtotal: netPrice,
                  total: netPrice
                };
              })
            }
          }
        });

        stats.createdOrders++;
        stats.createdOrderLines += lineItems.length;

        // Create invoice
        const invoice = await prisma.invoice.create({
          data: {
            tenantId,
            orderId: order.id,
            customerId,
            invoiceNumber,
            status: 'PAID',
            subtotal,
            total: subtotal,
            issuedAt: invoiceDate,
            dueDate,
            salesperson: firstItem.salesperson,
            poNumber: firstItem.purchaseOrderNumber || undefined,
            specialInstructions: firstItem.specialInstructions || undefined,
            shippingMethod: firstItem.status === 'Delivered' ? 'DELIVERED' : undefined,
            shipDate: firstItem.status === 'Delivered' ? postedDate : undefined
          }
        });

        stats.createdInvoices++;
        stats.newInvoices++;

        console.log(`   ✅ Invoice ${invoiceNumber}: ${lineItems.length} items, $${subtotal.toFixed(2)}`);

      } catch (error) {
        console.error(`   ❌ Error importing invoice ${invoiceNumber}:`, error);
        stats.errors.push({
          row: records.indexOf(lineItems[0]),
          error: error instanceof Error ? error.message : String(error)
        });
        stats.skippedRows += lineItems.length;
      }
    }

    // Print final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT COMPLETE - Final Report');
    console.log('='.repeat(60));
    console.log('\n✅ SUCCESS:');
    console.log(`   • Orders created: ${stats.createdOrders}`);
    console.log(`   • Order lines created: ${stats.createdOrderLines}`);
    console.log(`   • Invoices created: ${stats.createdInvoices}`);

    if (stats.existingInvoices > 0) {
      console.log(`\n⏭️  SKIPPED (Already Existed):`);
      console.log(`   • Invoices: ${stats.existingInvoices}`);
      console.log(`   • Line items: ${stats.skippedRows}`);
    }

    if (stats.missingCustomers.length > 0) {
      console.log(`\n⚠️  MISSING CUSTOMERS (Created):`);
      console.log(`   • Count: ${stats.missingCustomers.length}`);
      stats.missingCustomers.forEach(name => console.log(`      - ${name}`));
    }

    if (stats.missingSkus.length > 0) {
      console.log(`\n❌ MISSING SKUs (Rows Skipped):`);
      console.log(`   • Count: ${stats.missingSkus.length}`);
      stats.missingSkus.slice(0, 10).forEach(code => console.log(`      - ${code}`));
      if (stats.missingSkus.length > 10) {
        console.log(`      ... and ${stats.missingSkus.length - 10} more`);
      }
    }

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  ERRORS:`);
      console.log(`   • Count: ${stats.errors.length}`);
      stats.errors.slice(0, 5).forEach(err => {
        console.log(`      Row ${err.row}: ${err.error}`);
      });
      if (stats.errors.length > 5) {
        console.log(`      ... and ${stats.errors.length - 5} more errors`);
      }
    }

    console.log('\n' + '='.repeat(60));

    return stats;

  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run import
const csvPath = process.argv[2] || '../Sales report 2025-10-27 to 2025-11-02.csv';
importSalesReport(csvPath)
  .then(() => {
    console.log('\n✅ Import script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import script failed:', error);
    process.exit(1);
  });

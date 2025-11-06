import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

async function verifyCsvImport() {
  try {
    // Read CSV invoice numbers
    const csvInvoices = readFileSync('/tmp/csv_invoices.txt', 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean);

    console.log('Verifying CSV import...\n');
    console.log(`CSV Invoices: ${csvInvoices.length}`);

    // Check which ones exist in database
    const found = await prisma.invoice.findMany({
      where: {
        invoiceNumber: { in: csvInvoices }
      },
      select: { invoiceNumber: true }
    });

    const foundSet = new Set(
      found.map(inv => inv.invoiceNumber).filter(Boolean) as string[]
    );

    const missing = csvInvoices.filter(num => !foundSet.has(num));

    console.log(`Found in DB: ${found.length}`);
    console.log(`Missing from DB: ${missing.length}`);

    if (missing.length > 0) {
      console.log('\n❌ Missing invoice numbers:');
      missing.forEach(num => console.log(`   ${num}`));
    } else {
      console.log('\n✅ ALL INVOICES FROM CSV ARE IN DATABASE!');
    }

    // Get line items count for these invoices
    const invoicesWithLines = await prisma.invoice.findMany({
      where: {
        invoiceNumber: { in: csvInvoices }
      },
      select: {
        invoiceNumber: true,
        order: {
          select: {
            lines: {
              select: { id: true }
            }
          }
        }
      }
    });

    const totalLines = invoicesWithLines.reduce(
      (sum, inv) => sum + inv.order.lines.length,
      0
    );

    console.log(`\nOrder Lines for these invoices: ${totalLines}`);
    console.log(`Expected from CSV: 362`);

    if (totalLines === 362) {
      console.log('✅ Line item count matches!');
    } else {
      console.log(`⚠️  Line item count mismatch: ${totalLines} vs 362`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCsvImport();

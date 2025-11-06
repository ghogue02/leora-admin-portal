/**
 * Migrate Existing Customers to Invoice State Codes
 *
 * This script backfills the new invoiceStateCode, isTaxExempt, and taxExemptNumber
 * fields for all existing customers.
 *
 * Logic:
 * - invoiceStateCode defaults to customer's state field (VA, MD, DC, etc.)
 * - If customer has TAX_EXEMPT license type, use "TE" and set isTaxExempt = true
 * - If customer name suggests government/federal, mark as tax exempt
 *
 * Usage:
 *   npx tsx scripts/migrate-customer-invoice-codes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = '4a0b7f08-fef5-4ab3-9c61-f1e263f91b06';

async function main() {
  console.log('🔄 Migrating customer invoice state codes...\n');

  try {
    // Get all customers that need migration
    const customers = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        invoiceStateCode: null, // Only customers not yet migrated
      },
      select: {
        id: true,
        name: true,
        state: true,
        licenseType: true,
        territory: true,
      },
    });

    console.log(`Found ${customers.length} customers to migrate\n`);

    let taxExemptCount = 0;
    let stateCodeCount: Record<string, number> = {};

    for (const customer of customers) {
      let invoiceStateCode: string;
      let isTaxExempt = false;

      // Check if customer is tax exempt
      const nameLower = customer.name.toLowerCase();
      const territoryLower = (customer.territory || '').toLowerCase();

      const isTaxExemptCustomer =
        customer.licenseType === 'TAX_EXEMPT' ||
        customer.licenseType?.includes('EXEMPT') ||
        nameLower.includes('government') ||
        nameLower.includes('embassy') ||
        nameLower.includes('federal') ||
        nameLower.includes('military') ||
        nameLower.includes('air force') ||
        nameLower.includes('naval') ||
        nameLower.includes('army') ||
        territoryLower.includes('federal') ||
        territoryLower.includes('military');

      if (isTaxExemptCustomer) {
        invoiceStateCode = 'TE';
        isTaxExempt = true;
        taxExemptCount++;
      } else {
        // Use customer's state, or VA as default
        invoiceStateCode = customer.state || 'VA';
      }

      // Count by state code
      stateCodeCount[invoiceStateCode] = (stateCodeCount[invoiceStateCode] || 0) + 1;

      // Update customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          invoiceStateCode,
          isTaxExempt,
        },
      });
    }

    console.log('✅ Migration complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total customers migrated: ${customers.length}`);
    console.log(`   Tax exempt customers: ${taxExemptCount}`);
    console.log('\n📍 Customers by invoice state code:');

    Object.entries(stateCodeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        console.log(`   ${code}: ${count} customers`);
      });

    console.log('\n🎯 Invoice Number Examples:');
    console.log('   First VA invoice for Jan 2, 2026: VA260001');
    console.log('   First TE invoice for Jan 2, 2026: TE260001');
    console.log('   First MD invoice for Jan 2, 2026: MD260001');
    console.log('\n✅ Customers are now ready for new invoice numbering system!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

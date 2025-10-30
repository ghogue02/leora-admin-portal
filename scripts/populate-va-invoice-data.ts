/**
 * Populate VA Invoice Data
 *
 * Utility script to populate wholesaler info and sample ABC codes
 *
 * Usage: npx tsx scripts/populate-va-invoice-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function main() {
  console.log('🚀 Populating VA Invoice Data\n');

  try {
    // ============================================
    // Step 1: Update Tenant with Wholesaler Info
    // ============================================
    console.log('📋 Step 1: Updating Tenant with Wholesaler Info...');

    const tenant = await prisma.tenant.update({
      where: { id: TENANT_ID },
      data: {
        wholesalerLicenseNumber: '013293496',
        wholesalerPhone: '571-359-6227',
      },
    });

    console.log(`  ✅ Updated tenant: ${tenant.name}`);
    console.log(`     License: ${tenant.wholesalerLicenseNumber}`);
    console.log(`     Phone: ${tenant.wholesalerPhone}`);

    // ============================================
    // Step 2: Add Sample ABC Codes to SKUs
    // ============================================
    console.log('\n📋 Step 2: Adding Sample ABC Codes to SKUs...');

    // Common VA ABC codes for wine (examples)
    const sampleAbcCodes = [
      { pattern: 'SAF', code: '12198 - 06-E' },      // Sauvignon Blanc example
      { pattern: 'SPA', code: '81394 - 14-A' },      // Sangria example
      { pattern: 'CAVA', code: '44156 - 06-C' },     // Sparkling example
      { pattern: 'ROS', code: '23456 - 11-B' },      // Rosé example
      { pattern: 'CAB', code: '34567 - 12-A' },      // Cabernet example
      { pattern: 'CHAR', code: '45678 - 06-D' },     // Chardonnay example
    ];

    let updatedCount = 0;

    for (const { pattern, code } of sampleAbcCodes) {
      const result = await prisma.sku.updateMany({
        where: {
          tenantId: TENANT_ID,
          code: { startsWith: pattern },
          abcCodeNumber: null, // Only update if not already set
        },
        data: {
          abcCodeNumber: code,
        },
      });

      if (result.count > 0) {
        console.log(`  ✅ Updated ${result.count} SKUs with pattern "${pattern}" to code ${code}`);
        updatedCount += result.count;
      }
    }

    console.log(`\n  📊 Total SKUs updated: ${updatedCount}`);

    // ============================================
    // Step 3: Initialize Default Tax Rules
    // ============================================
    console.log('\n📋 Step 3: Initializing Default Tax Rules...');

    const now = new Date();

    // VA Wine Excise Tax
    await prisma.taxRule.upsert({
      where: {
        id: '00000000-0000-0000-0000-000000000001', // Fixed ID for idempotency
      },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: TENANT_ID,
        state: 'VA',
        taxType: 'EXCISE',
        rate: 0.40, // $0.40 per liter
        perUnit: 'LITER',
        effective: now,
      },
    });

    console.log('  ✅ VA excise tax rule created ($0.40/liter)');

    // VA Sales Tax
    await prisma.taxRule.upsert({
      where: {
        id: '00000000-0000-0000-0000-000000000002', // Fixed ID
      },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        tenantId: TENANT_ID,
        state: 'VA',
        taxType: 'SALES',
        rate: 0.053, // 5.3%
        perUnit: 'DOLLAR',
        effective: now,
      },
    });

    console.log('  ✅ VA sales tax rule created (5.3%)');

    // ============================================
    // Step 4: Add License Numbers to VA Customers (Sample)
    // ============================================
    console.log('\n📋 Step 4: Adding Sample License Numbers to VA Customers...');

    // Update Total Wine McLean with their license number (if exists)
    const totalWineUpdated = await prisma.customer.updateMany({
      where: {
        tenantId: TENANT_ID,
        name: { contains: 'Total Wine', mode: 'insensitive' },
        city: { contains: 'McLean', mode: 'insensitive' },
        state: 'VA',
      },
      data: {
        licenseNumber: 'VA-ABC-RETAIL-4216',
        licenseType: 'RETAILER',
      },
    });

    if (totalWineUpdated.count > 0) {
      console.log(`  ✅ Updated Total Wine McLean with license info`);
    }

    // Count VA customers without license numbers
    const vaCustomersWithoutLicense = await prisma.customer.count({
      where: {
        tenantId: TENANT_ID,
        state: 'VA',
        licenseNumber: null,
      },
    });

    console.log(`  📊 VA customers without license numbers: ${vaCustomersWithoutLicense}`);
    console.log(`     (These can be added manually as needed)`);

    // ============================================
    // Summary
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SUCCESS! VA Invoice Data Population Complete');
    console.log('='.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   • Tenant wholesaler info: ✅ Updated`);
    console.log(`   • SKUs with ABC codes: ${updatedCount} SKUs`);
    console.log(`   • Tax rules created: 2 rules (excise + sales)`);
    console.log(`   • Sample licenses added: ${totalWineUpdated.count} customers`);

    console.log('\n🎯 Next Steps:');
    console.log('   1. Create test order with VA customer');
    console.log('   2. Create invoice from order');
    console.log('   3. Download PDF and review');
    console.log('   4. Verify format matches sample invoices');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

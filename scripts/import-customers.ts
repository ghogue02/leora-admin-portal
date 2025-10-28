import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Use direct URL to bypass connection pooler
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

// Use tenant from environment
const TENANT_ID = process.env.DEFAULT_TENANT_SLUG || 'well-crafted';

interface CustomerRow {
  companyName: string;
  firstName: string;
  lastName: string;
  salutation: string;
  phone: string;
  email: string;
  billingEmail: string;
  website: string;
  balance: string;
  sales12Month: string;
  lastOrder: string;
  salesperson: string;
  deliveryTime: string;
  specialInstructions: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  fullAddress: string;
  licenseNumber: string;
  taxNumber: string;
}

async function importCustomers() {
  console.log('📥 Starting customer import...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '../../Export customers 2025-10-25.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV (skip first 3 rows - sep, title, blank)
  const records = parse(fileContent, {
    columns: [
      'companyName', 'firstName', 'lastName', 'salutation',
      'phone', 'email', 'billingEmail', 'website',
      'balance', 'sales12Month', 'lastOrder', 'salesperson',
      'deliveryTime', 'specialInstructions',
      'addressLine1', 'addressLine2', 'city', 'state',
      'country', 'postalCode', 'fullAddress',
      'licenseNumber', 'taxNumber'
    ],
    from: 5, // Start from row 5 (after headers)
    skip_empty_lines: true,
    relax_column_count: true,
  }) as CustomerRow[];

  console.log(`📊 Found ${records.length} rows in CSV\n`);

  // Group by company name
  const companiesMap = new Map<string, CustomerRow[]>();

  for (const record of records) {
    if (!record.companyName) continue;

    const existing = companiesMap.get(record.companyName) || [];
    existing.push(record);
    companiesMap.set(record.companyName, existing);
  }

  console.log(`🏢 Found ${companiesMap.size} unique companies\n`);

  // Import each company
  let imported = 0;
  let skipped = 0;

  for (const [companyName, rows] of companiesMap.entries()) {
    try {
      const mainRow = rows[0]; // Use first row for main company data

      // Parse last order date
      let lastOrderDate: Date | null = null;
      if (mainRow.lastOrder && mainRow.lastOrder.trim()) {
        const parsed = new Date(mainRow.lastOrder);
        if (!isNaN(parsed.getTime())) {
          lastOrderDate = parsed;
        }
      }

      // Parse balance and sales
      const balance = parseFloat(mainRow.balance) || 0;
      const sales12Month = parseFloat(mainRow.sales12Month) || 0;

      // Determine territory from state
      const territory = mainRow.state || 'Unknown';

      // Create customer
      await prisma.customer.create({
        data: {
          tenantId: TENANT_ID,
          name: companyName,
          email: mainRow.email || undefined,
          phone: mainRow.phone || undefined,
          website: mainRow.website || undefined,

          // Address
          address: mainRow.addressLine1 || undefined,
          address2: mainRow.addressLine2 || undefined,
          city: mainRow.city || undefined,
          state: mainRow.state || undefined,
          country: mainRow.country || undefined,
          postalCode: mainRow.postalCode || undefined,

          // Business data
          licenseNumber: mainRow.licenseNumber || undefined,
          taxId: mainRow.taxNumber || undefined,

          // Order data
          lastOrderDate,

          // Territory
          territory,

          // Notes
          notes: mainRow.specialInstructions || undefined,

          // Will be set by classification
          accountType: null,
          accountPriority: null,
        }
      });

      imported++;

      if (imported % 100 === 0) {
        console.log(`  ✅ Imported ${imported} companies...`);
      }

    } catch (error: any) {
      console.error(`  ❌ Failed to import ${companyName}:`, error.message);
      skipped++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  • Imported: ${imported} customers`);
  console.log(`  • Skipped: ${skipped} customers`);
}

async function classifyCustomers() {
  console.log('\n📊 Classifying customers...\n');

  const today = new Date();
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const twelveMonthsAgo = new Date(today);
  twelveMonthsAgo.setMonth(today.getMonth() - 12);

  // Classify ACTIVE (ordered in last 6 months)
  const activeCount = await prisma.customer.updateMany({
    where: {
      lastOrderDate: {
        gte: sixMonthsAgo
      }
    },
    data: {
      accountType: 'ACTIVE',
      accountPriority: 'HIGH'
    }
  });

  console.log(`  ✅ ACTIVE: ${activeCount.count} customers`);

  // Classify TARGET (ordered 6-12 months ago)
  const targetCount = await prisma.customer.updateMany({
    where: {
      lastOrderDate: {
        gte: twelveMonthsAgo,
        lt: sixMonthsAgo
      }
    },
    data: {
      accountType: 'TARGET',
      accountPriority: 'MEDIUM'
    }
  });

  console.log(`  ✅ TARGET: ${targetCount.count} customers`);

  // Classify PROSPECT (never ordered or >12 months)
  const prospectCount = await prisma.customer.updateMany({
    where: {
      OR: [
        { lastOrderDate: null },
        { lastOrderDate: { lt: twelveMonthsAgo } }
      ]
    },
    data: {
      accountType: 'PROSPECT',
      accountPriority: 'LOW'
    }
  });

  console.log(`  ✅ PROSPECT: ${prospectCount.count} customers`);

  console.log('\n🎉 Classification complete!');
}

async function main() {
  try {
    await importCustomers();
    await classifyCustomers();

    // Show summary
    console.log('\n📊 Final Summary:\n');

    const summary = await prisma.customer.groupBy({
      by: ['accountType', 'accountPriority'],
      _count: true,
      orderBy: {
        accountType: 'asc'
      }
    });

    for (const row of summary) {
      console.log(`  ${row.accountType} (${row.accountPriority}): ${row._count} customers`);
    }

    const total = await prisma.customer.count();
    console.log(`\n  Total: ${total} customers\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

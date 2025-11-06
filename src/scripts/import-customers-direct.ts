import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

// Use correct connection format that worked before
const connectionUrl = "postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionUrl
    }
  }
});

// Get tenant ID from database (will be fetched at runtime)
let TENANT_ID: string;

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
  console.log('📥 Starting customer import (using direct connection)...\n');

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
  console.log(`🔄 Starting import with batching (100 companies per batch)...\n`);

  // Import in batches to handle large dataset
  const companies = Array.from(companiesMap.entries());
  const batchSize = 100;
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < companies.length; i += batchSize) {
    const batch = companies.slice(i, i + batchSize);

    for (const [companyName, rows] of batch) {
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

        // Create customer with correct field mappings
        await prisma.customer.create({
          data: {
            tenantId: TENANT_ID,
            name: companyName,
            billingEmail: mainRow.email || undefined,
            phone: mainRow.phone || undefined,

            // Address (using correct field names: street1, street2)
            street1: mainRow.addressLine1 || undefined,
            street2: mainRow.addressLine2 || undefined,
            city: mainRow.city || undefined,
            state: mainRow.state || undefined,
            country: mainRow.country || undefined,
            postalCode: mainRow.postalCode || undefined,

            // Order data
            lastOrderDate,

            // Territory
            territory,

            // Will be set by classification
            accountType: null,
            accountPriority: null,
          }
        });

        imported++;

        if (imported % 50 === 0) {
          console.log(`  ✅ Imported ${imported} companies...`);
        }

      } catch (error: any) {
        console.error(`  ❌ Failed to import ${companyName}:`, error.message);
        skipped++;
      }
    }

    // Small delay between batches to avoid overwhelming the connection
    if (i + batchSize < companies.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`  • Imported: ${imported} customers`);
  console.log(`  • Skipped: ${skipped} customers (duplicates or errors)`);
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
      tenantId: TENANT_ID,
      lastOrderDate: {
        gte: sixMonthsAgo
      }
    },
    data: {
      accountType: 'ACTIVE',
      accountPriority: 'HIGH'
    }
  });

  console.log(`  ✅ ACTIVE: ${activeCount.count} customers (ordered in last 6 months)`);

  // Classify TARGET (ordered 6-12 months ago)
  const targetCount = await prisma.customer.updateMany({
    where: {
      tenantId: TENANT_ID,
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

  console.log(`  ✅ TARGET: ${targetCount.count} customers (ordered 6-12 months ago)`);

  // Classify PROSPECT (never ordered or >12 months)
  const prospectCount = await prisma.customer.updateMany({
    where: {
      tenantId: TENANT_ID,
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

  console.log(`  ✅ PROSPECT: ${prospectCount.count} customers (never ordered or >12 months ago)`);

  console.log('\n🎉 Classification complete!');
}

async function main() {
  try {
    // Test connection first
    console.log('🔌 Testing database connection...\n');
    const result = await prisma.$queryRaw<any[]>`SELECT current_database(), current_user;`;
    console.log('✅ Connected to database:', result[0]);
    console.log('');

    // Get or create tenant
    console.log('🏢 Finding tenant...\n');
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('Creating default tenant...\n');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Well Crafted Wine & Beverage Co.',
          domain: 'well-crafted',
        }
      });
    }

    TENANT_ID = tenant.id;
    console.log(`✅ Using tenant: ${tenant.name} (${TENANT_ID})\n`);

    await importCustomers();
    await classifyCustomers();

    // Show summary
    console.log('\n📊 Final Summary:\n');

    const summary = await prisma.customer.groupBy({
      by: ['accountType', 'accountPriority'],
      _count: true,
      where: {
        tenantId: TENANT_ID
      },
      orderBy: {
        accountType: 'asc'
      }
    });

    for (const row of summary) {
      console.log(`  ${row.accountType} (${row.accountPriority}): ${row._count} customers`);
    }

    const total = await prisma.customer.count({
      where: { tenantId: TENANT_ID }
    });
    console.log(`\n  Total: ${total} customers in ${TENANT_ID} tenant\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

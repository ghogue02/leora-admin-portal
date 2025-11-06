#!/usr/bin/env tsx
/**
 * Import Customer Payment Terms from SAGE Mapping CSV
 *
 * This script imports payment terms from the Excel macro customer mapping
 * into the database Customer.paymentTerms field.
 *
 * Source: /docs/sage-customer-mapping.csv
 *
 * Usage:
 *   npx tsx scripts/import-customer-payment-terms.ts
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

const prisma = new PrismaClient();

interface CustomerMapping {
  'Customer ID (Sage Format)': string;
  'Customer (Hal Format)': string;
  'Terms': string;
}

async function importPaymentTerms() {
  console.log('🚀 Starting customer payment terms import...\n');

  // Read CSV file
  const csvPath = path.join(process.cwd(), '../docs/sage-customer-mapping.csv');
  console.log(`📄 Reading: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found at ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as CustomerMapping[];

  console.log(`📊 Found ${records.length} customer mappings\n`);

  // Get tenant ID (assuming single tenant for now)
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    throw new Error('No tenant found in database');
  }
  console.log(`🏢 Using tenant: ${tenant.name} (${tenant.id})\n`);

  // Import payment terms
  let updated = 0;
  let notFound = 0;
  let errors = 0;

  const notFoundCustomers: string[] = [];

  for (const record of records) {
    const halName = record['Customer (Hal Format)'];
    const sageName = record['Customer ID (Sage Format)'];
    const paymentTerms = record['Terms'];

    if (!halName || !paymentTerms) {
      console.log(`⚠️  Skipping empty row`);
      continue;
    }

    try {
      // Try to find customer by exact HAL name match
      let customer = await prisma.customer.findFirst({
        where: {
          tenantId: tenant.id,
          name: halName
        }
      });

      // If not found, try SAGE name
      if (!customer) {
        customer = await prisma.customer.findFirst({
          where: {
            tenantId: tenant.id,
            name: sageName
          }
        });
      }

      // If still not found, try case-insensitive search
      if (!customer) {
        customer = await prisma.customer.findFirst({
          where: {
            tenantId: tenant.id,
            OR: [
              { name: { contains: halName, mode: 'insensitive' } },
              { name: { contains: sageName, mode: 'insensitive' } }
            ]
          }
        });
      }

      if (customer) {
        // Update payment terms
        await prisma.customer.update({
          where: { id: customer.id },
          data: { paymentTerms }
        });

        updated++;
        console.log(`✅ ${customer.name}: "${paymentTerms}"`);
      } else {
        notFound++;
        notFoundCustomers.push(halName);
        console.log(`❌ Not found: ${halName} (SAGE: ${sageName})`);
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error updating ${halName}:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Updated: ${updated} customers`);
  console.log(`❌ Not found: ${notFound} customers`);
  console.log(`⚠️  Errors: ${errors}`);
  console.log('='.repeat(60));

  if (notFoundCustomers.length > 0) {
    console.log('\n📋 Customers not found in database:');
    console.log('These may be old/archived customers or name mismatches:');
    notFoundCustomers.forEach((name, idx) => {
      console.log(`${idx + 1}. ${name}`);
    });
  }

  // Show payment terms distribution
  console.log('\n📊 Payment Terms Distribution:');
  const termCounts = await prisma.customer.groupBy({
    by: ['paymentTerms'],
    where: {
      tenantId: tenant.id,
      paymentTerms: { not: null }
    },
    _count: true
  });

  termCounts
    .sort((a, b) => b._count - a._count)
    .forEach(({ paymentTerms, _count }) => {
      console.log(`  ${_count.toString().padStart(3)} customers: ${paymentTerms}`);
    });

  console.log('\n✨ Import complete!\n');
}

// Run the import
importPaymentTerms()
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Update Customer Emails from CSV Mapping
 *
 * Updates customer emails in the database using the parsed CSV data.
 * Handles multiple update strategies.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

interface EmailMappingData {
  generatedAt: string;
  totalMappings: number;
  mappings: Record<string, string>;
}

interface UpdateStats {
  totalCustomers: number;
  customersWithEmails: number;
  customersMissingEmails: number;
  emailsUpdatedFromCSV: number;
  emailsAlreadyPresent: number;
  customersNotFound: number;
  placeholdersCreated: number;
}

/**
 * Load email mappings from JSON file
 */
function loadEmailMappings(filePath: string): EmailMappingData {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Get current database statistics
 */
async function getDatabaseStats(): Promise<Partial<UpdateStats>> {
  const total = await prisma.customer.count({
    where: { tenantId: TENANT_ID }
  });

  const withEmails = await prisma.customer.count({
    where: {
      tenantId: TENANT_ID,
      email: { not: null }
    }
  });

  return {
    totalCustomers: total,
    customersWithEmails: withEmails,
    customersMissingEmails: total - withEmails
  };
}

/**
 * Update customer emails from CSV mapping
 */
async function updateEmailsFromMapping(
  mappings: Record<string, string>
): Promise<UpdateStats> {
  const initialStats = await getDatabaseStats();

  let emailsUpdatedFromCSV = 0;
  let emailsAlreadyPresent = 0;
  let customersNotFound = 0;

  console.log(`\n📊 Initial Database State:`);
  console.log(`   Total customers: ${initialStats.totalCustomers}`);
  console.log(`   With emails: ${initialStats.customersWithEmails}`);
  console.log(`   Missing emails: ${initialStats.customersMissingEmails}`);
  console.log(`\n🔄 Updating emails from CSV mapping...`);

  for (const [companyName, email] of Object.entries(mappings)) {
    try {
      // Find customers by company name
      const customers = await prisma.customer.findMany({
        where: {
          tenantId: TENANT_ID,
          name: companyName
        }
      });

      if (customers.length === 0) {
        customersNotFound++;
        continue;
      }

      // Update each matching customer
      for (const customer of customers) {
        if (customer.email) {
          emailsAlreadyPresent++;
          continue;
        }

        await prisma.customer.update({
          where: { id: customer.id },
          data: { email }
        });

        emailsUpdatedFromCSV++;
      }

      // Progress indicator
      if (emailsUpdatedFromCSV % 100 === 0) {
        console.log(`   ✓ Updated ${emailsUpdatedFromCSV} emails...`);
      }
    } catch (error) {
      console.error(`   ⚠️  Error updating ${companyName}:`, error);
    }
  }

  const finalStats = await getDatabaseStats();

  return {
    totalCustomers: finalStats.totalCustomers!,
    customersWithEmails: finalStats.customersWithEmails!,
    customersMissingEmails: finalStats.customersMissingEmails!,
    emailsUpdatedFromCSV,
    emailsAlreadyPresent,
    customersNotFound,
    placeholdersCreated: 0
  };
}

/**
 * Create placeholder emails for remaining customers
 */
async function createPlaceholderEmails(
  strategy: 'none' | 'placeholder' | 'noemail'
): Promise<number> {
  if (strategy === 'none') {
    return 0;
  }

  const customersWithoutEmail = await prisma.customer.findMany({
    where: {
      tenantId: TENANT_ID,
      email: null
    },
    select: { id: true, name: true }
  });

  if (customersWithoutEmail.length === 0) {
    return 0;
  }

  console.log(`\n📝 Creating ${strategy} emails for ${customersWithoutEmail.length} remaining customers...`);

  let updated = 0;

  for (const customer of customersWithoutEmail) {
    let placeholderEmail: string;

    if (strategy === 'placeholder') {
      // Create unique placeholder from company name
      const sanitized = customer.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 50);
      placeholderEmail = `${sanitized}.${customer.id.substring(0, 8)}@placeholder.local`;
    } else {
      // Use generic noemail marker
      placeholderEmail = 'noemail@wellcrafted.com';
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { email: placeholderEmail }
    });

    updated++;

    if (updated % 100 === 0) {
      console.log(`   ✓ Created ${updated} ${strategy} emails...`);
    }
  }

  return updated;
}

/**
 * Print update statistics
 */
function printStats(stats: UpdateStats): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EMAIL UPDATE RESULTS');
  console.log('='.repeat(60));
  console.log('\n📈 Database State:');
  console.log(`   Total Customers: ${stats.totalCustomers}`);
  console.log(`   With Emails: ${stats.customersWithEmails} (${Math.round(stats.customersWithEmails / stats.totalCustomers * 100)}%)`);
  console.log(`   Missing Emails: ${stats.customersMissingEmails} (${Math.round(stats.customersMissingEmails / stats.totalCustomers * 100)}%)`);

  console.log('\n🔄 Update Operations:');
  console.log(`   ✅ Updated from CSV: ${stats.emailsUpdatedFromCSV}`);
  console.log(`   ⏭️  Already had email: ${stats.emailsAlreadyPresent}`);
  console.log(`   ⚠️  Not found in DB: ${stats.customersNotFound}`);

  if (stats.placeholdersCreated > 0) {
    console.log(`   📝 Placeholders created: ${stats.placeholdersCreated}`);
  }

  console.log('\n✨ Improvement:');
  const improvement = stats.emailsUpdatedFromCSV;
  console.log(`   ${improvement} customers now have email addresses!`);
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting Customer Email Update Process\n');

    // Load email mappings
    const mappingPath = path.join(__dirname, 'email-mappings.json');
    console.log(`📂 Loading email mappings from: ${mappingPath}`);

    const mappingData = loadEmailMappings(mappingPath);
    console.log(`✅ Loaded ${mappingData.totalMappings} email mappings`);

    // Update emails from CSV
    const stats = await updateEmailsFromMapping(mappingData.mappings);

    // Ask about placeholder strategy (or use 'none' by default)
    const placeholderStrategy: 'none' | 'placeholder' | 'noemail' = 'none';
    stats.placeholdersCreated = await createPlaceholderEmails(placeholderStrategy);

    // Print final statistics
    printStats(stats);

    // Save results to file
    const resultsPath = path.join(__dirname, 'update-results.json');
    fs.writeFileSync(
      resultsPath,
      JSON.stringify({
        completedAt: new Date().toISOString(),
        stats
      }, null, 2),
      'utf-8'
    );
    console.log(`💾 Results saved to: ${resultsPath}`);

  } catch (error) {
    console.error('❌ Error updating customer emails:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Email update process completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Email update process failed:', error);
      process.exit(1);
    });
}

export { updateEmailsFromMapping, createPlaceholderEmails, getDatabaseStats };

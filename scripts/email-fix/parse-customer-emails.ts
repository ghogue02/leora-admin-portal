/**
 * Parse Customer Emails from CSV
 *
 * Extracts customer emails from the original export CSV file
 * and creates a mapping for database updates.
 */

import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

interface CustomerEmailRecord {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  billingEmail: string;
  phone: string;
}

interface EmailMapping {
  companyName: string;
  email: string;
  source: 'primary' | 'billing';
}

/**
 * Parse the customer CSV and extract email mappings
 */
export async function parseCustomerEmails(csvPath: string): Promise<EmailMapping[]> {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV, skipping first 4 header rows
  const records = parse(csvContent, {
    columns: true,
    from: 5, // Start from row 5 (after headers)
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true
  });

  const emailMappings: EmailMapping[] = [];
  const seen = new Set<string>();

  for (const row of records) {
    const companyName = row['Company name']?.trim();
    const email = row['E-mail address']?.trim();
    const billingEmail = row['Billing e-mail address']?.trim();

    if (!companyName) continue;

    // Use primary email if available
    if (email && email.length > 0 && email !== '""' && email.includes('@')) {
      const key = `${companyName}:${email}`;
      if (!seen.has(key)) {
        emailMappings.push({
          companyName,
          email: email.replace(/^"|"$/g, ''), // Remove quotes
          source: 'primary'
        });
        seen.add(key);
      }
    }
    // Fallback to billing email
    else if (billingEmail && billingEmail.length > 0 && billingEmail !== '""' && billingEmail.includes('@')) {
      const key = `${companyName}:${billingEmail}`;
      if (!seen.has(key)) {
        emailMappings.push({
          companyName,
          email: billingEmail.replace(/^"|"$/g, ''),
          source: 'billing'
        });
        seen.add(key);
      }
    }
  }

  return emailMappings;
}

/**
 * Group emails by company name (handle duplicates)
 */
export function groupEmailsByCompany(mappings: EmailMapping[]): Map<string, string> {
  const grouped = new Map<string, string>();

  for (const mapping of mappings) {
    // Prefer primary emails over billing emails
    const existing = grouped.get(mapping.companyName);
    if (!existing || mapping.source === 'primary') {
      grouped.set(mapping.companyName, mapping.email);
    }
  }

  return grouped;
}

/**
 * Save email mappings to JSON file for review
 */
export async function saveEmailMappings(
  mappings: Map<string, string>,
  outputPath: string
): Promise<void> {
  const data = {
    generatedAt: new Date().toISOString(),
    totalMappings: mappings.size,
    mappings: Object.fromEntries(mappings)
  };

  fs.writeFileSync(
    outputPath,
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}

// CLI execution
if (require.main === module) {
  const csvPath = path.join(__dirname, '../../Export customers 2025-10-25.csv');
  const outputPath = path.join(__dirname, 'email-mappings.json');

  console.log('📧 Parsing customer emails from CSV...');
  console.log(`CSV: ${csvPath}`);

  parseCustomerEmails(csvPath)
    .then(mappings => {
      console.log(`✅ Found ${mappings.length} total email records`);

      const grouped = groupEmailsByCompany(mappings);
      console.log(`✅ Grouped into ${grouped.size} unique companies with emails`);

      return saveEmailMappings(grouped, outputPath);
    })
    .then(() => {
      console.log(`✅ Saved email mappings to: ${outputPath}`);
      console.log('\n📊 Statistics:');
      console.log(`   - Companies with emails: ${require(outputPath).totalMappings}`);
    })
    .catch(error => {
      console.error('❌ Error parsing emails:', error);
      process.exit(1);
    });
}

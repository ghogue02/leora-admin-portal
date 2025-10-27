/**
 * Audit Lovable Database
 *
 * Connects to Lovable Supabase using Service Role Key and audits what data exists
 */

import { createClient } from '@supabase/supabase-js';

const LOVABLE_URL = 'https://wlwqkblueezqydturcpv.supabase.co';
const LOVABLE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY';

async function auditLovableDatabase() {
  console.log('\n🔍 Connecting to Lovable Database...\n');
  console.log(`URL: ${LOVABLE_URL}`);
  console.log(`Project: wlwqkblueezqydturcpv\n`);

  const supabase = createClient(LOVABLE_URL, LOVABLE_SERVICE_KEY);

  try {
    // Test connection
    const { data: connection, error: connError } = await supabase
      .from('Tenant')
      .select('count')
      .limit(1);

    if (connError) {
      console.error('❌ Connection failed:', connError.message);
      return;
    }

    console.log('✅ Connected successfully!\n');
    console.log('=' .repeat(80));
    console.log('LOVABLE DATABASE AUDIT');
    console.log('='.repeat(80));

    // Check key tables
    const tables = [
      'Tenant',
      'Customer',
      'Product',
      'Sku',
      'Order',
      'OrderLine',
      'Invoice',
      'User',
      'PortalUser',
      'SalesRep'
    ];

    console.log('\n📊 Table Row Counts:\n');

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`  ${table.padEnd(20)} - ❌ Error: ${error.message}`);
        } else {
          console.log(`  ${table.padEnd(20)} - ${(count ?? 0).toString().padStart(6)} rows`);
        }
      } catch (err) {
        console.log(`  ${table.padEnd(20)} - ❌ Table not found or error`);
      }
    }

    // Check for ImportedInvoices and SupplierInvoices (might not be in schema)
    console.log('\n📋 Migration Tables:\n');

    const migrationTables = ['ImportedInvoices', 'SupplierInvoices'];

    for (const table of migrationTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`  ${table.padEnd(20)} - Table doesn't exist`);
        } else {
          console.log(`  ${table.padEnd(20)} - ${(count ?? 0).toString().padStart(6)} rows`);
        }
      } catch (err) {
        console.log(`  ${table.padEnd(20)} - Table doesn't exist`);
      }
    }

    // Sample some data
    console.log('\n🔍 Sample Data Check:\n');

    const { data: tenants } = await supabase
      .from('Tenant')
      .select('id, slug, name')
      .limit(5);

    if (tenants && tenants.length > 0) {
      console.log('  Tenants:');
      tenants.forEach(t => console.log(`    - ${t.slug}: ${t.name}`));
    } else {
      console.log('  Tenants: No data found');
    }

    const { data: customers } = await supabase
      .from('Customer')
      .select('id, name')
      .limit(5);

    if (customers && customers.length > 0) {
      console.log(`\n  Sample Customers (${customers.length} shown):`);
      customers.forEach(c => console.log(`    - ${c.name}`));
    } else {
      console.log('\n  Customers: No data found');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Audit complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

auditLovableDatabase();

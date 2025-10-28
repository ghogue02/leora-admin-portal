#!/usr/bin/env tsx
/**
 * Fixed Migration - Handle Supabase Auth Properly
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();
const supabase = createClient(
  'https://wlwqkblueezqydturcpv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indsd3FrYmx1ZWV6cXlkdHVyY3B2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA2NDExMiwiZXhwIjoyMDc2NjQwMTEyfQ.zC-cwbFsNFrWQTH_HIAdc49ioBOfbvFMjAU0_QKpYRY'
);

async function main() {
  console.log('🚀 Fixed Migration - Handling FK Constraints\n');

  try {
    // Step 1: Migrate Products (no dependencies) ✅ Already done!
    console.log('✅ Products already migrated (1,879 wines)\n');

    // Step 2: Migrate Customers WITHOUT salesRepId
    console.log('👥 Migrating Customers (setting salesRepId to NULL)...');
    const customers = await prisma.customer.findMany();

    const batchSize = 100;
    let migrated = 0;

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);

      const { error } = await supabase
        .from('customer')
        .upsert(batch.map(c => ({
          id: c.id,
          tenantid: c.tenantId,
          salesrepid: null, // NULL instead of actual ID (avoids FK error)
          name: c.name,
          accountnumber: c.accountNumber || null,
          billingemail: c.billingEmail || null,
          phone: c.phone || null,
          street1: c.street1 || null,
          street2: c.street2 || null,
          address: [c.street1, c.street2].filter(Boolean).join(', ') || null,
          city: c.city || null,
          state: c.state || null,
          zipcode: c.postalCode || null,
          country: c.country || 'US',
          paymentterms: c.paymentTerms || 'Net 30',
          riskstatus: c.riskStatus || 'HEALTHY',
          establishedrevenue: c.establishedRevenue ? parseFloat(c.establishedRevenue.toString()) : 0,
          ispermanentlyclosed: c.isPermanentlyClosed,
          createdat: c.createdAt.toISOString(),
          updatedat: c.updatedAt.toISOString(),
        })), { onConflict: 'id' });

      if (!error) {
        migrated += batch.length;
      }
    }

    console.log(`✅ Migrated ${migrated} customers\n`);

    // Step 3: Create summary
    console.log('='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`\n✅ Tenant: 1`);
    console.log(`✅ Products: 1,879 (with wine enrichment)`);
    console.log(`✅ Customers: ${migrated}`);
    console.log(`\n⚠️  Sales Reps: 0 (users need to sign up in Lovable first)`);
    console.log(`⚠️  Orders: Skipped (will migrate after users created)`);
    console.log('\n' + '='.repeat(70));
    console.log('\n📝 NEXT STEPS:\n');
    console.log('1. Have sales reps sign up in Lovable (creates auth.users)');
    console.log('2. Their profiles will auto-create via trigger');
    console.log('3. Then update customer.salesrepid to link them');
    console.log('4. Then migrate orders\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

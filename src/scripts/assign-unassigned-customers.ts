#!/usr/bin/env tsx
/**
 * Assign Sales Reps to Unassigned Customers
 * Assigns customers without sales reps based on territory
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:***REMOVED***@***SUPABASE_HOST_REMOVED***:5432/postgres'
    }
  }
});

const TENANT_ID = '58b8126a-2d2f-4f55-bc98-5b6784800bed';

async function assignUnassignedCustomers() {
  console.log('🔍 Finding customers without sales reps...\n');

  try {
    // Find unassigned customers
    const unassigned = await prisma.customer.findMany({
      where: {
        tenantId: TENANT_ID,
        salesRepId: null
      },
      include: {
        addresses: {
          take: 1
        }
      }
    });

    console.log(`Found ${unassigned.length} unassigned customers\n`);

    if (unassigned.length === 0) {
      console.log('✅ All customers have sales reps assigned!');
      return;
    }

    // Get all sales reps with their territories
    const salesReps = await prisma.salesRep.findMany({
      where: { tenantId: TENANT_ID },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    console.log(`Available sales reps: ${salesReps.length}\n`);

    // Create territory mapping
    const territoryMap = new Map<string, string>();
    salesReps.forEach(rep => {
      if (rep.territoryName && rep.territoryName !== 'All Territories') {
        territoryMap.set(rep.territoryName.toLowerCase(), rep.id);
      }
    });

    // Default rep (find one with most customers or "All Territories")
    const defaultRep = salesReps.find(rep => rep.territoryName === 'All Territories') || salesReps[0];

    let assigned = 0;
    let errors = 0;

    console.log('📋 Assigning customers:\n');
    console.log('Customer | Territory | Assigned To');
    console.log('---------|-----------|------------');

    for (const customer of unassigned) {
      let assignedRepId = defaultRep.id;
      let assignedRepName = 'Default';

      // Try to match by address/territory if available
      if (customer.addresses.length > 0) {
        const address = customer.addresses[0];
        const state = address.state?.toLowerCase() || '';

        // Simple territory matching (you can enhance this)
        if (state.includes('va') || state.includes('virginia')) {
          const virginiaRep = salesReps.find(r => r.territoryName?.includes('Virginia'));
          if (virginiaRep) {
            assignedRepId = virginiaRep.id;
            assignedRepName = `${virginiaRep.firstName || ''} ${virginiaRep.lastName || ''}`.trim();
          }
        } else if (state.includes('ny') || state.includes('new york')) {
          const nyRep = salesReps.find(r => r.territoryName?.includes('NYC'));
          if (nyRep) {
            assignedRepId = nyRep.id;
            assignedRepName = `${nyRep.firstName || ''} ${nyRep.lastName || ''}`.trim();
          }
        }
      }

      try {
        await prisma.customer.update({
          where: { id: customer.id },
          data: {
            salesRepId: assignedRepId,
            updatedAt: new Date()
          }
        });

        console.log(
          `${customer.name.substring(0, 20).padEnd(20)} | ` +
          `${(customer.addresses[0]?.state || 'Unknown').padEnd(10)} | ` +
          assignedRepName
        );
        assigned++;
      } catch (error) {
        console.error(`Error assigning ${customer.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Assignment Summary:');
    console.log(`  Successfully assigned: ${assigned}`);
    console.log(`  Errors: ${errors}`);

    // Verify
    const remaining = await prisma.customer.count({
      where: {
        tenantId: TENANT_ID,
        salesRepId: null
      }
    });

    console.log(`\n📊 Remaining unassigned: ${remaining}`);

  } catch (error) {
    console.error('❌ Error assigning customers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

assignUnassignedCustomers().catch(console.error);

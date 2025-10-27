#!/usr/bin/env tsx
/**
 * Create Health Snapshots for Monthly Trends
 *
 * Generates AccountHealthSnapshot records so Monthly Trends has data to display.
 * Creates a snapshot of current health status for all customers.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createHealthSnapshots() {
  console.log('📸 Creating Customer Health Snapshots...\n');

  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'well-crafted' }
  });

  if (!tenant) {
    console.error('❌ Tenant not found');
    return;
  }

  console.log('Tenant:', tenant.name);

  // Get all customers with their current health status
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: tenant.id,
      isPermanentlyClosed: false
    },
    select: {
      id: true,
      name: true,
      riskStatus: true,
      lastOrderDate: true,
      nextExpectedOrderDate: true,
      averageOrderIntervalDays: true
    }
  });

  console.log('Customers:', customers.length);
  console.log('Creating snapshot for today...\n');

  const snapshotDate = new Date();
  let created = 0;

  // Create in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((customer) =>
        prisma.accountHealthSnapshot.create({
          data: {
            tenantId: tenant.id,
            customerId: customer.id,
            snapshotDate,
            revenueScore: customer.riskStatus === 'HEALTHY' ? 80 : 20,
            cadenceScore: customer.riskStatus === 'HEALTHY' ? 80 : 20,
            sampleUtilization: 50, // Default
            notes: `Health: ${customer.riskStatus}`,
          }
        })
      )
    );

    created += batch.length;
    console.log(`  Created ${created}/${customers.length} snapshots...`);
  }

  console.log(`\n✅ Created ${created} health snapshots for ${snapshotDate.toLocaleDateString()}`);

  await prisma.$disconnect();
}

createHealthSnapshots().catch(console.error);

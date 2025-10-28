import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables
config();

const prisma = new PrismaClient();

/**
 * Assign customers to sales reps based on territory/state
 * This fixes the "No customers found" issue by assigning the 4,838 unassigned customers
 */
async function assignCustomersToSalesReps() {
  console.log("🔧 Starting customer assignment fix...\n");

  const tenantId = "58b8126a-2d2f-4f55-bc98-5b6784800bed";

  // Get all sales reps
  const salesReps = await prisma.salesRep.findMany({
    where: { tenantId, isActive: true },
    include: { user: { select: { email: true, fullName: true } } },
  });

  console.log(`Found ${salesReps.length} active sales reps:\n`);
  salesReps.forEach((rep) => {
    console.log(`  - ${rep.territoryName}: ${rep.user.fullName} (${rep.user.email})`);
  });

  // Get unassigned customers
  const unassignedCustomers = await prisma.customer.findMany({
    where: {
      tenantId,
      salesRepId: null,
      isPermanentlyClosed: false,
    },
    select: {
      id: true,
      name: true,
      state: true,
      territory: true,
    },
  });

  console.log(`\n📊 Found ${unassignedCustomers.length} unassigned customers\n`);

  if (unassignedCustomers.length === 0) {
    console.log("✅ All customers are already assigned!");
    return;
  }

  // Territory mapping strategy:
  // - South Territory (Travis): VA customers
  // - North Territory (Kelly): MD customers
  // - East Territory (Carolyn): DC customers
  // - Remaining customers: distribute evenly across all reps

  const territoryMap = new Map<string, string>([
    ["VA", "South Territory"], // Travis
    ["MD", "North Territory"],  // Kelly
    ["DC", "East Territory"],   // Carolyn
  ]);

  let assignedCount = 0;
  const assignmentStats = new Map<string, number>();

  // Initialize stats
  salesReps.forEach((rep) => {
    assignmentStats.set(rep.id, 0);
  });

  // Assign customers based on state/territory first
  for (const customer of unassignedCustomers) {
    let assignedRep: typeof salesReps[0] | undefined;

    // Try to match by state/territory
    if (customer.state || customer.territory) {
      const state = customer.state || customer.territory;
      const targetTerritory = territoryMap.get(state);

      if (targetTerritory) {
        assignedRep = salesReps.find((rep) => rep.territoryName === targetTerritory);
      }
    }

    // If no territory match, assign to rep with fewest customers (load balancing)
    if (!assignedRep) {
      const minAssignments = Math.min(...Array.from(assignmentStats.values()));
      assignedRep = salesReps.find((rep) => assignmentStats.get(rep.id) === minAssignments);
    }

    if (assignedRep) {
      // Update customer
      await prisma.customer.update({
        where: { id: customer.id },
        data: { salesRepId: assignedRep.id },
      });

      // Create assignment record
      await prisma.customerAssignment.create({
        data: {
          tenantId,
          salesRepId: assignedRep.id,
          customerId: customer.id,
          assignedAt: new Date(),
        },
      });

      assignmentStats.set(assignedRep.id, (assignmentStats.get(assignedRep.id) || 0) + 1);
      assignedCount++;

      if (assignedCount % 500 === 0) {
        console.log(`  Assigned ${assignedCount} customers...`);
      }
    }
  }

  console.log(`\n✅ Successfully assigned ${assignedCount} customers!\n`);
  console.log("📊 Assignment distribution:\n");

  for (const rep of salesReps) {
    const count = assignmentStats.get(rep.id) || 0;
    console.log(`  - ${rep.territoryName} (${rep.user.fullName}): ${count} customers`);
  }

  // Verify total assignments
  const totalAssigned = await prisma.customer.count({
    where: {
      tenantId,
      salesRepId: { not: null },
      isPermanentlyClosed: false,
    },
  });

  console.log(`\n✅ Total customers now assigned: ${totalAssigned}`);
}

// Execute
assignCustomersToSalesReps()
  .catch((error) => {
    console.error("\n❌ Assignment failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

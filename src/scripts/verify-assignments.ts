import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const prisma = new PrismaClient();

async function verifyAssignments() {
  const tenantId = "58b8126a-2d2f-4f55-bc98-5b6784800bed";

  // Find Travis's sales rep ID
  const travis = await prisma.salesRep.findFirst({
    where: {
      tenantId,
      user: { email: "travis@wellcraftedbeverage.com" },
    },
    include: {
      user: { select: { email: true, fullName: true } },
    },
  });

  if (!travis) {
    console.log("❌ Travis sales rep not found");
    return;
  }

  // Count customers assigned to Travis
  const customerCount = await prisma.customer.count({
    where: {
      tenantId,
      salesRepId: travis.id,
      isPermanentlyClosed: false,
    },
  });

  console.log("✅ VERIFICATION RESULTS");
  console.log("======================");
  console.log(`Sales Rep: ${travis.user.fullName} (${travis.user.email})`);
  console.log(`Territory: ${travis.territoryName}`);
  console.log(`Sales Rep ID: ${travis.id}`);
  console.log(`Customers Assigned: ${customerCount}`);

  // Show sample customers
  const sampleCustomers = await prisma.customer.findMany({
    where: {
      tenantId,
      salesRepId: travis.id,
      isPermanentlyClosed: false,
    },
    select: {
      name: true,
      city: true,
      state: true,
      territory: true,
    },
    take: 5,
  });

  console.log(`\nSample Customers (first 5):`);
  sampleCustomers.forEach((c, i) => {
    console.log(
      `  ${i + 1}. ${c.name} - ${c.city || "Unknown"}, ${c.state || c.territory || "Unknown"}`,
    );
  });

  // Get risk status breakdown
  const riskBreakdown = await prisma.customer.groupBy({
    by: ["riskStatus"],
    where: {
      tenantId,
      salesRepId: travis.id,
      isPermanentlyClosed: false,
    },
    _count: { id: true },
  });

  console.log(`\nRisk Status Breakdown:`);
  riskBreakdown.forEach((risk) => {
    console.log(`  ${risk.riskStatus}: ${risk._count.id} customers`);
  });

  await prisma.$disconnect();
}

verifyAssignments().catch((error) => {
  console.error("❌ Verification failed:", error);
  process.exitCode = 1;
});

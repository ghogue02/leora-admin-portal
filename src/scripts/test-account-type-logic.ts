/**
 * Test Script for Account Type Update Logic
 *
 * Verifies the account type classification logic without modifying the database
 *
 * Usage:
 *   tsx src/scripts/test-account-type-logic.ts
 */

import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

type TestCustomer = {
  id: string;
  name: string;
  accountType: AccountType;
  lastOrderDate: Date | null;
  expectedType: AccountType;
  reason: string;
};

function getDateThresholds() {
  const now = Date.now();
  const sixMonthsAgo = new Date(now - 180 * 24 * 60 * 60 * 1000);
  const twelveMonthsAgo = new Date(now - 365 * 24 * 60 * 60 * 1000);

  return {
    now: new Date(now),
    sixMonthsAgo,
    twelveMonthsAgo,
  };
}

function determineExpectedAccountType(lastOrderDate: Date | null): {
  type: AccountType;
  reason: string;
} {
  const { sixMonthsAgo, twelveMonthsAgo } = getDateThresholds();

  if (!lastOrderDate) {
    return {
      type: AccountType.PROSPECT,
      reason: "Never ordered",
    };
  }

  if (lastOrderDate >= sixMonthsAgo) {
    return {
      type: AccountType.ACTIVE,
      reason: `Ordered ${Math.floor((Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000))} days ago (< 6 months)`,
    };
  }

  if (lastOrderDate >= twelveMonthsAgo && lastOrderDate < sixMonthsAgo) {
    return {
      type: AccountType.TARGET,
      reason: `Ordered ${Math.floor((Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000))} days ago (6-12 months)`,
    };
  }

  return {
    type: AccountType.PROSPECT,
    reason: `Ordered ${Math.floor((Date.now() - lastOrderDate.getTime()) / (24 * 60 * 60 * 1000))} days ago (> 12 months)`,
  };
}

async function testAccountTypeLogic() {
  console.log("🧪 Testing Account Type Update Logic\n");

  const thresholds = getDateThresholds();
  console.log("Date Thresholds:");
  console.log(`  Now:              ${thresholds.now.toISOString()}`);
  console.log(`  6 months ago:     ${thresholds.sixMonthsAgo.toISOString()}`);
  console.log(`  12 months ago:    ${thresholds.twelveMonthsAgo.toISOString()}\n`);

  // Get sample of customers from database
  const tenants = await prisma.tenant.findMany({
    select: { id: true, slug: true },
    take: 1, // Test first tenant
  });

  if (tenants.length === 0) {
    console.log("❌ No tenants found in database");
    return;
  }

  const tenant = tenants[0];
  console.log(`Testing with tenant: ${tenant.slug}\n`);

  // Get customers across all account types
  const customers = await prisma.customer.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      name: true,
      accountType: true,
      lastOrderDate: true,
    },
    take: 50,
    orderBy: { lastOrderDate: "desc" },
  });

  console.log(`Analyzing ${customers.length} customers...\n`);

  const testResults: TestCustomer[] = [];
  let correctCount = 0;
  let incorrectCount = 0;

  for (const customer of customers) {
    const expected = determineExpectedAccountType(customer.lastOrderDate);
    const isCorrect = customer.accountType === expected.type;

    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }

    testResults.push({
      id: customer.id,
      name: customer.name,
      accountType: customer.accountType,
      lastOrderDate: customer.lastOrderDate,
      expectedType: expected.type,
      reason: expected.reason,
    });
  }

  // Show summary
  console.log("📊 Test Results Summary:");
  console.log(`  Total customers: ${customers.length}`);
  console.log(`  ✅ Correct: ${correctCount} (${((correctCount / customers.length) * 100).toFixed(1)}%)`);
  console.log(
    `  ❌ Incorrect: ${incorrectCount} (${((incorrectCount / customers.length) * 100).toFixed(1)}%)`,
  );

  // Count by type
  const activeCount = customers.filter((c) => c.accountType === AccountType.ACTIVE).length;
  const targetCount = customers.filter((c) => c.accountType === AccountType.TARGET).length;
  const prospectCount = customers.filter((c) => c.accountType === AccountType.PROSPECT).length;

  console.log("\n📈 Current Distribution:");
  console.log(
    `  ACTIVE: ${activeCount} (${((activeCount / customers.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  TARGET: ${targetCount} (${((targetCount / customers.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  PROSPECT: ${prospectCount} (${((prospectCount / customers.length) * 100).toFixed(1)}%)`,
  );

  // Expected distribution
  const expectedActive = testResults.filter((c) => c.expectedType === AccountType.ACTIVE).length;
  const expectedTarget = testResults.filter((c) => c.expectedType === AccountType.TARGET).length;
  const expectedProspect = testResults.filter(
    (c) => c.expectedType === AccountType.PROSPECT,
  ).length;

  console.log("\n🎯 Expected Distribution:");
  console.log(
    `  ACTIVE: ${expectedActive} (${((expectedActive / customers.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  TARGET: ${expectedTarget} (${((expectedTarget / customers.length) * 100).toFixed(1)}%)`,
  );
  console.log(
    `  PROSPECT: ${expectedProspect} (${((expectedProspect / customers.length) * 100).toFixed(1)}%)`,
  );

  // Show mismatches
  if (incorrectCount > 0) {
    console.log("\n⚠️  Customers with Incorrect Account Types:");
    console.log("─".repeat(80));

    const mismatches = testResults.filter((c) => c.accountType !== c.expectedType);
    for (const customer of mismatches.slice(0, 10)) {
      // Show first 10
      console.log(`Customer: ${customer.name}`);
      console.log(`  Current:  ${customer.accountType}`);
      console.log(`  Expected: ${customer.expectedType}`);
      console.log(`  Reason:   ${customer.reason}`);
      console.log(`  Last Order: ${customer.lastOrderDate?.toISOString() ?? "Never"}`);
      console.log("");
    }

    if (mismatches.length > 10) {
      console.log(`... and ${mismatches.length - 10} more mismatches`);
    }
  }

  // Show state transitions
  console.log("\n🔄 State Transitions:");
  console.log("─".repeat(80));
  console.log("PROSPECT → ACTIVE");
  const prospectToActive = testResults.filter(
    (c) => c.accountType === AccountType.PROSPECT && c.expectedType === AccountType.ACTIVE,
  );
  console.log(
    `  ${prospectToActive.length} customers will transition (first order in < 6 months)`,
  );

  console.log("\nTARGET → ACTIVE");
  const targetToActive = testResults.filter(
    (c) => c.accountType === AccountType.TARGET && c.expectedType === AccountType.ACTIVE,
  );
  console.log(`  ${targetToActive.length} customers will transition (reactivated)`);

  console.log("\nACTIVE → TARGET");
  const activeToTarget = testResults.filter(
    (c) => c.accountType === AccountType.ACTIVE && c.expectedType === AccountType.TARGET,
  );
  console.log(`  ${activeToTarget.length} customers will transition (no orders 6-12 months)`);

  console.log("\nTARGET → PROSPECT");
  const targetToProspect = testResults.filter(
    (c) => c.accountType === AccountType.TARGET && c.expectedType === AccountType.PROSPECT,
  );
  console.log(`  ${targetToProspect.length} customers will transition (no orders > 12 months)`);

  console.log("\n✅ Test complete!");

  if (incorrectCount > 0) {
    console.log(
      `\n💡 Run 'npm run jobs:update-account-types' to fix ${incorrectCount} misclassified customers`,
    );
  } else {
    console.log("\n🎉 All customers are correctly classified!");
  }
}

async function main() {
  try {
    await testAccountTypeLogic();
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

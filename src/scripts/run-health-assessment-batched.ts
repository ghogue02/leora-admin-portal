#!/usr/bin/env tsx
/**
 * Batched Customer Health Assessment
 *
 * Runs customer health assessment in batches to avoid transaction timeouts
 * with large customer datasets (4,862+ customers).
 *
 * Usage: npx tsx scripts/run-health-assessment-batched.ts
 */

import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(__dirname, "../.env.local") });

import { PrismaClient, CustomerRiskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const BATCH_SIZE = 100; // Process 100 customers at a time

// Helper: Add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Helper: Calculate average
function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

// Assess individual customer health - SIMPLIFIED LOGIC
function assessCustomerHealth(customer: any): any {
  const now = new Date();
  const deliveredOrders = customer.orders.filter((o: any) => o.deliveredAt);

  // RULE 1: No orders = DORMANT
  if (deliveredOrders.length === 0) {
    return {
      riskStatus: CustomerRiskStatus.DORMANT,
      lastOrderDate: null,
      nextExpectedOrderDate: null,
      averageOrderIntervalDays: null,
      dormancySince: customer.dormancySince || now,
      reactivatedDate: null,
    };
  }

  // Get last order date
  const lastOrderDate = deliveredOrders[0].deliveredAt;

  // Calculate days since last order
  const daysSinceLastOrder = Math.floor(
    (now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate ordering pace from last 5 orders (for metrics only)
  const last5Orders = deliveredOrders.slice(0, Math.min(5, deliveredOrders.length));

  // Calculate intervals between orders
  const intervals: number[] = [];
  for (let i = 0; i < last5Orders.length - 1; i++) {
    const interval = Math.floor(
      (last5Orders[i].deliveredAt.getTime() - last5Orders[i + 1].deliveredAt.getTime()) /
        (1000 * 60 * 60 * 24)
    );
    intervals.push(interval);
  }

  const averageIntervalDays = Math.round(average(intervals));
  const nextExpectedOrderDate = addDays(lastOrderDate, averageIntervalDays);

  // CORRECTED BUSINESS LOGIC: Check if customer is overdue
  // RULE 2: Past expected order date = DORMANT (overdue)
  // RULE 3: Before expected order date = HEALTHY (on track)
  let riskStatus: CustomerRiskStatus;
  let dormancySince: Date | null = null;
  let reactivatedDate: Date | null = null;

  // Calculate days since expected order date (negative = not due yet, positive = overdue)
  const daysSinceExpectedOrder = Math.floor(
    (now.getTime() - nextExpectedOrderDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceExpectedOrder > 0) {
    // DORMANT: Past expected order date (overdue)
    riskStatus = CustomerRiskStatus.DORMANT;
    dormancySince = customer.dormancySince || nextExpectedOrderDate;
  } else {
    // HEALTHY: Not yet past expected order date
    riskStatus = CustomerRiskStatus.HEALTHY;

    // Check if was dormant and is now reactivated
    if (customer.riskStatus === CustomerRiskStatus.DORMANT) {
      reactivatedDate = lastOrderDate;
      dormancySince = null;
    }
  }

  return {
    riskStatus,
    lastOrderDate,
    nextExpectedOrderDate,
    averageOrderIntervalDays: averageIntervalDays,
    dormancySince,
    reactivatedDate,
  };
}

async function runBatchedHealthAssessment() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Batched Customer Health Assessment");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Get tenant
    const tenant = await prisma.tenant.findFirst({
      where: { slug: process.env.DEFAULT_TENANT_SLUG || "well-crafted" },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      console.error("❌ Tenant not found");
      return;
    }

    console.log(`Processing tenant: ${tenant.name}\n`);

    // Count total customers
    const totalCustomers = await prisma.customer.count({
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
      },
    });

    console.log(`Total customers to process: ${totalCustomers}`);
    console.log(`Batch size: ${BATCH_SIZE}`);
    console.log(`Estimated batches: ${Math.ceil(totalCustomers / BATCH_SIZE)}\n`);

    let processedCount = 0;
    let updatedCount = 0;
    let skip = 0;

    // Process in batches
    while (skip < totalCustomers) {
      const batchNumber = Math.floor(skip / BATCH_SIZE) + 1;
      console.log(`Processing batch ${batchNumber}... (${skip + 1}-${Math.min(skip + BATCH_SIZE, totalCustomers)})`);

      // Fetch batch of customers
      const customers = await prisma.customer.findMany({
        where: {
          tenantId: tenant.id,
          isPermanentlyClosed: false,
        },
        select: {
          id: true,
          riskStatus: true,
          dormancySince: true,
          orders: {
            where: { deliveredAt: { not: null } },
            select: { id: true, deliveredAt: true, total: true },
            orderBy: { deliveredAt: "desc" },
            take: 10,
          },
        },
        skip,
        take: BATCH_SIZE,
      });

      // Process each customer in this batch
      for (const customer of customers) {
        const healthUpdate = assessCustomerHealth(customer);

        // Update customer
        await prisma.customer.update({
          where: { id: customer.id },
          data: healthUpdate,
        });

        updatedCount++;
      }

      processedCount += customers.length;
      skip += BATCH_SIZE;

      console.log(`  ✓ Batch ${batchNumber} complete (${updatedCount} customers updated)\n`);
    }

    // Show final statistics
    const riskCounts = await prisma.customer.groupBy({
      by: ['riskStatus'],
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
      },
      _count: true,
    });

    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  Final Risk Status Distribution");
    console.log("═══════════════════════════════════════════════════════════════\n");

    let totalPercent = 0;
    riskCounts.forEach(({ riskStatus, _count }) => {
      const percent = ((_count / totalCustomers) * 100).toFixed(1);
      console.log(`  ${riskStatus}: ${_count} (${percent}%)`);
      totalPercent += parseFloat(percent);
    });

    console.log(`\n  Total: ${totalCustomers} customers (100.0%)`);
    console.log("\n✅ Health assessment completed successfully!");
    console.log(`   Processed: ${processedCount} customers`);
    console.log(`   Updated: ${updatedCount} customers\n`);

  } catch (error) {
    console.error("\n❌ Error during health assessment:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the assessment
runBatchedHealthAssessment()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

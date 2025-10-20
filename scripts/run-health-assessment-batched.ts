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

// Assess individual customer health
function assessCustomerHealth(customer: any): any {
  const now = new Date();
  const deliveredOrders = customer.orders.filter((o: any) => o.deliveredAt);

  if (deliveredOrders.length === 0) {
    // No orders yet - considered healthy (new customer)
    return {
      riskStatus: CustomerRiskStatus.HEALTHY,
      lastOrderDate: null,
      nextExpectedOrderDate: null,
      averageOrderIntervalDays: null,
      dormancySince: null,
      reactivatedDate: null,
    };
  }

  // Get last order date
  const lastOrderDate = deliveredOrders[0].deliveredAt;

  // Calculate ordering pace from last 5 orders
  const last5Orders = deliveredOrders.slice(0, Math.min(5, deliveredOrders.length));

  if (last5Orders.length < 2) {
    // Only 1 order - can't calculate pace yet, consider healthy
    return {
      riskStatus: CustomerRiskStatus.HEALTHY,
      lastOrderDate,
      nextExpectedOrderDate: null,
      averageOrderIntervalDays: null,
      dormancySince: null,
      reactivatedDate: null,
    };
  }

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

  // Calculate days overdue
  const daysOverdue = Math.floor((now.getTime() - nextExpectedOrderDate.getTime()) / (1000 * 60 * 60 * 24));

  // Determine risk status
  let riskStatus: CustomerRiskStatus;
  let dormancySince: Date | null = null;
  let reactivatedDate: Date | null = null;

  if (daysOverdue >= 45) {
    // DORMANT: 45+ days overdue
    riskStatus = CustomerRiskStatus.DORMANT;
    dormancySince = customer.dormancySince || addDays(nextExpectedOrderDate, 45);
  } else if (daysOverdue >= 1) {
    // AT_RISK_CADENCE: 1+ days overdue
    riskStatus = CustomerRiskStatus.AT_RISK_CADENCE;

    // Check if was dormant and is now reactivating
    if (customer.riskStatus === CustomerRiskStatus.DORMANT) {
      reactivatedDate = lastOrderDate;
    }
  } else {
    // HEALTHY: On track
    riskStatus = CustomerRiskStatus.HEALTHY;

    // Check if was dormant and is now reactivated
    if (customer.riskStatus === CustomerRiskStatus.DORMANT) {
      reactivatedDate = lastOrderDate;
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

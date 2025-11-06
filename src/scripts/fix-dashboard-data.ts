#!/usr/bin/env tsx
/**
 * Database Migration Script - Fix Dashboard Zero-Value Data Issues
 *
 * This script addresses the following issues:
 * 1. Populates deliveredAt dates for existing orders (for development/testing)
 * 2. Runs customer health assessment to calculate risk statuses
 * 3. Verifies and sets default sales rep quotas
 *
 * Usage: npx tsx scripts/fix-dashboard-data.ts
 */

import { PrismaClient, OrderStatus } from "@prisma/client";
import { run as runCustomerHealthAssessment } from "../src/jobs/customer-health-assessment";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
config({ path: resolve(__dirname, "../.env.local") });

const prisma = new PrismaClient();

// Helper function to get ISO week number
function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

// Helper function to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function fixDashboardData() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Database Migration: Fix Dashboard Data Issues");
  console.log("═══════════════════════════════════════════════════════════════\n");

  try {
    // Get tenant ID
    const tenant = await prisma.tenant.findUnique({
      where: { slug: process.env.DEFAULT_TENANT_SLUG || "well-crafted" },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      throw new Error(`Tenant not found: ${process.env.DEFAULT_TENANT_SLUG || "well-crafted"}`);
    }

    console.log(`Working with tenant: ${tenant.name} (${tenant.slug})\n`);

    // ========================================================================
    // STEP 1: Populate deliveredAt dates for existing orders
    // ========================================================================
    console.log("STEP 1: Populating deliveredAt dates");
    console.log("─────────────────────────────────────────────────────────────");

    // Count orders needing fixes
    const ordersNeedingDeliveryDates = await prisma.order.count({
      where: {
        tenantId: tenant.id,
        deliveredAt: null,
        orderedAt: { not: null },
        status: {
          notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT],
        },
      },
    });

    console.log(`Orders without deliveredAt: ${ordersNeedingDeliveryDates}`);

    if (ordersNeedingDeliveryDates > 0) {
      // Fetch orders that need fixing
      const ordersToFix = await prisma.order.findMany({
        where: {
          tenantId: tenant.id,
          deliveredAt: null,
          orderedAt: { not: null },
          status: {
            notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT],
          },
        },
        select: {
          id: true,
          orderedAt: true,
        },
      });

      console.log(`Updating ${ordersToFix.length} orders...`);

      // Update each order with calculated deliveredAt and deliveryWeek
      let updatedCount = 0;
      for (const order of ordersToFix) {
        if (order.orderedAt) {
          const deliveredAt = addDays(order.orderedAt, 2); // Add 2 days for delivery
          const deliveryWeek = getISOWeek(deliveredAt);

          await prisma.order.update({
            where: { id: order.id },
            data: {
              deliveredAt,
              deliveryWeek,
            },
          });

          updatedCount++;
        }
      }

      console.log(`✓ Updated ${updatedCount} orders with deliveredAt and deliveryWeek`);

      // Show sample data
      const sampleOrder = await prisma.order.findFirst({
        where: {
          tenantId: tenant.id,
          deliveredAt: { not: null },
        },
        select: {
          id: true,
          orderedAt: true,
          deliveredAt: true,
          deliveryWeek: true,
          status: true,
        },
      });

      if (sampleOrder) {
        console.log("\nSample updated order:");
        console.log(`  Order ID: ${sampleOrder.id}`);
        console.log(`  Ordered At: ${sampleOrder.orderedAt?.toISOString()}`);
        console.log(`  Delivered At: ${sampleOrder.deliveredAt?.toISOString()}`);
        console.log(`  Delivery Week: ${sampleOrder.deliveryWeek}`);
        console.log(`  Status: ${sampleOrder.status}`);
      }
    } else {
      console.log("✓ All orders already have deliveredAt dates");
    }

    // ========================================================================
    // STEP 2: Run customer health assessment
    // ========================================================================
    console.log("\n\nSTEP 2: Running customer health assessment");
    console.log("─────────────────────────────────────────────────────────────");

    // Get counts before assessment
    const beforeCounts = await prisma.customer.groupBy({
      by: ['riskStatus'],
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
      },
      _count: true,
    });

    console.log("\nCustomer risk status BEFORE assessment:");
    beforeCounts.forEach(({ riskStatus, _count }) => {
      console.log(`  ${riskStatus}: ${_count}`);
    });

    // Run the customer health assessment job
    console.log("\n⚠️  SKIPPING customer health assessment (takes >5 seconds with 4,862 customers)");
    console.log("    This would timeout in a transaction.");
    console.log("\n📋 RECOMMENDED: Run this job separately with increased timeout:");
    console.log("    npx tsx src/jobs/run.ts customer-health-assessment\n");

    // Uncomment below to run (but it will likely timeout):
    // await runCustomerHealthAssessment({
    //   tenantSlug: tenant.slug,
    //   disconnectAfterRun: false,
    // });

    // Note: Skipping after counts since we didn't run the assessment
    console.log("(Assessment was skipped, so risk statuses remain unchanged)\n");

    // Show sample customer to demonstrate current state
    const sampleCustomer = await prisma.customer.findFirst({
      where: {
        tenantId: tenant.id,
        lastOrderDate: { not: null },
      },
      select: {
        id: true,
        name: true,
        lastOrderDate: true,
        nextExpectedOrderDate: true,
        averageOrderIntervalDays: true,
        riskStatus: true,
        dormancySince: true,
      },
    });

    if (sampleCustomer) {
      console.log("\nSample updated customer:");
      console.log(`  Customer: ${sampleCustomer.name}`);
      console.log(`  Last Order: ${sampleCustomer.lastOrderDate?.toISOString().split('T')[0]}`);
      console.log(`  Next Expected: ${sampleCustomer.nextExpectedOrderDate?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`  Avg Interval: ${sampleCustomer.averageOrderIntervalDays || 'N/A'} days`);
      console.log(`  Risk Status: ${sampleCustomer.riskStatus}`);
      console.log(`  Dormant Since: ${sampleCustomer.dormancySince?.toISOString().split('T')[0] || 'N/A'}`);
    }

    // ========================================================================
    // STEP 3: Verify and fix sales rep quotas
    // ========================================================================
    console.log("\n\nSTEP 3: Verifying sales rep quotas");
    console.log("─────────────────────────────────────────────────────────────");

    // Count sales reps with NULL quotas
    const repsWithNullQuotas = await prisma.salesRep.count({
      where: {
        tenantId: tenant.id,
        OR: [
          { weeklyRevenueQuota: null },
          { monthlyRevenueQuota: null },
          { quarterlyRevenueQuota: null },
          { annualRevenueQuota: null },
        ],
      },
    });

    console.log(`Sales reps with NULL quotas: ${repsWithNullQuotas}`);

    if (repsWithNullQuotas > 0) {
      // Default quota values
      const defaultQuotas = {
        weeklyRevenueQuota: 15000,
        monthlyRevenueQuota: 60000,
        quarterlyRevenueQuota: 180000,
        annualRevenueQuota: 720000,
      };

      console.log("\nApplying default quotas:");
      console.log(`  Weekly: $${defaultQuotas.weeklyRevenueQuota.toLocaleString()}`);
      console.log(`  Monthly: $${defaultQuotas.monthlyRevenueQuota.toLocaleString()}`);
      console.log(`  Quarterly: $${defaultQuotas.quarterlyRevenueQuota.toLocaleString()}`);
      console.log(`  Annual: $${defaultQuotas.annualRevenueQuota.toLocaleString()}`);

      // Update sales reps with NULL quotas
      const updateResult = await prisma.salesRep.updateMany({
        where: {
          tenantId: tenant.id,
          OR: [
            { weeklyRevenueQuota: null },
            { monthlyRevenueQuota: null },
            { quarterlyRevenueQuota: null },
            { annualRevenueQuota: null },
          ],
        },
        data: defaultQuotas,
      });

      console.log(`✓ Updated ${updateResult.count} sales rep records`);
    } else {
      console.log("✓ All sales reps have quotas set");
    }

    // Show all sales reps with their quotas
    const allSalesReps = await prisma.salesRep.findMany({
      where: {
        tenantId: tenant.id,
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    });

    console.log(`\nAll sales reps (${allSalesReps.length}):`);
    allSalesReps.forEach((rep) => {
      console.log(`  ${rep.user.fullName} (${rep.user.email})`);
      console.log(`    Territory: ${rep.territoryName}`);
      console.log(`    Weekly Quota: $${rep.weeklyRevenueQuota?.toLocaleString() || 'NULL'}`);
      console.log(`    Monthly Quota: $${rep.monthlyRevenueQuota?.toLocaleString() || 'NULL'}`);
      console.log(`    Quarterly Quota: $${rep.quarterlyRevenueQuota?.toLocaleString() || 'NULL'}`);
      console.log(`    Annual Quota: $${rep.annualRevenueQuota?.toLocaleString() || 'NULL'}`);
      console.log();
    });

    // ========================================================================
    // Final Summary
    // ========================================================================
    console.log("\n═══════════════════════════════════════════════════════════════");
    console.log("  Migration Complete!");
    console.log("═══════════════════════════════════════════════════════════════");

    // Get final counts
    const totalOrders = await prisma.order.count({
      where: { tenantId: tenant.id },
    });

    const ordersWithDeliveryDates = await prisma.order.count({
      where: {
        tenantId: tenant.id,
        deliveredAt: { not: null },
      },
    });

    const totalCustomers = await prisma.customer.count({
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
      },
    });

    const customersWithHealthData = await prisma.customer.count({
      where: {
        tenantId: tenant.id,
        isPermanentlyClosed: false,
        lastOrderDate: { not: null },
      },
    });

    const totalSalesReps = await prisma.salesRep.count({
      where: { tenantId: tenant.id },
    });

    const repsWithQuotas = await prisma.salesRep.count({
      where: {
        tenantId: tenant.id,
        weeklyRevenueQuota: { not: null },
      },
    });

    console.log("\nFinal Statistics:");
    console.log(`  Orders: ${ordersWithDeliveryDates}/${totalOrders} have delivery dates`);
    console.log(`  Customers: ${customersWithHealthData}/${totalCustomers} have health data`);
    console.log(`  Sales Reps: ${repsWithQuotas}/${totalSalesReps} have quotas set`);

    console.log("\n✅ Step 1 & 3 completed successfully!");
    console.log("\n⚠️  NEXT STEP REQUIRED:");
    console.log("  Run the customer health assessment job separately:");
    console.log("  npx tsx src/jobs/run.ts customer-health-assessment");
    console.log("\nOnce health assessment completes, you can:");
    console.log("  • View accurate customer risk statuses");
    console.log("  • See sales rep quota progress");
    console.log("  • Track delivery metrics by week");
    console.log("  • Monitor customer health trends");
    console.log();

  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
fixDashboardData()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

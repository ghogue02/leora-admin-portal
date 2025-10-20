import { config } from "dotenv";
import { PrismaClient, Prisma, CustomerRiskStatus } from "@prisma/client";

// Load environment variables
config();

// Validate DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
}

// Initialize Prisma with pgbouncer compatibility
const url = new URL(databaseUrl);
if (!url.searchParams.has("pgbouncer")) {
  url.searchParams.set("pgbouncer", "true");
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url.toString(),
    },
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of the week (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Add weeks to a date
 */
function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

/**
 * Get date range for the last N weeks
 */
function getLastNWeeks(n: number): Array<{ start: Date; end: Date }> {
  const weeks: Array<{ start: Date; end: Date }> = [];
  const today = new Date();

  for (let i = 0; i < n; i++) {
    const weekStart = getWeekStart(addWeeks(today, -i));
    const weekEnd = getWeekEnd(weekStart);
    weeks.push({ start: weekStart, end: weekEnd });
  }

  return weeks.reverse();
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random element from array
 */
function randomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Calculate customer risk status based on order patterns
 */
function calculateRiskStatus(
  lastOrderDate: Date | null,
  averageOrderIntervalDays: number | null,
  currentRevenue: number,
  establishedRevenue: number | null,
): CustomerRiskStatus {
  const daysSinceLastOrder = lastOrderDate
    ? daysBetween(lastOrderDate, new Date())
    : 999;

  // Dormant: 45+ days with no order
  if (daysSinceLastOrder >= 45) {
    return CustomerRiskStatus.DORMANT;
  }

  // At-risk (cadence): ordering frequency declining
  if (averageOrderIntervalDays && daysSinceLastOrder > averageOrderIntervalDays * 1.5) {
    return CustomerRiskStatus.AT_RISK_CADENCE;
  }

  // At-risk (revenue): revenue declining 15%+
  if (establishedRevenue && establishedRevenue > 0) {
    const revenueDecline = (establishedRevenue - currentRevenue) / establishedRevenue;
    if (revenueDecline >= 0.15) {
      return CustomerRiskStatus.AT_RISK_REVENUE;
    }
  }

  return CustomerRiskStatus.HEALTHY;
}

// ============================================================================
// MAIN SEED FUNCTIONS
// ============================================================================

async function main() {
  console.log("🌱 Starting comprehensive seed script...");
  console.log("⚠️  This script preserves ALL existing data (no deletions)\n");

  const stats = {
    salesRepsCreated: 0,
    customersAssigned: 0,
    sampleUsageRecords: 0,
    weeklyMetrics: 0,
    customerRiskUpdates: 0,
    productGoals: 0,
    topProductsCreated: 0,
  };

  // Get the default tenant (or first tenant)
  const tenant = await getOrCreateDefaultTenant();
  console.log(`✓ Using tenant: ${tenant.name} (${tenant.slug})\n`);

  // 1. Create sales rep profiles for existing users
  console.log("📊 Step 1: Creating sales rep profiles...");
  const salesReps = await createSalesRepProfiles(tenant.id);
  stats.salesRepsCreated = salesReps.length;
  console.log(`  ✓ Created/updated ${salesReps.length} sales rep profiles\n`);

  if (salesReps.length === 0) {
    console.log("⚠️  No users found. Creating at least one sales rep for demonstration...");
    const demoUser = await createDemoUser(tenant.id);
    const demoRep = await createSalesRepProfiles(tenant.id);
    salesReps.push(...demoRep);
    stats.salesRepsCreated = salesReps.length;
    console.log(`  ✓ Created demo user and sales rep\n`);
  }

  // 2. Assign customers to sales reps
  console.log("📊 Step 2: Assigning customers to sales reps...");
  const assignments = await assignCustomersToReps(tenant.id, salesReps);
  stats.customersAssigned = assignments;
  console.log(`  ✓ Assigned ${assignments} customers to sales reps\n`);

  // 3. Generate historical sample usage data
  console.log("📊 Step 3: Generating sample usage data...");
  const sampleUsage = await generateSampleUsageData(tenant.id, salesReps);
  stats.sampleUsageRecords = sampleUsage;
  console.log(`  ✓ Created ${sampleUsage} sample usage records\n`);

  // 4. Calculate and update customer risk status
  console.log("📊 Step 4: Calculating customer risk status...");
  const riskUpdates = await updateCustomerRiskStatus(tenant.id);
  stats.customerRiskUpdates = riskUpdates;
  console.log(`  ✓ Updated risk status for ${riskUpdates} customers\n`);

  // 5. Generate weekly metrics based on real order data
  console.log("📊 Step 5: Generating weekly metrics from order data...");
  const weeklyMetrics = await generateWeeklyMetrics(tenant.id, salesReps);
  stats.weeklyMetrics = weeklyMetrics;
  console.log(`  ✓ Created ${weeklyMetrics} weekly metric records\n`);

  // 6. Generate product goals for reps
  console.log("📊 Step 6: Creating product goals for sales reps...");
  const productGoals = await generateProductGoals(tenant.id, salesReps);
  stats.productGoals = productGoals;
  console.log(`  ✓ Created ${productGoals} product goal records\n`);

  // 7. Create Top 20 products based on real data
  console.log("📊 Step 7: Calculating Top 20 products...");
  const topProducts = await generateTopProducts(tenant.id);
  stats.topProductsCreated = topProducts;
  console.log(`  ✓ Created ${topProducts} top product records\n`);

  // Display final summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seed script completed successfully!");
  console.log("=".repeat(60));
  console.table(stats);

  return stats;
}

// ============================================================================
// TENANT SETUP
// ============================================================================

async function getOrCreateDefaultTenant() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "well-crafted";
  const tenantName = process.env.DEFAULT_TENANT_NAME ?? "Well Crafted Wine & Beverage Co.";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName },
  });

  // Ensure tenant settings exist
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      defaultPortalRole: "portal.viewer",
      revenueDropAlertThreshold: 0.15,
      sampleAllowancePerMonth: 60,
    },
  });

  return tenant;
}

// ============================================================================
// DEMO USER CREATION
// ============================================================================

async function createDemoUser(tenantId: string) {
  const email = "demo.rep@example.com";
  const fullName = "Demo Sales Rep";

  const existingUser = await prisma.user.findUnique({
    where: {
      tenantId_email: {
        tenantId,
        email,
      },
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const user = await prisma.user.create({
    data: {
      tenantId,
      email,
      fullName,
      hashedPassword: "$2a$10$demohashedpassword", // Dummy hash
      isActive: true,
    },
  });

  console.log(`  ✓ Created demo user: ${fullName} (${email})`);
  return user;
}

// ============================================================================
// SALES REP MANAGEMENT
// ============================================================================

async function createSalesRepProfiles(tenantId: string) {
  const users = await prisma.user.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    include: {
      salesRepProfile: true,
    },
  });

  const salesReps = [];
  const territories = ["North", "South", "East", "West", "Central"];
  const deliveryDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Skip if already has a sales rep profile
    if (user.salesRepProfile) {
      salesReps.push(user.salesRepProfile);
      continue;
    }

    const territory = territories[i % territories.length];
    const deliveryDay = deliveryDays[i % deliveryDays.length];

    const salesRep = await prisma.salesRep.create({
      data: {
        tenantId,
        userId: user.id,
        territoryName: `${territory} Territory`,
        deliveryDay,
        weeklyRevenueQuota: new Prisma.Decimal(15000),
        monthlyRevenueQuota: new Prisma.Decimal(60000),
        quarterlyRevenueQuota: new Prisma.Decimal(180000),
        annualRevenueQuota: new Prisma.Decimal(720000),
        weeklyCustomerQuota: 25,
        sampleAllowancePerMonth: 60,
        isActive: true,
      },
    });

    salesReps.push(salesRep);
    console.log(`  ✓ Created sales rep profile for ${user.fullName}`);
  }

  return salesReps;
}

// ============================================================================
// CUSTOMER ASSIGNMENT
// ============================================================================

async function assignCustomersToReps(
  tenantId: string,
  salesReps: Array<{ id: string; userId: string }>,
) {
  if (salesReps.length === 0) {
    console.log("  ⚠️  No sales reps available for assignment");
    return 0;
  }

  // Get all customers without a sales rep
  const unassignedCustomers = await prisma.customer.findMany({
    where: {
      tenantId,
      salesRepId: null,
      isPermanentlyClosed: false,
    },
  });

  console.log(`  → Found ${unassignedCustomers.length} unassigned customers`);

  let assignedCount = 0;

  // Distribute customers evenly across sales reps
  for (let i = 0; i < unassignedCustomers.length; i++) {
    const customer = unassignedCustomers[i];
    const salesRep = salesReps[i % salesReps.length];

    // Update customer with sales rep
    await prisma.customer.update({
      where: { id: customer.id },
      data: { salesRepId: salesRep.id },
    });

    // Create assignment record
    await prisma.customerAssignment.create({
      data: {
        tenantId,
        salesRepId: salesRep.id,
        customerId: customer.id,
        assignedAt: new Date(),
      },
    });

    assignedCount++;
  }

  return assignedCount;
}

// ============================================================================
// SAMPLE USAGE DATA
// ============================================================================

async function generateSampleUsageData(
  tenantId: string,
  salesReps: Array<{ id: string }>,
) {
  if (salesReps.length === 0) return 0;

  // Get active SKUs
  const skus = await prisma.sku.findMany({
    where: {
      tenantId,
      isActive: true,
    },
    take: 50, // Limit to top 50 SKUs for sample data
  });

  if (skus.length === 0) {
    console.log("  ⚠️  No SKUs found for sample usage");
    return 0;
  }

  // Get customers for each sales rep
  const customersMap = new Map<string, string[]>();

  for (const rep of salesReps) {
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        salesRepId: rep.id,
        isPermanentlyClosed: false,
      },
      take: 20, // Limit to 20 customers per rep
      select: { id: true },
    });

    customersMap.set(
      rep.id,
      customers.map((c) => c.id),
    );
  }

  let totalSamples = 0;
  const feedbackOptions = [
    "Customer loved it!",
    "Interested in ordering",
    "Not their style",
    "Will consider for next order",
    "Requested pricing information",
    null, // Some without feedback
  ];

  // Generate sample usage for the last 12 weeks
  const weeks = getLastNWeeks(12);

  for (const rep of salesReps) {
    const customerIds = customersMap.get(rep.id) || [];
    if (customerIds.length === 0) continue;

    // Generate 2-5 samples per week per rep
    for (const week of weeks) {
      const samplesThisWeek = randomInt(2, 5);

      for (let i = 0; i < samplesThisWeek; i++) {
        const customerId = randomElement(customerIds);
        const skuId = randomElement(skus)?.id;
        if (!customerId || !skuId) continue;

        const tastedAt = new Date(
          week.start.getTime() + Math.random() * (week.end.getTime() - week.start.getTime()),
        );

        const feedback = randomElement(feedbackOptions);
        const needsFollowUp = Math.random() > 0.7;
        const resultedInOrder = Math.random() > 0.6;

        try {
          await prisma.sampleUsage.create({
            data: {
              tenantId,
              salesRepId: rep.id,
              customerId,
              skuId,
              quantity: randomInt(1, 3),
              tastedAt,
              feedback: feedback || undefined,
              needsFollowUp,
              followedUpAt: needsFollowUp && Math.random() > 0.5 ? addWeeks(tastedAt, 1) : null,
              resultedInOrder,
            },
          });

          totalSamples++;
        } catch (error) {
          // Skip duplicates or errors
          console.log(`    (Skipped duplicate sample record)`);
        }
      }
    }
  }

  return totalSamples;
}

// ============================================================================
// CUSTOMER RISK STATUS
// ============================================================================

async function updateCustomerRiskStatus(tenantId: string) {
  const customers = await prisma.customer.findMany({
    where: {
      tenantId,
      isPermanentlyClosed: false,
    },
    include: {
      orders: {
        where: {
          status: { in: ["SUBMITTED", "FULFILLED"] },
        },
        orderBy: {
          orderedAt: "desc",
        },
      },
    },
  });

  let updatedCount = 0;

  for (const customer of customers) {
    if (customer.orders.length === 0) {
      // No orders - mark as dormant
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          riskStatus: CustomerRiskStatus.DORMANT,
          lastOrderDate: null,
          averageOrderIntervalDays: null,
        },
      });
      updatedCount++;
      continue;
    }

    // Calculate order intervals
    const orderDates = customer.orders
      .map((o) => o.orderedAt)
      .filter((date): date is Date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const lastOrderDate = orderDates[orderDates.length - 1] || null;

    let averageOrderIntervalDays: number | null = null;
    if (orderDates.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < orderDates.length; i++) {
        intervals.push(daysBetween(orderDates[i - 1], orderDates[i]));
      }
      averageOrderIntervalDays = Math.round(
        intervals.reduce((sum, val) => sum + val, 0) / intervals.length,
      );
    }

    // Calculate current revenue (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const recentOrders = customer.orders.filter(
      (o) => o.orderedAt && o.orderedAt >= ninetyDaysAgo,
    );
    const currentRevenue = recentOrders.reduce(
      (sum, order) => sum + (order.total ? Number(order.total) : 0),
      0,
    );

    const riskStatus = calculateRiskStatus(
      lastOrderDate,
      averageOrderIntervalDays,
      currentRevenue,
      customer.establishedRevenue ? Number(customer.establishedRevenue) : null,
    );

    // Update customer
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        lastOrderDate,
        averageOrderIntervalDays,
        riskStatus,
        dormancySince: riskStatus === CustomerRiskStatus.DORMANT ? lastOrderDate : null,
      },
    });

    updatedCount++;
  }

  return updatedCount;
}

// ============================================================================
// WEEKLY METRICS
// ============================================================================

async function generateWeeklyMetrics(
  tenantId: string,
  salesReps: Array<{ id: string }>,
) {
  if (salesReps.length === 0) return 0;

  let totalMetrics = 0;
  const weeks = getLastNWeeks(12); // Last 12 weeks

  for (const rep of salesReps) {
    // Get rep's customers
    const customers = await prisma.customer.findMany({
      where: {
        tenantId,
        salesRepId: rep.id,
      },
      select: { id: true },
    });

    const customerIds = customers.map((c) => c.id);

    for (const week of weeks) {
      // Check if metric already exists
      const existing = await prisma.repWeeklyMetric.findUnique({
        where: {
          tenantId_salesRepId_weekStartDate: {
            tenantId,
            salesRepId: rep.id,
            weekStartDate: week.start,
          },
        },
      });

      if (existing) {
        console.log(`    (Skipped existing metric for week ${week.start.toISOString()})`);
        continue;
      }

      // Get orders for this week for this rep's customers
      const weekOrders = await prisma.order.findMany({
        where: {
          tenantId,
          customerId: { in: customerIds },
          orderedAt: {
            gte: week.start,
            lte: week.end,
          },
          status: { in: ["SUBMITTED", "FULFILLED"] },
        },
      });

      // Calculate metrics
      const revenue = weekOrders.reduce(
        (sum, order) => sum + (order.total ? Number(order.total) : 0),
        0,
      );

      const uniqueCustomerOrders = new Set(weekOrders.map((o) => o.customerId)).size;

      // Get same week last year for comparison
      const lastYearStart = new Date(week.start);
      lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
      const lastYearEnd = new Date(week.end);
      lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);

      const lastYearOrders = await prisma.order.findMany({
        where: {
          tenantId,
          customerId: { in: customerIds },
          orderedAt: {
            gte: lastYearStart,
            lte: lastYearEnd,
          },
          status: { in: ["SUBMITTED", "FULFILLED"] },
        },
      });

      const revenueLastYear = lastYearOrders.reduce(
        (sum, order) => sum + (order.total ? Number(order.total) : 0),
        0,
      );

      // Create weekly metric
      await prisma.repWeeklyMetric.create({
        data: {
          tenantId,
          salesRepId: rep.id,
          weekStartDate: week.start,
          weekEndDate: week.end,
          revenue: new Prisma.Decimal(revenue),
          revenueLastYear: new Prisma.Decimal(revenueLastYear),
          uniqueCustomerOrders,
          newCustomersAdded: 0, // This would need historical data
          dormantCustomersCount: 0, // This would need historical data
          reactivatedCustomersCount: 0, // This would need historical data
          deliveryDaysInWeek: 1,
          inPersonVisits: randomInt(3, 8),
          tastingAppointments: randomInt(1, 4),
          emailContacts: randomInt(5, 15),
          phoneContacts: randomInt(2, 8),
          textContacts: randomInt(1, 5),
        },
      });

      totalMetrics++;
    }
  }

  return totalMetrics;
}

// ============================================================================
// PRODUCT GOALS
// ============================================================================

async function generateProductGoals(tenantId: string, salesReps: Array<{ id: string }>) {
  if (salesReps.length === 0) return 0;

  // Get top SKUs by revenue
  const topSkus = await prisma.orderLine.groupBy({
    by: ["skuId"],
    where: {
      tenantId,
      order: {
        status: { in: ["SUBMITTED", "FULFILLED"] },
      },
    },
    _sum: {
      quantity: true,
    },
    _count: {
      skuId: true,
    },
    orderBy: {
      _count: {
        skuId: "desc",
      },
    },
    take: 10,
  });

  if (topSkus.length === 0) {
    console.log("  ⚠️  No order data found for product goals");
    return 0;
  }

  let totalGoals = 0;
  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(quarterStart);
  quarterEnd.setMonth(quarterEnd.getMonth() + 3);
  quarterEnd.setDate(0); // Last day of quarter

  for (const rep of salesReps) {
    // Create goals for top 5 products
    const productsToTarget = topSkus.slice(0, 5);

    for (const product of productsToTarget) {
      // Check if goal already exists
      const existing = await prisma.repProductGoal.findFirst({
        where: {
          tenantId,
          salesRepId: rep.id,
          skuId: product.skuId,
          periodStart: quarterStart,
        },
      });

      if (existing) {
        continue;
      }

      const targetCases = randomInt(20, 100);
      const targetRevenue = targetCases * randomInt(800, 2000); // Rough estimate

      await prisma.repProductGoal.create({
        data: {
          tenantId,
          salesRepId: rep.id,
          skuId: product.skuId,
          targetCases,
          targetRevenue: new Prisma.Decimal(targetRevenue),
          periodStart: quarterStart,
          periodEnd: quarterEnd,
        },
      });

      totalGoals++;
    }
  }

  return totalGoals;
}

// ============================================================================
// TOP PRODUCTS
// ============================================================================

async function generateTopProducts(tenantId: string) {
  const now = new Date();
  const calculatedAt = now;

  // Calculate for last 30 days
  const periodEnd = now;
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 30);

  // Get orders in period
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      status: { in: ["SUBMITTED", "FULFILLED"] },
      orderedAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      lines: true,
    },
  });

  if (orders.length === 0) {
    console.log("  ⚠️  No orders found in the last 30 days");
    return 0;
  }

  // Aggregate by SKU
  const skuStats = new Map<
    string,
    {
      revenue: number;
      cases: number;
      customers: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const line of order.lines) {
      const existing = skuStats.get(line.skuId) || {
        revenue: 0,
        cases: 0,
        customers: new Set<string>(),
      };

      existing.revenue += line.quantity * Number(line.unitPrice);
      existing.cases += line.quantity;
      existing.customers.add(order.customerId);

      skuStats.set(line.skuId, existing);
    }
  }

  // Sort by revenue
  const sortedByRevenue = Array.from(skuStats.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 20);

  // Sort by volume
  const sortedByVolume = Array.from(skuStats.entries())
    .sort((a, b) => b[1].cases - a[1].cases)
    .slice(0, 20);

  // Sort by customer count
  const sortedByCustomers = Array.from(skuStats.entries())
    .sort((a, b) => b[1].customers.size - a[1].customers.size)
    .slice(0, 20);

  let totalCreated = 0;

  // Create revenue-based top products
  for (let i = 0; i < sortedByRevenue.length; i++) {
    const [skuId, stats] = sortedByRevenue[i];

    await prisma.topProduct.upsert({
      where: {
        tenantId_calculatedAt_rankingType_rank: {
          tenantId,
          calculatedAt,
          rankingType: "revenue",
          rank: i + 1,
        },
      },
      update: {
        skuId,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
      },
      create: {
        tenantId,
        skuId,
        rank: i + 1,
        calculatedAt,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        rankingType: "revenue",
      },
    });

    totalCreated++;
  }

  // Create volume-based top products
  for (let i = 0; i < sortedByVolume.length; i++) {
    const [skuId, stats] = sortedByVolume[i];

    await prisma.topProduct.upsert({
      where: {
        tenantId_calculatedAt_rankingType_rank: {
          tenantId,
          calculatedAt,
          rankingType: "volume",
          rank: i + 1,
        },
      },
      update: {
        skuId,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
      },
      create: {
        tenantId,
        skuId,
        rank: i + 1,
        calculatedAt,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        rankingType: "volume",
      },
    });

    totalCreated++;
  }

  // Create customer-based top products
  for (let i = 0; i < sortedByCustomers.length; i++) {
    const [skuId, stats] = sortedByCustomers[i];

    await prisma.topProduct.upsert({
      where: {
        tenantId_calculatedAt_rankingType_rank: {
          tenantId,
          calculatedAt,
          rankingType: "customers",
          rank: i + 1,
        },
      },
      update: {
        skuId,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
      },
      create: {
        tenantId,
        skuId,
        rank: i + 1,
        calculatedAt,
        periodStartDate: periodStart,
        periodEndDate: periodEnd,
        totalRevenue: new Prisma.Decimal(stats.revenue),
        totalCases: stats.cases,
        uniqueCustomers: stats.customers.size,
        rankingType: "customers",
      },
    });

    totalCreated++;
  }

  return totalCreated;
}

// ============================================================================
// EXECUTE MAIN
// ============================================================================

main()
  .catch((error) => {
    console.error("\n❌ Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

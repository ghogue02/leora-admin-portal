import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek } from "date-fns";

const db = new PrismaClient();

async function checkWeeklyOrders() {
  const tenantId = "58b8126a-2d2f-4f55-bc98-5b6784800bed";
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

  console.log("Checking weekly orders...");
  console.log("Week Start:", weekStart.toISOString());
  console.log("Week End:", weekEnd.toISOString());
  console.log("Current Date:", now.toISOString());
  console.log("\n");

  // Check orders with deliveredAt in this week
  const ordersThisWeek = await db.order.findMany({
    where: {
      tenantId,
      deliveredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: {
        not: "CANCELLED",
      },
    },
    select: {
      id: true,
      total: true,
      status: true,
      deliveredAt: true,
      orderedAt: true,
      customer: {
        select: {
          name: true,
          salesRepId: true,
        },
      },
    },
    orderBy: {
      deliveredAt: "desc",
    },
  });

  console.log(`Found ${ordersThisWeek.length} orders delivered this week`);
  console.log("\n");

  if (ordersThisWeek.length > 0) {
    console.log("Orders:");
    ordersThisWeek.forEach((order) => {
      console.log(
        `  - Order ${order.id.substring(0, 8)}: $${Number(order.total).toFixed(2)} (${order.status}) - Delivered: ${order.deliveredAt?.toISOString() || "null"}`
      );
      console.log(`    Customer: ${order.customer.name}`);
      console.log(`    Sales Rep ID: ${order.customer.salesRepId || "none"}`);
    });

    const totalRevenue = ordersThisWeek.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );
    console.log("\n");
    console.log(`Total Revenue: $${totalRevenue.toFixed(2)}`);
  } else {
    console.log("No orders found for this week.");
    console.log("\n");
    console.log("Checking all recent orders with deliveredAt...");

    const recentOrders = await db.order.findMany({
      where: {
        tenantId,
        deliveredAt: {
          not: null,
        },
      },
      select: {
        id: true,
        total: true,
        status: true,
        deliveredAt: true,
        orderedAt: true,
      },
      orderBy: {
        deliveredAt: "desc",
      },
      take: 10,
    });

    console.log(`Found ${recentOrders.length} recent orders with deliveredAt:`);
    recentOrders.forEach((order) => {
      console.log(
        `  - Order ${order.id.substring(0, 8)}: $${Number(order.total).toFixed(2)} - Delivered: ${order.deliveredAt?.toISOString()}`
      );
    });
  }

  // Check aggregate query
  console.log("\n");
  console.log("Testing aggregate query (same as dashboard API):");
  const aggregateResult = await db.order.aggregate({
    where: {
      tenantId,
      deliveredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: {
        not: "CANCELLED",
      },
    },
    _sum: {
      total: true,
    },
    _count: {
      id: true,
    },
  });

  console.log("Aggregate Result:");
  console.log(`  Count: ${aggregateResult._count.id}`);
  console.log(`  Sum: $${Number(aggregateResult._sum.total ?? 0).toFixed(2)}`);

  await db.$disconnect();
}

checkWeeklyOrders().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config();

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
if (!databaseUrl) {
  throw new Error("DIRECT_URL or DATABASE_URL must be set before running the audit script.");
}

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

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "well-crafted";
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });

  if (!tenant) {
    console.log(
      JSON.stringify(
        {
          tenantSlug,
          status: "missing",
          message: "Tenant not found. Seed process likely did not run.",
        },
        null,
        2,
      ),
    );
    return;
  }

  const tenantId = tenant.id;

  const [
    suppliers,
    products,
    skus,
    customers,
    customerAddresses,
    portalUsers,
    portalSessions,
    priceLists,
    priceListItems,
    inventories,
    orders,
    orderLines,
    invoices,
    payments,
    activities,
  ] = await Promise.all([
    prisma.supplier.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.sku.count({ where: { tenantId } }),
    prisma.customer.count({ where: { tenantId } }),
    prisma.customerAddress.count({ where: { tenantId } }),
    prisma.portalUser.count({ where: { tenantId } }),
    prisma.portalSession.count({ where: { tenantId } }),
    prisma.priceList.count({ where: { tenantId } }),
    prisma.priceListItem.count({ where: { tenantId } }),
    prisma.inventory.count({ where: { tenantId } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.orderLine.count({ where: { tenantId } }),
    prisma.invoice.count({ where: { tenantId } }),
    prisma.payment.count({ where: { tenantId } }),
    prisma.activity.count({ where: { tenantId } }),
  ]);

  const tenantSettings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: { defaultPortalRole: true },
  });

  let portalUsersWithDefaultRole = 0;
  if (tenantSettings?.defaultPortalRole) {
    const defaultRole = await prisma.role.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: tenantSettings.defaultPortalRole,
        },
      },
      select: { id: true },
    });

    if (defaultRole) {
      portalUsersWithDefaultRole = await prisma.portalUserRole.count({
        where: {
          roleId: defaultRole.id,
          portalUser: {
            tenantId,
          },
        },
      });
    }
  }

  const status: string[] = [];
  const missing: string[] = [];

  if (suppliers === 0) missing.push("suppliers");
  if (products === 0 || skus === 0) missing.push("catalog");
  if (customers === 0) missing.push("customers");
  if (portalUsers === 0) missing.push("portalUsers");
  if (priceLists === 0 || priceListItems === 0) missing.push("priceLists");
  if (inventories === 0) missing.push("inventory");
  if (orders === 0) missing.push("orders");
  if (invoices === 0) missing.push("invoices");
  if (payments === 0) missing.push("payments");
  if (activities === 0) missing.push("activities");

  if (missing.length === 0) {
    status.push("seeded");
  } else {
    status.push("partial");
  }

  console.log(
    JSON.stringify(
      {
        tenantSlug,
        status: status.join(","),
        counts: {
          suppliers,
          products,
          skus,
          customers,
          customerAddresses,
          portalUsers,
          portalUsersWithDefaultRole,
          portalSessions,
          priceLists,
          priceListItems,
          inventories,
          orders,
          orderLines,
          invoices,
          payments,
          activities,
        },
        missing,
        defaults: {
          portalRole: tenantSettings?.defaultPortalRole ?? null,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Audit failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

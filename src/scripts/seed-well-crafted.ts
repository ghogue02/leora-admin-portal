import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";
import { PortalUserStatus, Prisma, PrismaClient } from "@prisma/client";

const BASE_PERMISSIONS = [
  { code: "portal.dashboard.view", name: "View portal dashboard" },
  { code: "portal.orders.read", name: "View portal orders" },
  { code: "portal.orders.write", name: "Create and submit orders" },
  { code: "portal.cart.manage", name: "Manage shopping cart" },
  { code: "portal.favorites.manage", name: "Manage favorites" },
  { code: "portal.favorites.view", name: "View favorites" },
  { code: "portal.samples.manage", name: "Log samples" },
  { code: "portal.samples.view", name: "View samples" },
  { code: "portal.addresses.view", name: "View saved addresses" },
  { code: "portal.addresses.manage", name: "Manage saved addresses" },
  { code: "portal.payment-methods.view", name: "View payment methods" },
  { code: "portal.payment-methods.manage", name: "Manage payment methods" },
  { code: "portal.samples.configure", name: "Configure tenant sample allowance" },
  { code: "portal.notifications.view", name: "View notifications" },
  { code: "portal.support-tickets.view", name: "View support tickets" },
  { code: "portal.support-tickets.manage", name: "Create support tickets" },
  { code: "portal.callplan.view", name: "View call plans and tasks" },
  { code: "portal.callplan.manage", name: "Update call plan tasks" },
  { code: "portal.reports.view", name: "View portal reports" },
];

const BASE_ROLES = [
  {
    code: "portal.viewer",
    name: "Portal Viewer",
    permissions: [
      "portal.dashboard.view",
      "portal.orders.read",
      "portal.notifications.view",
      "portal.support-tickets.view",
      "portal.favorites.view",
      "portal.addresses.view",
      "portal.payment-methods.view",
      "portal.samples.view",
      "portal.callplan.view",
      "portal.reports.view",
    ],
  },
  {
    code: "portal.buyer",
    name: "Portal Buyer",
    permissions: [
      "portal.dashboard.view",
      "portal.orders.read",
      "portal.orders.write",
      "portal.cart.manage",
      "portal.favorites.manage",
      "portal.samples.manage",
      "portal.addresses.view",
      "portal.addresses.manage",
      "portal.notifications.view",
      "portal.support-tickets.view",
      "portal.support-tickets.manage",
      "portal.payment-methods.view",
      "portal.payment-methods.manage",
      "portal.callplan.view",
      "portal.callplan.manage",
      "portal.reports.view",
    ],
    isDefault: true,
  },
];

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the seed script.");
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORTS_DIR =
  process.env.SEED_EXPORTS_PATH ?? path.resolve(__dirname, "../../../data/exports");

const REQUIRED_FILES = {
  suppliers: "Export suppliers",
  products: "Export items",
  prices: "Export prices",
  customers: "Export customers",
  inventory: "inventory as at",
};

const OPTIONAL_EXPORTS: Record<string, string> = {
  orders: "Export orders",
  orderLines: "Export order lines",
  invoices: "Export invoices",
  payments: "Export payments",
  activities: "Export activities",
};

type CustomerEmailRecord = {
  customerId: string | null;
  customerName: string | null;
  contactName: string | null;
};

type SeedCustomersResult = {
  count: number;
  primaryCustomerId: string | null;
  customersByExternalId: Map<string, { id: string; name: string }>;
  emails: Map<string, CustomerEmailRecord>;
};

type SeedPortalUsersResult = {
  created: number;
  updated: number;
  total: number;
};

type PortalUserSeedCandidate = {
  email: string;
  fullName: string;
  customerId: string | null;
  portalUserKey?: string | null;
  source: "env" | "customer";
};

async function main() {
  const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "well-crafted";
  const tenantName =
    process.env.DEFAULT_TENANT_NAME ?? "Well Crafted Wine & Beverage Co.";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      defaultPortalRole: BASE_ROLES.find((r) => r.isDefault)?.code ?? "portal.viewer",
    },
  });

  await ensureBasePermissions(prisma);
  await ensureTenantRoles(tenant.id, prisma);

  const missingOptionalExports = listMissingOptionalExports();

  const supplierRecords = readExport("suppliers");
  const suppliersMap = await seedSuppliers(prisma, tenant.id, supplierRecords);

  const productRecords = readExport("products");
  const { products, skus } = await seedProductsAndSkus(
    prisma,
    tenant.id,
    productRecords,
    suppliersMap,
  );

  const priceRecords = readExport("prices");
  const { priceLists, priceListItems } = await seedPriceLists(
    prisma,
    tenant.id,
    priceRecords,
    skus,
  );

  const customerRecords = readExport("customers");
  const customers = await seedCustomers(prisma, tenant.id, customerRecords);
  const portalUsers = await seedPortalUsers(prisma, tenant.id, customers);

  const inventoryRecords = readExport("inventory");
  const inventories = await seedInventory(prisma, tenant.id, inventoryRecords, skus);

  const summary = {
    suppliers: suppliersMap.size,
    products: products.size,
    skus: skus.size,
    customers: customers.count,
    portalUsers: portalUsers.total,
    priceLists,
    priceListItems,
    inventories,
    missingOptionalExports,
  };

  const summaryForDisplay = {
    suppliers: summary.suppliers,
    products: summary.products,
    skus: summary.skus,
    customers: summary.customers,
    portalUsers: summary.portalUsers,
    priceLists: summary.priceLists,
    priceListItems: summary.priceListItems,
    inventories: summary.inventories,
    missingOptionalExports:
      summary.missingOptionalExports.length > 0
        ? summary.missingOptionalExports.join(", ")
        : "none",
  };

  console.table(summaryForDisplay);

  let verification: Awaited<ReturnType<typeof verifySeed>> | null = null;

  try {
    verification = await verifySeed(prisma, tenant.id, {
      missingOptionalExports,
    });

    const verificationForDisplay = {
      suppliers: verification.counts.suppliers,
      products: verification.counts.products,
      skus: verification.counts.skus,
      customers: verification.counts.customers,
      portalUsers: verification.counts.portalUsers,
      portalUsersWithDefaultRole: verification.counts.portalUsersWithDefaultRole,
      priceLists: verification.counts.priceLists,
      priceListItems: verification.counts.priceListItems,
      inventories: verification.counts.inventories,
      orders: verification.counts.orders,
      invoices: verification.counts.invoices,
      activities: verification.counts.activities,
    };

    console.table(verificationForDisplay);

    if (verification.warnings.length > 0) {
      verification.warnings.forEach((warning) => {
        console.warn(`[warn] ${warning}`);
      });
    }
  } catch (error) {
    console.warn("[warn] Verification step skipped due to error:", error);
  }

  console.log(
    JSON.stringify(
      {
        summary,
        verification,
      },
      null,
      2,
    ),
  );
}

async function ensureBasePermissions(db: PrismaClient) {
  for (const permission of BASE_PERMISSIONS) {
    await db.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }
}

async function ensureTenantRoles(tenantId: string, db: PrismaClient) {
  const permissions = await db.permission.findMany({
    where: { code: { in: BASE_PERMISSIONS.map((p) => p.code) } },
  });
  const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));

  for (const roleDef of BASE_ROLES) {
    const role = await db.role.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: roleDef.code,
        },
      },
      update: {
        name: roleDef.name,
        isDefault: roleDef.isDefault ?? false,
      },
      create: {
        tenantId,
        code: roleDef.code,
        name: roleDef.name,
        isDefault: roleDef.isDefault ?? false,
      },
    });

    const desiredPermissionIds = roleDef.permissions
      .map((code) => permissionMap.get(code))
      .filter((id): id is string => Boolean(id));

    if (desiredPermissionIds.length > 0) {
      await db.rolePermission.deleteMany({
        where: { roleId: role.id },
      });
      await db.rolePermission.createMany({
        data: desiredPermissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
}

async function seedSuppliers(
  db: PrismaClient,
  tenantId: string,
  records: Record<string, string>[],
) {
  const supplierMap = new Map<string, string>();
  for (const record of records) {
    const name = value(record, "Company name");
    if (!name) continue;

    const supplier = await db.supplier.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name,
        },
      },
      update: {
        externalId: value(record, "License number") || null,
      },
      create: {
        tenantId,
        name,
        externalId: value(record, "License number") || null,
      },
    });

    supplierMap.set(normalizeKey(name), supplier.id);
  }
  return supplierMap;
}

async function seedProductsAndSkus(
  db: PrismaClient,
  tenantId: string,
  records: Record<string, string>[],
  supplierMap: Map<string, string>,
) {
  const productMap = new Map<string, string>();
  const skuMap = new Map<string, string>();

  for (const record of records) {
    const itemName = value(record, "Item");
    const skuCode = value(record, "SKU");
    if (!itemName || !skuCode) continue;

    const supplierName = value(record, "Supplier");
    const supplierId = supplierName ? supplierMap.get(normalizeKey(supplierName)) : undefined;

    const product = await db.product.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: itemName,
        },
      },
      update: {
        brand: value(record, "Brand") || null,
        category: value(record, "Category") || null,
        description: value(record, "Manufacturer") || null,
        supplierId: supplierId ?? null,
      },
      create: {
        tenantId,
        name: itemName,
        brand: value(record, "Brand") || null,
        category: value(record, "Category") || null,
        description: value(record, "Manufacturer") || null,
        supplierId: supplierId ?? null,
      },
    });
    productMap.set(normalizeKey(itemName), product.id);

    const sku = await db.sku.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: skuCode,
        },
      },
      update: {
        productId: product.id,
        size: value(record, "Units per item") || null,
        unitOfMeasure: value(record, "Unit") || null,
        abv: parseFloatSafe(value(record, "Label alcohol")),
        casesPerPallet: parseNumber(value(record, "Items per case")),
        pricePerUnit: decimal(value(record, "Unit COGS")),
      },
      create: {
        tenantId,
        productId: product.id,
        code: skuCode,
        size: value(record, "Units per item") || null,
        unitOfMeasure: value(record, "Unit") || null,
        abv: parseFloatSafe(value(record, "Label alcohol")),
        casesPerPallet: parseNumber(value(record, "Items per case")),
        pricePerUnit: decimal(value(record, "Unit COGS")),
      },
    });

    skuMap.set(normalizeKey(skuCode), sku.id);
  }

  return { products: productMap, skus: skuMap };
}

async function seedPriceLists(
  db: PrismaClient,
  tenantId: string,
  records: Record<string, string>[],
  skuMap: Map<string, string>,
) {
  const priceListIds = new Map<string, string>();
  let priceListItems = 0;

  for (const record of records) {
    const listName = value(record, "Price list");
    const skuCode = value(record, "SKU");
    if (!listName || !skuCode) continue;

    const priceList = await db.priceList.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: listName,
        },
      },
      update: {},
      create: {
        tenantId,
        name: listName,
      },
    });

    priceListIds.set(normalizeKey(listName), priceList.id);

    const skuId = skuMap.get(normalizeKey(skuCode));
    if (!skuId) continue;

    await db.priceListItem.upsert({
      where: {
        tenantId_priceListId_skuId: {
          tenantId,
          priceListId: priceList.id,
          skuId,
        },
      },
      update: {
        price: decimal(value(record, "Price")),
        minQuantity: parseNumber(value(record, "Min. Qty.")) ?? 1,
      },
      create: {
        tenantId,
        priceListId: priceList.id,
        skuId,
        price: decimal(value(record, "Price")),
        minQuantity: parseNumber(value(record, "Min. Qty.")) ?? 1,
      },
    });

    priceListItems += 1;
  }

  return { priceLists: priceListIds.size, priceListItems };
}

async function seedCustomers(
  db: PrismaClient,
  tenantId: string,
  records: Record<string, string>[],
) {
  let count = 0;
  let primaryCustomerId: string | null = null;
  const customersByExternalId = new Map<string, { id: string; name: string }>();
  const emails = new Map<string, CustomerEmailRecord>();

  for (const record of records) {
    const name = value(record, "Company name");
    if (!name) continue;

    const externalId = resolveCustomerExternalId(record, name);
    if (!externalId) continue;
    const externalKey = normalizeKey(externalId);

    const customer = await db.customer.upsert({
      where: {
        tenantId_externalId: {
          tenantId,
          externalId,
        },
      },
      update: {
        name,
        accountNumber: value(record, "Account number") || value(record, "License number") || null,
        billingEmail: value(record, "Billing e-mail address") || null,
        phone: value(record, "Phone number") || null,
        street1: value(record, "Shipping address line 1") || null,
        street2: value(record, "Shipping address line 2") || null,
        city: value(record, "Shipping address city") || null,
        state: value(record, "Shipping address province") || null,
        postalCode: value(record, "Shipping address postal code") || null,
        country: value(record, "Shipping address country") || "United States",
        paymentTerms: value(record, "Payment terms") || "Net 30",
      },
      create: {
        tenantId,
        externalId,
        name,
        accountNumber: value(record, "Account number") || value(record, "License number") || null,
        billingEmail: value(record, "Billing e-mail address") || null,
        phone: value(record, "Phone number") || null,
        street1: value(record, "Shipping address line 1") || null,
        street2: value(record, "Shipping address line 2") || null,
        city: value(record, "Shipping address city") || null,
        state: value(record, "Shipping address province") || null,
        postalCode: value(record, "Shipping address postal code") || null,
        country: value(record, "Shipping address country") || "United States",
        paymentTerms: value(record, "Payment terms") || "Net 30",
      },
    });

    if (!customersByExternalId.has(externalKey)) {
      count += 1;
      if (!primaryCustomerId) {
        primaryCustomerId = customer.id;
      }
    }

    customersByExternalId.set(externalKey, { id: customer.id, name: customer.name });

    const street1 = value(record, "Shipping address line 1");
    const city = value(record, "Shipping address city");
    if (street1 && city) {
      await db.customerAddress.upsert({
        where: {
          tenantId_customerId_label: {
            tenantId,
            customerId: customer.id,
            label: "primary",
          },
        },
        update: {
          street1,
          street2: value(record, "Shipping address line 2") || null,
          city,
          state: value(record, "Shipping address province") || null,
          postalCode: value(record, "Shipping address postal code") || null,
          country: value(record, "Shipping address country") || "United States",
          isDefault: true,
        },
        create: {
          tenantId,
          customerId: customer.id,
          label: "primary",
          street1,
          street2: value(record, "Shipping address line 2") || null,
          city,
          state: value(record, "Shipping address province") || null,
          postalCode: value(record, "Shipping address postal code") || null,
          country: value(record, "Shipping address country") || "United States",
          isDefault: true,
        },
      });
    }

    const contactLabel = contactName(record);
    const emailValues = extractEmails(
      value(record, "E-mail address"),
      value(record, "Billing e-mail address"),
    );

    for (const email of emailValues) {
      if (!emails.has(email)) {
        emails.set(email, {
          customerId: customer.id,
          customerName: customer.name,
          contactName: contactLabel,
        });
      }
    }
  }

  return {
    count,
    primaryCustomerId,
    customersByExternalId,
    emails,
  };
}

async function seedPortalUsers(
  db: PrismaClient,
  tenantId: string,
  customers: SeedCustomersResult,
): Promise<SeedPortalUsersResult> {
  const tenantSettings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { defaultPortalRole: true },
  });

  const defaultRoleCode =
    tenantSettings?.defaultPortalRole ?? BASE_ROLES.find((role) => role.isDefault)?.code ?? "portal.viewer";

  const defaultRole = await db.role.findUnique({
    where: {
      tenantId_code: {
        tenantId,
        code: defaultRoleCode,
      },
    },
    select: { id: true },
  });

  if (!defaultRole) {
    throw new Error(
      `Default portal role "${defaultRoleCode}" could not be resolved for tenant ${tenantId}.`,
    );
  }

  const defaultPortalUserKey = process.env.DEFAULT_PORTAL_USER_KEY?.trim() || undefined;
  const fallbackDomain = process.env.PORTAL_USER_EMAIL_DOMAIN?.trim() || "example.dev";
  const envEmail =
    process.env.DEFAULT_PORTAL_USER_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_DEFAULT_PORTAL_USER_EMAIL?.trim();
  const defaultEmail = envEmail || (fallbackDomain ? `demo@${fallbackDomain}` : null);
  const defaultFullName = process.env.DEFAULT_PORTAL_USER_NAME?.trim() || "Demo Buyer";
  const portalUserLimitValue = Number(process.env.SEED_MAX_PORTAL_USERS ?? "0");
  const portalUserLimit =
    Number.isFinite(portalUserLimitValue) && portalUserLimitValue > 0
      ? portalUserLimitValue
      : Number.POSITIVE_INFINITY;

  const candidates = new Map<string, PortalUserSeedCandidate>();

  if (defaultEmail) {
    candidates.set(defaultEmail.toLowerCase(), {
      email: defaultEmail.toLowerCase(),
      fullName: defaultFullName,
      customerId: customers.primaryCustomerId ?? null,
      portalUserKey: defaultPortalUserKey ?? null,
      source: "env",
    });
  }

  for (const [email, metadata] of customers.emails.entries()) {
    const normalizedEmail = email.toLowerCase();
    if (!candidates.has(normalizedEmail)) {
      candidates.set(normalizedEmail, {
        email: normalizedEmail,
        fullName:
          metadata.contactName && metadata.contactName.trim().length > 0
            ? metadata.contactName.trim()
            : metadata.customerName ?? normalizedEmail,
        customerId: metadata.customerId,
        source: "customer",
      });
    }
  }

  let processed = 0;
  let created = 0;
  let updated = 0;

  for (const candidate of candidates.values()) {
    if (processed >= portalUserLimit) {
      break;
    }
    processed += 1;

    const existing = await db.portalUser.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email: candidate.email,
        },
      },
    });

    const baseData = {
      fullName: candidate.fullName,
      customerId: candidate.customerId ?? null,
      status: PortalUserStatus.ACTIVE,
    };

    const data =
      candidate.portalUserKey !== undefined
        ? { ...baseData, portalUserKey: candidate.portalUserKey }
        : baseData;

    let portalUserId: string;
    if (existing) {
      const updatedPortalUser = await db.portalUser.update({
        where: { id: existing.id },
        data,
      });
      portalUserId = updatedPortalUser.id;
      updated += 1;
    } else {
      const createdPortalUser = await db.portalUser.create({
        data: {
          tenantId,
          email: candidate.email,
          ...data,
        },
      });
      portalUserId = createdPortalUser.id;
      created += 1;
    }

    await db.portalUserRole.upsert({
      where: {
        portalUserId_roleId: {
          portalUserId,
          roleId: defaultRole.id,
        },
      },
      update: {},
      create: {
        portalUserId,
        roleId: defaultRole.id,
      },
    });
  }

  return {
    created,
    updated,
    total: processed,
  };
}

async function seedInventory(
  db: PrismaClient,
  tenantId: string,
  records: Record<string, string>[],
  skuMap: Map<string, string>,
) {
  let count = 0;

  for (const record of records) {
    const skuCode = value(record, "SKU");
    if (!skuCode) continue;
    const skuId = skuMap.get(normalizeKey(skuCode));
    if (!skuId) continue;

    const location = value(record, "Warehouse") || "default";
    const onHand = parseNumber(value(record, "Unit quantity")) ?? 0;

    await db.inventory.upsert({
      where: {
        tenantId_skuId_location: {
          tenantId,
          skuId,
          location,
        },
      },
      update: {
        onHand,
      },
      create: {
        tenantId,
        skuId,
        location,
        onHand,
      },
    });
    count += 1;
  }

  return count;
}

async function verifySeed(
  db: PrismaClient,
  tenantId: string,
  options: { missingOptionalExports: string[] },
) {
  const [
    suppliers,
    products,
    skus,
    customers,
    portalUsers,
    priceLists,
    priceListItems,
    inventories,
    orders,
    invoices,
    activities,
  ] = await Promise.all([
    db.supplier.count({ where: { tenantId } }),
    db.product.count({ where: { tenantId } }),
    db.sku.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId } }),
    db.portalUser.count({ where: { tenantId } }),
    db.priceList.count({ where: { tenantId } }),
    db.priceListItem.count({ where: { tenantId } }),
    db.inventory.count({ where: { tenantId } }),
    db.order.count({ where: { tenantId } }),
    db.invoice.count({ where: { tenantId } }),
    db.activity.count({ where: { tenantId } }),
  ]);

  let portalUsersWithDefaultRole = 0;
  const warnings: string[] = [];

  const tenantSettings = await db.tenantSettings.findUnique({
    where: { tenantId },
    select: { defaultPortalRole: true },
  });

  if (tenantSettings?.defaultPortalRole) {
    const defaultRole = await db.role.findUnique({
      where: {
        tenantId_code: {
          tenantId,
          code: tenantSettings.defaultPortalRole,
        },
      },
      select: { id: true },
    });

    if (defaultRole) {
      portalUsersWithDefaultRole = await db.portalUserRole.count({
        where: {
          roleId: defaultRole.id,
          portalUser: {
            tenantId,
          },
        },
      });
    } else {
      warnings.push(
        `Default portal role "${tenantSettings.defaultPortalRole}" is missing for tenant ${tenantId}.`,
      );
    }
  }

  if (portalUsers === 0) {
    warnings.push("No portal users were created for the tenant.");
  }

  if (portalUsersWithDefaultRole === 0 && portalUsers > 0) {
    warnings.push("No portal users are assigned to the default portal role.");
  }

  if (orders === 0 && !options.missingOptionalExports.includes("orders")) {
    warnings.push("No orders were seeded; expected historical order data.");
  }

  if (invoices === 0 && !options.missingOptionalExports.includes("invoices")) {
    warnings.push("No invoices were seeded; expected invoice export.");
  }

  if (activities === 0 && !options.missingOptionalExports.includes("activities")) {
    warnings.push("No activities were seeded; expected activity export.");
  }

  return {
    counts: {
      suppliers,
      products,
      skus,
      customers,
      portalUsers,
      portalUsersWithDefaultRole,
      priceLists,
      priceListItems,
      inventories,
      orders,
      invoices,
      activities,
    },
    warnings,
  };
}

function readExport(key: keyof typeof REQUIRED_FILES) {
  const prefix = REQUIRED_FILES[key];
  const file = findExportFile(prefix);
  if (!file) {
    return [];
  }
  const contents = fs.readFileSync(file, "utf-8");
  const sanitized = stripPreamble(contents);

  if (!sanitized) {
    return [];
  }

  return parse(sanitized, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
}

function findExportFile(prefix: string, options?: { required?: boolean }) {
  const entries = fs.readdirSync(EXPORTS_DIR);
  const normalizedPrefix = prefix.toLowerCase();
  const match =
    entries.find((entry) => entry.toLowerCase().startsWith(normalizedPrefix)) ??
    entries.find((entry) => entry.toLowerCase().includes(normalizedPrefix));
  if (!match) {
    if (options?.required === false) {
      return null;
    }
    throw new Error(`Expected export file with prefix "${prefix}" in ${EXPORTS_DIR}`);
  }
  return path.join(EXPORTS_DIR, match);
}

function stripPreamble(csv: string) {
  const lines = csv.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const normalized = trimmed.replace(/^"+|"+$/g, "");
    if (normalized.toLowerCase().startsWith("sep=")) return false;
    if (normalized.startsWith("Export")) return false;
    return normalized.includes(",");
  });

  if (startIndex === -1) {
    return "";
  }

  return lines.slice(startIndex).join("\n");
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

function listMissingOptionalExports() {
  return Object.entries(OPTIONAL_EXPORTS).reduce<string[]>((missing, [key, prefix]) => {
    const file = findExportFile(prefix, { required: false });
    if (!file) {
      missing.push(key);
    }
    return missing;
  }, []);
}

function resolveCustomerExternalId(record: Record<string, string>, fallbackName: string) {
  return (
    value(record, "License number") ||
    value(record, "Account number") ||
    value(record, "Company name") ||
    fallbackName
  );
}

function contactName(record: Record<string, string>) {
  const first = value(record, "First name");
  const last = value(record, "Last name");
  const salutation = value(record, "Salutation name");
  const parts = [first, last].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  if (salutation) {
    return salutation;
  }
  const company = value(record, "Company name");
  return company || null;
}

function extractEmails(...rawInputs: (string | null | undefined)[]) {
  const emails = new Set<string>();
  for (const raw of rawInputs) {
    if (!raw) continue;
    const tokens = raw
      .split(/[\s,;]+/)
      .map((token) => token.replace(/[<>]/g, "").trim())
      .filter(Boolean);
    for (const token of tokens) {
      const normalized = token.toLowerCase();
      if (isValidEmail(normalized)) {
        emails.add(normalized);
      }
    }
  }
  return Array.from(emails);
}

function isValidEmail(value: string) {
  if (!value) return false;
  const emailPattern =
    /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/;
  return emailPattern.test(value);
}

function value(record: Record<string, string>, key: string) {
  return (record[key] ?? "").trim();
}

function parseNumber(input: string) {
  if (!input) return undefined;
  const numeric = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : undefined;
}

function parseFloatSafe(input: string) {
  if (!input) return undefined;
  const numeric = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function decimal(input: string): Prisma.Decimal {
  const sanitized = input ? input.replace(/[^0-9.\-]/g, "") : "";
  if (!sanitized) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(sanitized);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

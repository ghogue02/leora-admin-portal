import { InvoiceStatus, OrderStatus, Prisma, PrismaClient } from "@prisma/client";
import { parse } from "csv-parse/sync";

export type SalesReportRecord = Record<string, string>;

export type SalesReportIngestionResult = {
  processedInvoices: number;
  ordersCreated: number;
  ordersUpdated: number;
  orderLines: number;
  invoicesCreated: number;
  invoicesUpdated: number;
  skippedInvoices: number;
  missingCustomers: string[];
  missingSkus: string[];
};

type GroupedOrderLineRecord = {
  invoiceNumber: string;
  orderedAt: Date | null;
  postedAt: Date | null;
  dueDate: Date | null;
  status: string | null;
  purchaseOrderNumber: string | null;
  deliveryStart: string | null;
  deliveryEnd: string | null;
  specialInstructions: string | null;
  customerName: string;
  salesperson: string | null;
  shippingAddress: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  lines: Array<{
    skuCode: string;
    itemName: string | null;
    supplierName: string | null;
    quantity: number;
    cases: number | null;
    liters: number | null;
    unitPrice: number | null;
    netPrice: number | null;
  }>;
};

type CustomerLookupEntry = {
  id: string;
  externalId: string | null;
};

export function parseSalesReportCsv(csvContent: string): SalesReportRecord[] {
  const sanitized = stripPreamble(csvContent);
  if (!sanitized) {
    return [];
  }

  return parse(sanitized, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as SalesReportRecord[];
}

export async function ingestSalesReportRecords(
  db: PrismaClient,
  tenantId: string,
  records: SalesReportRecord[],
): Promise<SalesReportIngestionResult | null> {
  if (records.length === 0) {
    return null;
  }

  const grouped = groupOrderLineRecords(records);
  if (grouped.size === 0) {
    return null;
  }

  const skuRows = await db.sku.findMany({
    where: { tenantId },
    select: { id: true, code: true },
  });
  const skuMap = new Map<string, string>();
  skuRows.forEach((sku) => {
    if (sku.code) {
      skuMap.set(normalizeKey(sku.code), sku.id);
    }
  });

  const customers = await db.customer.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      externalId: true,
    },
  });
  const customersByName = new Map<string, CustomerLookupEntry>();
  customers.forEach((customer) => {
    customersByName.set(normalizeKey(customer.name), {
      id: customer.id,
      externalId: customer.externalId,
    });
  });

  const stats: SalesReportIngestionResult = {
    processedInvoices: grouped.size,
    ordersCreated: 0,
    ordersUpdated: 0,
    orderLines: 0,
    invoicesCreated: 0,
    invoicesUpdated: 0,
    skippedInvoices: 0,
    missingCustomers: [],
    missingSkus: [],
  };

  const missingCustomers = new Set<string>();
  const missingSkus = new Set<string>();

  for (const group of grouped.values()) {
    const invoiceNumber = group.invoiceNumber.trim();
    if (!invoiceNumber) {
      stats.skippedInvoices += 1;
      continue;
    }

    const customerId = await ensureCustomerForGroup(db, tenantId, group, customersByName);
    if (!customerId) {
      missingCustomers.add(group.customerName || "unknown");
      stats.skippedInvoices += 1;
      continue;
    }

    const orderStatus = mapOrderStatus(group.status);
    const orderedAt = group.orderedAt;
    const fulfilledAt = group.postedAt ?? orderedAt;
    const deliveryWeek = fulfilledAt ? computeIsoWeekNumber(fulfilledAt) : null;
    const deliveryTimeWindow = buildDeliveryTimeWindow(group.deliveryStart, group.deliveryEnd);

    const preparedLines: Array<{
      skuId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      casesQuantity?: Prisma.Decimal;
      totalLiters?: Prisma.Decimal;
    }> = [];
    let orderTotal = 0;
    let invoiceLiters = 0;

    for (const line of group.lines) {
      const skuId = skuMap.get(normalizeKey(line.skuCode));
      if (!skuId) {
        missingSkus.add(line.skuCode);
        continue;
      }

      const quantity = Number.isFinite(line.quantity) ? line.quantity : 0;
      const unitPrice = line.unitPrice ?? 0;
      const netPrice = line.netPrice ?? quantity * unitPrice;
      orderTotal += netPrice;
      if (line.liters) {
        invoiceLiters += line.liters;
      }

      const payload: {
        skuId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        casesQuantity?: Prisma.Decimal;
        totalLiters?: Prisma.Decimal;
      } = {
        skuId,
        quantity,
        unitPrice: decimal(unitPrice.toString()),
      };

      if (line.cases !== null && line.cases !== undefined) {
        payload.casesQuantity = new Prisma.Decimal(line.cases.toString());
      }

      if (line.liters !== null && line.liters !== undefined) {
        payload.totalLiters = new Prisma.Decimal(line.liters.toString());
      }

      preparedLines.push(payload);
    }

    if (preparedLines.length === 0) {
      stats.skippedInvoices += 1;
      continue;
    }

    await db.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { orderNumber: invoiceNumber },
        select: { id: true },
      });

      const order = await tx.order.upsert({
        where: { orderNumber: invoiceNumber },
        update: {
          customerId,
          orderedAt,
          fulfilledAt,
          deliveredAt: fulfilledAt,
          status: orderStatus,
          deliveryWeek,
          deliveryTimeWindow: deliveryTimeWindow ?? undefined,
          total: decimal(orderTotal.toFixed(2)),
          currency: "USD",
          warehouseLocation: group.shippingAddress.city ?? undefined,
          deliveryDate: fulfilledAt ?? undefined,
          requestedDeliveryDate: group.dueDate ?? undefined,
        },
        create: {
          tenantId,
          customerId,
          orderNumber: invoiceNumber,
          orderedAt,
          fulfilledAt,
          deliveredAt: fulfilledAt,
          status: orderStatus,
          deliveryWeek,
          deliveryTimeWindow: deliveryTimeWindow ?? undefined,
          total: decimal(orderTotal.toFixed(2)),
          currency: "USD",
          deliveryDate: fulfilledAt ?? undefined,
          requestedDeliveryDate: group.dueDate ?? undefined,
          specialInstructions: group.specialInstructions ?? undefined,
        },
        select: { id: true },
      });

      if (existingOrder) {
        stats.ordersUpdated += 1;
      } else {
        stats.ordersCreated += 1;
      }

      await tx.orderLine.deleteMany({
        where: { orderId: order.id },
      });

      await tx.orderLine.createMany({
        data: preparedLines.map((line) => ({
          tenantId,
          orderId: order.id,
          skuId: line.skuId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          appliedPricingRules: null,
          casesQuantity: line.casesQuantity,
          totalLiters: line.totalLiters,
        })),
      });

      stats.orderLines += preparedLines.length;

      const existingInvoice = await tx.invoice.findFirst({
        where: {
          tenantId,
          orderId: order.id,
        },
        select: { id: true },
      });

      const invoiceData = {
        tenantId,
        orderId: order.id,
        customerId,
        invoiceNumber,
        status: mapInvoiceStatus(orderStatus),
        subtotal: decimal(orderTotal.toFixed(2)),
        total: decimal(orderTotal.toFixed(2)),
        dueDate: group.dueDate ?? undefined,
        issuedAt: group.orderedAt ?? undefined,
        shipDate: fulfilledAt ?? undefined,
        shippingMethod: deliveryTimeWindow ?? undefined,
        specialInstructions: group.specialInstructions ?? undefined,
        salesperson: group.salesperson ?? undefined,
        totalLiters: invoiceLiters ? new Prisma.Decimal(invoiceLiters.toString()) : undefined,
        poNumber: group.purchaseOrderNumber ?? undefined,
        paymentTermsText: "Net 30",
      };

      if (existingInvoice) {
        await tx.invoice.update({
          where: { id: existingInvoice.id },
          data: invoiceData,
        });
        stats.invoicesUpdated += 1;
      } else {
        await tx.invoice.create({ data: invoiceData });
        stats.invoicesCreated += 1;
      }
    });
  }

  stats.missingCustomers = Array.from(missingCustomers);
  stats.missingSkus = Array.from(missingSkus);

  return stats;
}

async function ensureCustomerForGroup(
  db: PrismaClient,
  tenantId: string,
  group: GroupedOrderLineRecord,
  customersByName: Map<string, CustomerLookupEntry>,
) {
  const normalizedCustomer = normalizeKey(group.customerName);
  const existing = customersByName.get(normalizedCustomer);
  if (existing) {
    return existing.id;
  }

  const customer = await createCustomerFromGroup(db, tenantId, group);
  if (customer) {
    customersByName.set(normalizeKey(group.customerName), {
      id: customer.id,
      externalId: customer.externalId,
    });
  }
  return customer?.id ?? null;
}

async function createCustomerFromGroup(
  db: PrismaClient,
  tenantId: string,
  group: GroupedOrderLineRecord,
) {
  const name = group.customerName?.trim();
  if (!name) {
    return null;
  }

  const customer = await db.customer.create({
    data: {
      tenantId,
      name,
      externalId: name,
      billingEmail: null,
      phone: null,
      street1: group.shippingAddress.line1,
      street2: group.shippingAddress.line2,
      city: group.shippingAddress.city,
      state: group.shippingAddress.state,
      postalCode: group.shippingAddress.postalCode,
      country: group.shippingAddress.country ?? "United States",
      paymentTerms: "Net 30",
    },
    select: { id: true, externalId: true },
  });

  if (group.shippingAddress.line1 && group.shippingAddress.city) {
    await db.customerAddress.create({
      data: {
        tenantId,
        customerId: customer.id,
        label: "primary",
        street1: group.shippingAddress.line1,
        street2: group.shippingAddress.line2,
        city: group.shippingAddress.city,
        state: group.shippingAddress.state,
        postalCode: group.shippingAddress.postalCode,
        country: group.shippingAddress.country ?? "United States",
        isDefault: true,
      },
    });
  }

  return customer;
}

function groupOrderLineRecords(records: SalesReportRecord[]) {
  const grouped = new Map<string, GroupedOrderLineRecord>();

  for (const record of records) {
    const invoiceNumber = value(record, "Invoice number");
    const skuCode = value(record, "SKU");
    if (!invoiceNumber || !skuCode) continue;
    const normalizedInvoice = invoiceNumber.trim();
    if (!normalizedInvoice) continue;

    let entry = grouped.get(normalizedInvoice);
    if (!entry) {
      entry = {
        invoiceNumber: normalizedInvoice,
        orderedAt: parseDateValue(value(record, "Invoice date")),
        postedAt: parseDateValue(value(record, "Posted date")),
        dueDate: parseDateValue(value(record, "Due date")),
        status: value(record, "Status") || null,
        purchaseOrderNumber: value(record, "Purchase order number") || null,
        deliveryStart: value(record, "Delivery start time") || null,
        deliveryEnd: value(record, "Delivery end time") || null,
        specialInstructions:
          value(record, "Special instrcutions") ||
          value(record, "Special instructions") ||
          null,
        customerName: value(record, "Customer"),
        salesperson: value(record, "Salesperson") || null,
        shippingAddress: {
          line1: value(record, "Shipping address line 1") || null,
          line2: value(record, "Shipping address line 2") || null,
          city: value(record, "Shipping address city") || null,
          state: value(record, "Shipping address province") || null,
          postalCode: value(record, "Shipping address postal code") || null,
          country: value(record, "Shipping address country") || null,
        },
        lines: [],
      };
      grouped.set(normalizedInvoice, entry);
    } else {
      entry.orderedAt = entry.orderedAt ?? parseDateValue(value(record, "Invoice date"));
      entry.postedAt = entry.postedAt ?? parseDateValue(value(record, "Posted date"));
      entry.dueDate = entry.dueDate ?? parseDateValue(value(record, "Due date"));
      if (!entry.deliveryStart) {
        entry.deliveryStart = value(record, "Delivery start time") || null;
      }
      if (!entry.deliveryEnd) {
        entry.deliveryEnd = value(record, "Delivery end time") || null;
      }
      if (!entry.specialInstructions) {
        entry.specialInstructions =
          value(record, "Special instrcutions") || value(record, "Special instructions") || null;
      }
    }

    entry.lines.push({
      skuCode,
      itemName: value(record, "Item") || null,
      supplierName: value(record, "Supplier") || null,
      quantity: parseNumber(value(record, "Qty.")) ?? 0,
      cases: parseDecimalNumber(value(record, "Cases")),
      liters: parseDecimalNumber(value(record, "Liters")),
      unitPrice: parseDecimalNumber(value(record, "Unit price")),
      netPrice: parseDecimalNumber(value(record, "Net price")),
    });
  }

  return grouped;
}

function stripPreamble(csv: string) {
  const lines = csv.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    const normalized = trimmed.replace(/^"+|"+$/g, "");
    if (normalized.toLowerCase().startsWith("sep=")) return false;
    if (normalized.startsWith("Sales report") || normalized.startsWith("Export")) return false;
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

function value(record: Record<string, string>, key: string) {
  return (record[key] ?? "").trim();
}

function parseNumber(input: string) {
  if (!input) return undefined;
  const numeric = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? Math.round(numeric) : undefined;
}

function parseDecimalNumber(input: string) {
  if (!input) return null;
  const numeric = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function parseDateValue(input: string) {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const [month, day, year] = parts.map((part) => Number.parseInt(part, 10));
    if (Number.isFinite(month) && Number.isFinite(day) && Number.isFinite(year)) {
      const fallback = new Date();
      fallback.setFullYear(year, month - 1, day);
      fallback.setHours(0, 0, 0, 0);
      return fallback;
    }
  }
  return null;
}

function buildDeliveryTimeWindow(start: string | null, end: string | null) {
  const normalizedStart = start?.trim();
  const normalizedEnd = end?.trim();
  if (normalizedStart && normalizedEnd) {
    return `${normalizedStart} - ${normalizedEnd}`;
  }
  return normalizedStart ?? normalizedEnd ?? null;
}

function computeIsoWeekNumber(date: Date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function mapOrderStatus(status: string | null): OrderStatus {
  const normalized = status?.toLowerCase();
  switch (normalized) {
    case "delivered":
    case "completed":
      return OrderStatus.FULFILLED;
    case "cancelled":
    case "canceled":
      return OrderStatus.CANCELLED;
    case "partially fulfilled":
      return OrderStatus.PARTIALLY_FULFILLED;
    default:
      return OrderStatus.SUBMITTED;
  }
}

function mapInvoiceStatus(orderStatus: OrderStatus): InvoiceStatus {
  switch (orderStatus) {
    case OrderStatus.FULFILLED:
    case OrderStatus.DELIVERED:
      return InvoiceStatus.PAID;
    case OrderStatus.CANCELLED:
      return InvoiceStatus.VOID;
    default:
      return InvoiceStatus.SENT;
  }
}

function decimal(input: string): Prisma.Decimal {
  const sanitized = input ? input.replace(/[^0-9.\-]/g, "") : "";
  if (!sanitized) {
    return new Prisma.Decimal(0);
  }
  return new Prisma.Decimal(sanitized);
}

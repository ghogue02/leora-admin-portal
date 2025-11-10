import type { Prisma } from "@prisma/client";

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

export type DeliveryInvoiceRecord = {
  id: string;
  total?: DecimalLike;
  status?: string | null;
  issuedAt?: Date | null;
  order?: {
    deliveryTimeWindow?: string | null;
    deliveryDate?: Date | null;
  } | null;
};

export type DeliverySummary = {
  totalInvoices: number;
  totalRevenue: number;
  averageOrderValue: number;
  methodBreakdown: Array<{
    method: string;
    invoiceCount: number;
    revenue: number;
    share: number;
  }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    share: number;
  }>;
  fulfillment: {
    scheduledRate: number;
    avgLagDays: number;
  };
};

const asNumber = (value: DecimalLike): number => {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    try {
      return value.toNumber();
    } catch {
      return 0;
    }
  }

  return 0;
};

const normalizeMethod = (method?: string | null): string => {
  if (!method) {
    return "Not Specified";
  }
  return method.trim() || "Not Specified";
};

const normalizeStatus = (status?: string | null): string => {
  if (!status) {
    return "Unknown";
  }
  const formatted = status.trim();
  return formatted ? formatted : "Unknown";
};

const daysBetween = (start?: Date | null, end?: Date | null): number | null => {
  if (!start || !end) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  if (!Number.isFinite(diffMs)) {
    return null;
  }
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 ? diffDays : 0;
};

export function buildDeliverySummary(invoices: DeliveryInvoiceRecord[]): DeliverySummary {
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, invoice) => sum + asNumber(invoice.total), 0);
  const averageOrderValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

  const methodTotals = new Map<string, { count: number; revenue: number }>();
  const statusTotals = new Map<string, number>();
  let scheduledCount = 0;
  let totalLagDays = 0;
  let lagSamples = 0;

  for (const invoice of invoices) {
    const method = normalizeMethod(invoice.order?.deliveryTimeWindow);
    const methodEntry = methodTotals.get(method) ?? { count: 0, revenue: 0 };
    methodEntry.count += 1;
    methodEntry.revenue += asNumber(invoice.total);
    methodTotals.set(method, methodEntry);

    const status = normalizeStatus(invoice.status);
    statusTotals.set(status, (statusTotals.get(status) ?? 0) + 1);

    if (invoice.order?.deliveryDate) {
      scheduledCount += 1;
    }

    const lag = daysBetween(invoice.issuedAt, invoice.order?.deliveryDate);
    if (lag !== null) {
      totalLagDays += lag;
      lagSamples += 1;
    }
  }

  const methodBreakdown = Array.from(methodTotals.entries()).map(([method, entry]) => ({
    method,
    invoiceCount: entry.count,
    revenue: entry.revenue,
    share: totalInvoices > 0 ? (entry.count / totalInvoices) * 100 : 0,
  }));

  methodBreakdown.sort((a, b) => b.revenue - a.revenue);

  const statusBreakdown = Array.from(statusTotals.entries())
    .map(([status, count]) => ({
      status,
      count,
      share: totalInvoices > 0 ? (count / totalInvoices) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalInvoices,
    totalRevenue,
    averageOrderValue,
    methodBreakdown,
    statusBreakdown,
    fulfillment: {
      scheduledRate: totalInvoices > 0 ? (scheduledCount / totalInvoices) * 100 : 0,
      avgLagDays: lagSamples > 0 ? totalLagDays / lagSamples : 0,
    },
  };
}

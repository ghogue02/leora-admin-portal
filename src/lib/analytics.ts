import { OrderStatus, Prisma } from "@prisma/client";

const ONE_DAY_MS = 1000 * 60 * 60 * 24;

export type OrderForAnalytics = {
  orderedAt: Date | null;
  total: Prisma.Decimal | number | null;
  currency: string | null;
  customerId?: string | null;
  status?: OrderStatus | null;
};

export type AccountSignal = {
  customerId: string;
  daysSinceLastOrder: number;
  averagePace: number;
  lateness: number;
  status: "atRisk" | "dueSoon";
  name?: string | null;
};

export type OrderHealthMetrics = {
  paceLabel: string;
  paceSummary: string;
  revenueStatus: string;
  revenueSummary: string;
  suggestions: string[];
  arpdd: {
    status: string;
    summary: string;
    currentValue: number | null;
    previousValue: number | null;
    changePercent: number | null;
    currency: string;
  };
  accountSignals: {
    tracked: number;
    healthy: number;
    dueSoon: number;
    atRisk: number;
    atRiskCustomers: AccountSignal[];
    dueSoonCustomers: AccountSignal[];
    hotlist: AccountSignal[];
  };
};

type AnalyticsOrder = {
  orderedAt: Date;
  total: Prisma.Decimal;
  currency: string;
  customerId: string | null;
  status: OrderStatus | null;
};

export function computeOrderHealthMetrics(orders: OrderForAnalytics[]): OrderHealthMetrics {
  if (!orders.length) {
    return buildEmptyMetrics();
  }

  const ordersWithDate: AnalyticsOrder[] = orders
    .filter((order): order is OrderForAnalytics & { orderedAt: Date } => Boolean(order.orderedAt))
    .map((order) => ({
      orderedAt: new Date(order.orderedAt),
      total: toDecimal(order.total ?? 0),
      currency: order.currency ?? "USD",
      customerId: order.customerId ?? null,
      status: order.status ?? null,
    }))
    .sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime());

  if (!ordersWithDate.length) {
    const fallbackCurrency = orders.find((order) => order.currency)?.currency ?? "USD";
    return buildEmptyMetrics(fallbackCurrency ?? "USD");
  }

  const intervals: number[] = [];
  for (let index = 0; index < ordersWithDate.length - 1; index += 1) {
    const current = ordersWithDate[index].orderedAt;
    const next = ordersWithDate[index + 1].orderedAt;
    const diff = Math.max(0, (current.getTime() - next.getTime()) / ONE_DAY_MS);
    intervals.push(diff);
  }

  const paceDays = intervals.length ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length : null;
  const paceLabel =
    paceDays === null
      ? "Need more history"
      : paceDays <= 14
        ? "On cadence"
        : paceDays <= 30
          ? "Check-in soon"
          : "At risk";
  const paceSummary = paceDays === null ? "—" : `${Math.round(paceDays)} day avg`;

  const now = new Date();
  let revenueLast30 = new Prisma.Decimal(0);
  let revenuePrev30 = new Prisma.Decimal(0);
  const currency = ordersWithDate[0]?.currency ?? "USD";

  ordersWithDate.forEach((order) => {
    const diffDays = Math.floor((now.getTime() - order.orderedAt.getTime()) / ONE_DAY_MS);
    if (diffDays <= 30) {
      revenueLast30 = revenueLast30.plus(order.total);
    } else if (diffDays > 30 && diffDays <= 60) {
      revenuePrev30 = revenuePrev30.plus(order.total);
    }
  });

  const revenueDelta =
    revenuePrev30.greaterThan(0)
      ? revenueLast30.minus(revenuePrev30).dividedBy(revenuePrev30)
      : revenueLast30.greaterThan(0)
        ? new Prisma.Decimal(1)
        : null;

  let revenueStatus = "Need more history";
  if (revenueDelta !== null) {
    const pct = revenueDelta.toNumber();
    if (pct >= 0.05) {
      revenueStatus = "Growing";
    } else if (pct <= -0.15) {
      revenueStatus = "Down ≥15%";
    } else if (pct < 0) {
      revenueStatus = "Softening";
    } else {
      revenueStatus = "Holding steady";
    }
  }

  const revenueSummary =
    revenueDelta === null
      ? formatCurrency(currency, revenueLast30)
      : `${formatCurrency(currency, revenueLast30)} (${Math.round(revenueDelta.toNumber() * 100)}%)`;

  const suggestions: string[] = [];
  if (paceDays !== null && paceDays > 30) {
    suggestions.push("Pace is slipping beyond 30 days. Queue outreach for buyers without recent activity.");
  }
  if (revenueDelta !== null && revenueDelta.toNumber() <= -0.15) {
    suggestions.push("Revenue is down ≥15% vs. the prior window. Review allocations and recent invoices.");
  }

  const arpdd = computeArpddMetrics(ordersWithDate, now);
  const accountSignals = computeAccountSignals(ordersWithDate, now);

  if (accountSignals.atRisk > 0) {
    suggestions.push(
      `${accountSignals.atRisk} account${accountSignals.atRisk === 1 ? "" : "s"} are past cadence. Line up outreach.`,
    );
  } else if (accountSignals.dueSoon > 0) {
    suggestions.push(
      `${accountSignals.dueSoon} account${accountSignals.dueSoon === 1 ? "" : "s"} come due soon. Confirm their next order.`,
    );
  }

  if (suggestions.length === 0 && revenueDelta === null) {
    suggestions.push("Connect historical order feeds to unlock proactive revenue and pace monitoring.");
  }

  return {
    paceLabel,
    paceSummary,
    revenueStatus,
    revenueSummary,
    suggestions,
    arpdd,
    accountSignals,
  };
}

function buildEmptyMetrics(currency = "USD"): OrderHealthMetrics {
  return {
    paceLabel: "Awaiting data",
    paceSummary: "—",
    revenueStatus: "Awaiting data",
    revenueSummary: "—",
    suggestions: [],
    arpdd: {
      status: "Awaiting data",
      summary: "—",
      currentValue: null,
      previousValue: null,
      changePercent: null,
      currency,
    },
    accountSignals: {
      tracked: 0,
      healthy: 0,
      dueSoon: 0,
      atRisk: 0,
      atRiskCustomers: [],
      dueSoonCustomers: [],
      hotlist: [],
    },
  };
}

function toDecimal(value: Prisma.Decimal | number) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

function formatCurrency(currency: string, value: Prisma.Decimal | number, maximumFractionDigits = 0) {
  const numeric = value instanceof Prisma.Decimal ? value.toNumber() : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(numeric);
}

function computeArpddMetrics(orders: AnalyticsOrder[], now: Date) {
  const currency = orders[0]?.currency ?? "USD";
  const currentDayKeys = new Set<string>();
  const previousDayKeys = new Set<string>();
  let currentRevenue = new Prisma.Decimal(0);
  let previousRevenue = new Prisma.Decimal(0);

  orders.forEach((order) => {
    const diffDays = Math.floor((now.getTime() - order.orderedAt.getTime()) / ONE_DAY_MS);
    const dayKey = order.orderedAt.toISOString().slice(0, 10);
    if (diffDays <= 30) {
      currentDayKeys.add(dayKey);
      currentRevenue = currentRevenue.plus(order.total);
    } else if (diffDays > 30 && diffDays <= 60) {
      previousDayKeys.add(dayKey);
      previousRevenue = previousRevenue.plus(order.total);
    }
  });

  const currentDayCount = currentDayKeys.size;
  const previousDayCount = previousDayKeys.size;

  const currentValueDecimal =
    currentDayCount > 0 ? currentRevenue.dividedBy(currentDayCount) : null;
  const previousValueDecimal =
    previousDayCount > 0 ? previousRevenue.dividedBy(previousDayCount) : null;

  let changePercent: number | null = null;
  if (currentValueDecimal && previousValueDecimal && previousValueDecimal.greaterThan(0)) {
    changePercent = currentValueDecimal.minus(previousValueDecimal).dividedBy(previousValueDecimal).toNumber();
  }

  let status = "Awaiting data";
  if (currentValueDecimal) {
    if (changePercent === null) {
      status = "Tracking";
    } else if (changePercent >= 0.1) {
      status = "Up";
    } else if (changePercent <= -0.1) {
      status = "Down";
    } else {
      status = "Steady";
    }
  }

  const currentValue = currentValueDecimal ? currentValueDecimal.toNumber() : null;
  const previousValue = previousValueDecimal ? previousValueDecimal.toNumber() : null;

  const summary =
    currentValueDecimal
      ? changePercent === null
        ? `${formatCurrency(currency, currentValue ?? 0)} / day`
        : `${formatCurrency(currency, currentValue ?? 0)} / day (${Math.round(changePercent * 100)}%)`
      : "—";

  return {
    status,
    summary,
    currentValue,
    previousValue,
    changePercent,
    currency,
  };
}

function computeAccountSignals(orders: AnalyticsOrder[], now: Date) {
  const signals: OrderHealthMetrics["accountSignals"] = {
    tracked: 0,
    healthy: 0,
    dueSoon: 0,
    atRisk: 0,
    atRiskCustomers: [],
    dueSoonCustomers: [],
    hotlist: [],
  };

  const ordersByCustomer = new Map<string, AnalyticsOrder[]>();

  orders.forEach((order) => {
    if (!order.customerId || order.status !== OrderStatus.FULFILLED) {
      return;
    }
    const list = ordersByCustomer.get(order.customerId) ?? [];
    list.push(order);
    ordersByCustomer.set(order.customerId, list);
  });

  ordersByCustomer.forEach((list, customerId) => {
    list.sort((a, b) => b.orderedAt.getTime() - a.orderedAt.getTime());
    if (list.length < 3) {
      return;
    }

    const intervals: number[] = [];
    const maxIntervals = Math.min(list.length - 1, 5);
    for (let index = 0; index < maxIntervals; index += 1) {
      const current = list[index].orderedAt;
      const next = list[index + 1].orderedAt;
      const diff = Math.max(0, (current.getTime() - next.getTime()) / ONE_DAY_MS);
      intervals.push(diff);
    }

    if (!intervals.length) {
      return;
    }

    const averagePace = intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
    if (averagePace <= 0) {
      return;
    }

    const daysSinceLast = Math.max(0, (now.getTime() - list[0].orderedAt.getTime()) / ONE_DAY_MS);
    const riskThreshold = Math.max(averagePace * 1.5, averagePace + 7);
    const dueThreshold = averagePace;
    const lateness = Math.max(0, daysSinceLast - averagePace);

    signals.tracked += 1;

    const baseSnapshot = {
      customerId,
      daysSinceLastOrder: Math.round(daysSinceLast),
      averagePace: Math.round(averagePace),
      lateness: Math.round(lateness),
    };

    if (daysSinceLast >= riskThreshold) {
      const snapshot: AccountSignal = {
        ...baseSnapshot,
        status: "atRisk",
      };
      signals.atRisk += 1;
      signals.atRiskCustomers.push(snapshot);
    } else if (daysSinceLast >= dueThreshold) {
      const snapshot: AccountSignal = {
        ...baseSnapshot,
        status: "dueSoon",
      };
      signals.dueSoon += 1;
      signals.dueSoonCustomers.push(snapshot);
    } else {
      signals.healthy += 1;
    }
  });

  signals.atRiskCustomers = signals.atRiskCustomers
    .sort((a, b) => b.lateness - a.lateness)
    .slice(0, 5);
  signals.dueSoonCustomers = signals.dueSoonCustomers
    .sort((a, b) => b.lateness - a.lateness)
    .slice(0, 5);
  signals.hotlist = [...signals.atRiskCustomers, ...signals.dueSoonCustomers];

  return signals;
}

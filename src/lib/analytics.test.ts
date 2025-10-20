import { describe, expect, test, vi } from "vitest";
import { OrderStatus, Prisma } from "@prisma/client";
import { computeOrderHealthMetrics } from "./analytics";

const decimal = (value: number) => new Prisma.Decimal(value);

describe("computeOrderHealthMetrics", () => {
  test("returns awaiting data when no orders provided", () => {
    const metrics = computeOrderHealthMetrics([]);
    expect(metrics.paceLabel).toBe("Awaiting data");
    expect(metrics.revenueStatus).toBe("Awaiting data");
    expect(metrics.suggestions.length).toBe(0);
    expect(metrics.arpdd.status).toBe("Awaiting data");
    expect(metrics.accountSignals.tracked).toBe(0);
  });

  test("identifies growing revenue and healthy pace", () => {
    const now = new Date();
    const metrics = computeOrderHealthMetrics([
      { orderedAt: now, total: decimal(1000), currency: "USD" },
      { orderedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), total: decimal(800), currency: "USD" },
      { orderedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), total: decimal(600), currency: "USD" },
    ]);

    expect(metrics.paceLabel).toBe("On cadence");
    expect(metrics.revenueStatus).toBe("Growing");
    expect(metrics.arpdd.currentValue).not.toBeNull();
    expect(metrics.accountSignals.tracked).toBe(0);
  });

  test("flags at-risk pace and reduced revenue", () => {
    const now = new Date();
    const metrics = computeOrderHealthMetrics([
      { orderedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), total: decimal(500), currency: "USD" },
      { orderedAt: new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000), total: decimal(1000), currency: "USD" },
      { orderedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000), total: decimal(1200), currency: "USD" },
    ]);

    expect(metrics.paceLabel).toBe("At risk");
    expect(metrics.revenueStatus === "Softening" || metrics.revenueStatus === "Down ≥15%").toBe(true);
  });

  test("surfaces account cadence signals", () => {
    const now = new Date("2024-07-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);

    try {
      const metrics = computeOrderHealthMetrics([
        { orderedAt: new Date("2024-05-10T00:00:00Z"), total: decimal(500), currency: "USD", customerId: "cust-1", status: OrderStatus.FULFILLED },
        { orderedAt: new Date("2024-04-20T00:00:00Z"), total: decimal(450), currency: "USD", customerId: "cust-1", status: OrderStatus.FULFILLED },
        { orderedAt: new Date("2024-04-01T00:00:00Z"), total: decimal(400), currency: "USD", customerId: "cust-1", status: OrderStatus.FULFILLED },
        { orderedAt: new Date("2024-06-10T00:00:00Z"), total: decimal(300), currency: "USD", customerId: "cust-2", status: OrderStatus.FULFILLED },
        { orderedAt: new Date("2024-05-20T00:00:00Z"), total: decimal(320), currency: "USD", customerId: "cust-2", status: OrderStatus.FULFILLED },
        { orderedAt: new Date("2024-05-01T00:00:00Z"), total: decimal(340), currency: "USD", customerId: "cust-2", status: OrderStatus.FULFILLED },
      ]);

      expect(metrics.accountSignals.tracked).toBe(2);
      expect(metrics.accountSignals.atRisk).toBeGreaterThanOrEqual(1);
      expect(metrics.accountSignals.dueSoon).toBeGreaterThanOrEqual(1);
      expect(metrics.accountSignals.atRiskCustomers.length).toBeGreaterThan(0);
      expect(metrics.accountSignals.dueSoonCustomers.length).toBeGreaterThan(0);
      expect(metrics.accountSignals.hotlist.length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

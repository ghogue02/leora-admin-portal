import { describe, expect, it } from "vitest";
import {
  calculateKaplanMeierMedian,
  calculateMedian,
  calculatePercentile,
  calculatePortfolioScores,
  classifyCustomerSignal,
} from "@/lib/sales/customer-health-metrics";

describe("classifyCustomerSignal", () => {
  it("marks dormant customers regardless of revenue", () => {
    const classification = classifyCustomerSignal({
      isDormant: true,
      trailingTwelveRevenue: 5000,
      last60Revenue: 2000,
      last90Revenue: 3000,
    });

    expect(classification).toBe("DORMANT");
  });

  it("flags growing when 90 day revenue exceeds baseline by 5%", () => {
    const classification = classifyCustomerSignal({
      isDormant: false,
      trailingTwelveRevenue: 12000, // $1k per month -> $3k expected for 90d
      last90Revenue: 3300,
      last60Revenue: 2200,
    });

    expect(classification).toBe("GROWING");
  });

  it("flags shrinking when 60 day revenue is down more than 5%", () => {
    const classification = classifyCustomerSignal({
      isDormant: false,
      trailingTwelveRevenue: 12000,
      last90Revenue: 3000,
      last60Revenue: 1800,
    });

    expect(classification).toBe("SHRINKING");
  });
});

describe("percentile helpers", () => {
  it("computes median correctly", () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
  });

  it("computes percentile interpolation", () => {
    expect(calculatePercentile([1, 2, 3, 4], 75)).toBe(3.25);
  });
});

describe("portfolio scores", () => {
  it("weights by trailing revenue", () => {
    const { weightedScore, unweightedScore } = calculatePortfolioScores({
      customers: [
        { classification: "GROWING", trailingTwelveRevenue: 10000 },
        { classification: "SHRINKING", trailingTwelveRevenue: 5000 },
      ],
    });

    expect(unweightedScore).toBe(70);
    expect(weightedScore).toBeCloseTo(80);
  });
});

describe("calculateKaplanMeierMedian", () => {
  it("returns null when no events", () => {
    const km = calculateKaplanMeierMedian([
      { time: 10, event: false },
      { time: 20, event: false },
    ]);
    expect(km).toBeNull();
  });

  it("returns the first time survival drops below 0.5", () => {
    const km = calculateKaplanMeierMedian([
      { time: 10, event: true },
      { time: 20, event: true },
      { time: 20, event: false },
      { time: 30, event: true },
    ]);
    expect(km).toBe(20);
  });
});

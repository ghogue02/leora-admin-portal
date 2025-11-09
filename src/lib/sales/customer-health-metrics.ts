import { differenceInCalendarDays } from "date-fns";

export type CustomerSignalClassification = "GROWING" | "FLAT" | "SHRINKING" | "DORMANT";

export type KaplanMeierObservation = {
  time: number;
  event: boolean;
};

export function classifyCustomerSignal(params: {
  isDormant: boolean;
  trailingTwelveRevenue: number;
  last90Revenue: number;
  last60Revenue: number;
}): CustomerSignalClassification {
  const { isDormant, trailingTwelveRevenue, last90Revenue, last60Revenue } = params;

  if (isDormant) {
    return "DORMANT";
  }

  if (trailingTwelveRevenue <= 0) {
    return last60Revenue > 0 || last90Revenue > 0 ? "FLAT" : "SHRINKING";
  }

  const avgMonthly = trailingTwelveRevenue / 12;
  const expected90 = avgMonthly * 3;
  const expected60 = avgMonthly * 2;

  if (expected90 > 0 && last90Revenue >= expected90 * 1.05) {
    return "GROWING";
  }

  if (expected60 <= 0) {
    return "FLAT";
  }

  const delta = Math.abs(last60Revenue - expected60) / expected60;
  if (delta <= 0.05) {
    return "FLAT";
  }

  if (last60Revenue < expected60 * 0.95) {
    return "SHRINKING";
  }

  return "FLAT";
}

export function calculateMedian(values: number[]): number | null {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

export function calculatePercentile(values: number[], percentile: number): number | null {
  if (!values.length) {
    return null;
  }

  const clamped = Math.min(Math.max(percentile, 0), 100);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (clamped / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const weight = rank - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
}

export function calculateKaplanMeierMedian(observations: KaplanMeierObservation[]): number | null {
  if (!observations.length) {
    return null;
  }

  const sorted = [...observations].sort((a, b) => a.time - b.time);
  let atRisk = observations.length;
  let survival = 1;

  const grouped = new Map<number, { events: number; censored: number }>();
  for (const obs of sorted) {
    const bucket = grouped.get(obs.time) ?? { events: 0, censored: 0 };
    if (obs.event) {
      bucket.events += 1;
    } else {
      bucket.censored += 1;
    }
    grouped.set(obs.time, bucket);
  }

  const orderedTimes = Array.from(grouped.keys()).sort((a, b) => a - b);
  for (const time of orderedTimes) {
    const bucket = grouped.get(time)!;
    if (atRisk === 0) {
      break;
    }

    if (bucket.events > 0) {
      survival *= 1 - bucket.events / atRisk;
      if (survival <= 0.5) {
        return time;
      }
    }

    atRisk -= bucket.events + bucket.censored;
  }

  return null;
}

export function calculatePortfolioScores(params: {
  customers: Array<{ classification: CustomerSignalClassification; trailingTwelveRevenue: number }>;
}) {
  const { customers } = params;
  if (!customers.length) {
    return {
      weightedScore: null,
      unweightedScore: null,
    };
  }

  const pointMap: Record<CustomerSignalClassification, number> = {
    GROWING: 100,
    FLAT: 80,
    SHRINKING: 40,
    DORMANT: 10,
  };

  const totalRevenue = customers.reduce((sum, customer) => sum + Math.max(customer.trailingTwelveRevenue, 0), 0);
  const weightedScore = totalRevenue > 0
    ? customers.reduce((score, customer) => {
        const weight = Math.max(customer.trailingTwelveRevenue, 0) / totalRevenue;
        return score + pointMap[customer.classification] * weight;
      }, 0)
    : null;

  const unweightedScore = customers.length
    ? customers.reduce((score, customer) => score + pointMap[customer.classification], 0) / customers.length
    : null;

  return {
    weightedScore,
    unweightedScore,
  };
}

export function calculateDaysBetween(start: Date | null | undefined, end: Date | null | undefined): number | null {
  if (!start || !end) {
    return null;
  }
  return Math.max(0, differenceInCalendarDays(end, start));
}

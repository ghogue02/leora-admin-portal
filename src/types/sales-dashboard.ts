export type CustomerSignalClassification = "GROWING" | "FLAT" | "SHRINKING" | "DORMANT";

export type CustomerSignalBucket = {
  classification: CustomerSignalClassification;
  count: number;
  percentOfActive: number;
  percentOfAssigned: number;
  revenueShare: number;
  topCustomers: Array<{ id: string; name: string; revenue: number }>;
};

export type CustomerSignals = {
  buckets: Record<CustomerSignalClassification, CustomerSignalBucket>;
  totals: {
    assigned: number;
    active: number;
  };
};

export type CustomerCoverage = {
  assigned: number;
  active: number;
  targets: number;
  prospects: number;
  unassigned: number;
};

export type PortfolioHealth = {
  healthyCount: number;
  healthyPercent: number;
  immediateAttentionCount: number;
  immediateAttentionPercent: number;
  downCount: number;
  dormantCount: number;
  totalActive: number;
  weightedScore: number | null;
  unweightedScore: number | null;
};

export type TargetPipelineMetrics = {
  assignedCount: number;
  turnedActiveCount: number;
  turnedActivePercent: number;
  visitedCount: number;
  visitedPercent: number;
  ttfoMedianDays: number | null;
  ttfoP75Days: number | null;
  ttfoKmMedianDays: number | null;
};

export type ColdLeadsOverview = {
  count: number;
  dormantToColdCount: number;
  sample: Array<{ id: string; name: string }>;
};

export type AccountPulse = {
  direction: "UP" | "FLAT" | "DOWN";
  deltaPercent: number;
  summary: string;
  dominantSignal: CustomerSignalClassification;
  dormantCount: number;
  totalCustomers: number;
};

export type CustomerReportRow = {
  customerId: string;
  name: string;
  accountType: string | null;
  classification: CustomerSignalClassification;
  trailingTwelveRevenue: number;
  averageMonthlyRevenue: number;
  last90Revenue: number;
  last60Revenue: number;
  lastOrderDate: string | null;
  daysSinceLastOrder: number | null;
  isDormant: boolean;
  targetStartDate: string | null;
  firstOrderDate: string | null;
  ttfoDays: number | null;
};

export type ManagerViewContext = {
  enabled: boolean;
  selectedSalesRepId: string;
  reps: Array<{
    id: string;
    name: string;
    territory: string | null;
    email: string | null;
  }>;
};

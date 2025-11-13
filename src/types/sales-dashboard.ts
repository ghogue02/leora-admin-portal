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

export type UnlovedAccountPriority = "HIGH" | "MEDIUM" | "LOW" | "NONE";

export type UnlovedAccount = {
  id: string;
  name: string;
  avgMonthlyRevenue: number;
  lastLovedAt: string | null;
  daysSinceLove: number | null;
};

export type UnlovedAccountBucket = {
  priority: UnlovedAccountPriority;
  label: string;
  thresholdDays: number;
  count: number;
  potentialMonthlyRevenue: number;
  accounts: UnlovedAccount[];
};

export type UnlovedAccountsSummary = {
  buckets: UnlovedAccountBucket[];
  updatedAt: string;
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
  minimallyServicedCount: number;
  coldLeadCount: number;
  dormantToColdCount: number;
  sample: Array<{
    id: string;
    name: string;
    bucket: "MINIMALLY_SERVICED" | "COLD_LEAD" | "DORMANT_TO_COLD";
  }>;
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
  lastActivityAt: string | null;
  daysSinceLastActivity: number | null;
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

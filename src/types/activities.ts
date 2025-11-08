export type ActivitySampleSelection = {
  skuId: string;
  name: string;
  code?: string | null;
  brand?: string | null;
  sampleListItemId?: string;
  quantity?: number;
  selected: boolean;
  feedback: string;
  followUp: boolean;
};

export type SampleListSummary = {
  id: string;
  name: string;
  isActive: boolean;
  preferredPriceListIds?: string[];
  items: Array<{
    id: string;
    skuId: string;
    defaultFollowUp: boolean;
    notes: string | null;
    sku: {
      id: string;
      code: string;
      name: string | null;
      brand: string | null;
      unitOfMeasure: string | null;
      size: string | null;
    } | null;
  }>;
};

export type SampleSkuSummary = {
  id: string;
  code: string | null;
  name: string | null;
  brand: string | null;
  unitOfMeasure: string | null;
  size: string | null;
};

export type SampleActivityRecord = {
  id: string;
  activityId: string;
  sampleListItemId: string | null;
  feedback: string;
  followUpNeeded: boolean;
  followUpCompletedAt: string | null;
  createdAt: string;
  activity:
    | {
        id: string;
        subject: string | null;
        occurredAt: string | null;
        activityType:
          | {
              id: string;
              name: string | null;
              code: string | null;
            }
          | null;
        customer:
          | {
              id: string;
              name: string | null;
            }
          | null;
      }
    | null;
  sku: SampleSkuSummary | null;
};

export type SampleInsightsSummary = {
  metrics: {
    loggedThisWeek: number;
    completedThisWeek: number;
    openFollowUps: number;
    periodLabel: string;
    periodSampleQuantity: number;
    periodUniqueCustomers: number;
    periodCustomerConversionRate: number;
  };
  recentActivities: SampleActivityRecord[];
  followUps: SampleActivityRecord[];
};

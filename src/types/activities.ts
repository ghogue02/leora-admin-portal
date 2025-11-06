export type ActivitySampleSelection = {
  skuId: string;
  name: string;
  code?: string | null;
  brand?: string | null;
  sampleListItemId?: string;
  selected: boolean;
  feedback: string;
  followUp: boolean;
};

export type SampleListSummary = {
  id: string;
  name: string;
  isActive: boolean;
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

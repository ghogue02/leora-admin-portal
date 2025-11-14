export type CatalogItem = {
  skuId: string;
  skuCode: string;
  productId?: string;
  productName: string;
  brand: string | null;
  category: string | null;
  lifecycleStatus: string | null;
  unitOfMeasure: string | null;
  size: string | null;
  price: number; // Single source of truth from SKU.pricePerUnit
  inventory: {
    totals: {
      onHand: number;
      allocated: number;
      available: number;
    };
    lowStock: boolean;
    outOfStock: boolean;
  };
  product?: {
    description?: string | null;
    tastingNotes?: Record<string, unknown> | null;
    foodPairings?: unknown;
    servingInfo?: unknown;
    wineDetails?: unknown;
    enrichedAt?: string | null;
    enrichedBy?: string | null;
  };
};

export type FacetBucket = {
  value: string;
  label: string;
  count: number;
};

export type CatalogFacets = {
  brands: FacetBucket[];
  categories: FacetBucket[];
  lifecycle: FacetBucket[];
  priceLists: FacetBucket[];
};

export type CatalogFieldDefinition = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  section: string | null;
  scope: string;
  inputType: string;
  supportsManualEntry: boolean;
  visible: boolean;
  required: boolean;
  displayOrder?: number | null;
  showInPortal: boolean;
  filterable: boolean;
  options: Array<{
    id: string;
    label: string;
    value: string;
    isDefault: boolean;
  }>;
};

export type CatalogMeta = {
  total: number;
  page?: number;
  pageSize?: number;
  appliedFilters: Record<string, unknown>;
};

export type CatalogResponse = {
  items: CatalogItem[];
  facets: CatalogFacets;
  meta: CatalogMeta;
  fields?: CatalogFieldDefinition[];
};

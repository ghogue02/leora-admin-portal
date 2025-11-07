export const CUSTOMER_TAG_TYPES = [
  "wine_club",
  "events",
  "female_winemakers",
  "organic",
  "natural_wine",
  "biodynamic",
] as const;

export type CustomerTagType = (typeof CUSTOMER_TAG_TYPES)[number];

type TagMeta = {
  label: string;
  pillClass: string;
  dotClass: string;
};

export const CUSTOMER_TAG_META: Record<CustomerTagType, TagMeta> = {
  wine_club: {
    label: "Wine Club",
    pillClass: "bg-purple-100 text-purple-800 border-purple-300",
    dotClass: "bg-purple-500",
  },
  events: {
    label: "Events",
    pillClass: "bg-blue-100 text-blue-800 border-blue-300",
    dotClass: "bg-blue-500",
  },
  female_winemakers: {
    label: "Female Winemakers",
    pillClass: "bg-pink-100 text-pink-800 border-pink-300",
    dotClass: "bg-pink-500",
  },
  organic: {
    label: "Organic",
    pillClass: "bg-green-100 text-green-800 border-green-300",
    dotClass: "bg-green-500",
  },
  natural_wine: {
    label: "Natural Wine",
    pillClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
  },
  biodynamic: {
    label: "Biodynamic",
    pillClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
};

export const getCustomerTagLabel = (tag: CustomerTagType) =>
  CUSTOMER_TAG_META[tag]?.label ?? tag;

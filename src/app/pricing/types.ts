export const tierOrder = ["Silver", "Gold", "Platinum"] as const;

export type Tier = (typeof tierOrder)[number];

export type FeatureType = "pricing" | "value" | "progressive" | "quantity" | "boolean";

export type Plan = {
  name: string;
  price: string;
  annualPrice: string;
  frequency: string;
  tagline: string;
  description: string;
  fit: string;
  entitlements: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; items: string[] }>;
  overages: string[];
  badge?: string;
  recommended?: boolean;
  ctaLabel: string;
  ctaHref: string;
};

export type SupplierTier = {
  name: string;
  price: string;
  latency: string;
  includes: string[];
  bestFor: string;
};

export type FeatureConfig = {
  name: string;
  type: FeatureType;
} & Record<Tier, string | boolean>;

export type PricingFeatureCategory = {
  category: string;
  features: FeatureConfig[];
};

export type DifferentiatorIcon = "refresh" | "link" | "sparkles" | "clock" | "bolt" | "network";

export type SimplifiedPlan = {
  id: string;
  name: string;
  price: string;
  priceInterval: string;
  badge?: string | null;
  badgeColor?: string;
  tagline: string;
  description: string;
  keyDifferentiators: Array<{ icon: DifferentiatorIcon; label: string; detail: string }>;
  bestFor: string;
  cta: string;
};

export type SimplifiedSupplierPlan = {
  id: string;
  name: string;
  price: string;
  priceInterval: string;
  latency: string;
  latencyLabel: string;
  keyFeatures: string[];
  bestFor: string;
  upgrade?: string | null;
};

export type PricingTab = {
  id: "wholesaler" | "supplier";
  label: string;
  icon: "building" | "chart";
  description: string;
};

export type ExampleScenario = {
  title: string;
  bullets: string[];
};

export type SupplierDiscount = {
  range: string;
  discount: string;
};

export type SupplierFaq = {
  question: string;
  answer: string;
};

/**
 * Customer-specific type definitions & helpers
 */

export const CUSTOMER_TYPE_OPTIONS = [
  "On Premise",
  "Off Premise",
  "On and Off Premise",
  "Distributor",
  "Caterer",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPE_OPTIONS)[number];

export const VOLUME_CAPACITY_OPTIONS = ["High", "Medium", "Low"] as const;

export type VolumeCapacity = (typeof VOLUME_CAPACITY_OPTIONS)[number];

export const FEATURE_PROGRAM_OPTIONS = ["Wine Club", "Catering", "Email Offers"] as const;

export type FeatureProgram = (typeof FEATURE_PROGRAM_OPTIONS)[number];

/**
 * Customer analytics update payload
 */
export interface CustomerAnalyticsUpdate {
  type?: CustomerType | null;
  volumeCapacity?: VolumeCapacity | null;
  featurePrograms?: FeatureProgram[];
}

/**
 * Customer-specific type definitions
 */

export type CustomerType =
  | "On Premise"
  | "Off Premise"
  | "On and Off Premise"
  | "Distributor"
  | "Caterer";

export type VolumeCapacity = "High" | "Medium" | "Low";

export type FeatureProgram = "Wine Club" | "Catering" | "Email Offers";

/**
 * Customer analytics update payload
 */
export interface CustomerAnalyticsUpdate {
  type?: CustomerType;
  volumeCapacity?: VolumeCapacity;
  featurePrograms?: FeatureProgram[];
}

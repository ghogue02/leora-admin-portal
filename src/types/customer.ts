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

export const PAYMENT_METHOD_OPTIONS = ["ACH", "Fintech", "Check", "Other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD_OPTIONS)[number];

export type DeliveryWindowType = "BEFORE" | "AFTER" | "BETWEEN";

export type DeliveryWindow =
  | {
      type: "BEFORE";
      time: string;
    }
  | {
      type: "AFTER";
      time: string;
    }
  | {
      type: "BETWEEN";
      startTime: string;
      endTime: string;
    };

export type CustomerContact = {
  id: string;
  fullName: string;
  role: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  notes?: string | null;
  businessCardUrl?: string | null;
  createdAt: string;
};

/**
 * Customer analytics update payload
 */
export interface CustomerAnalyticsUpdate {
  type?: CustomerType | null;
  volumeCapacity?: VolumeCapacity | null;
  featurePrograms?: FeatureProgram[];
}

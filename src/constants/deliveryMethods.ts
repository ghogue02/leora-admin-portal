export const DELIVERY_METHOD_OPTIONS = [
  "Company Truck",
  "Distributor Courier",
  "Customer Pickup",
  "Third-Party Logistics",
  "Other",
] as const;

export type DeliveryMethodOption = (typeof DELIVERY_METHOD_OPTIONS)[number];

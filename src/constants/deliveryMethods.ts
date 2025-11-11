export const DELIVERY_METHOD_OPTIONS = [
  "WCB Delivery",
  "Rep Delivery",
  "Customer Pick-up",
  "Third Party Courier",
  "Other",
] as const;

export type DeliveryMethodOption = (typeof DELIVERY_METHOD_OPTIONS)[number];

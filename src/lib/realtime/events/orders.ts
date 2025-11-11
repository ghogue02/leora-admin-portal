import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_UPDATED_EVENT = "orders.status.updated" as const;

export type OrderStatusUpdatedEvent = {
  type: typeof ORDER_STATUS_UPDATED_EVENT;
  tenantId: string;
  orderId: string;
  customerId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  salesRepId: string | null;
  updatedAt: string;
};

export type OrdersRealtimeEvent = OrderStatusUpdatedEvent;

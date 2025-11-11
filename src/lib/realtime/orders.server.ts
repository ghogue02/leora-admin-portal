import type { OrderStatus } from "@prisma/client";
import { publishTenantEvent } from "@/lib/realtime/server";
import { getTenantChannelName } from "@/lib/realtime/channels.server";
import {
  ORDER_STATUS_UPDATED_EVENT,
  type OrderStatusUpdatedEvent,
} from "@/lib/realtime/events/orders";

type PublishOrderStatusParams = {
  tenantId: string;
  orderId: string;
  customerId: string;
  status: OrderStatus;
  previousStatus: OrderStatus;
  salesRepId?: string | null;
  updatedAt?: Date | null;
};

export async function publishOrderStatusUpdated(params: PublishOrderStatusParams) {
  const channel = getTenantChannelName(params.tenantId, "orders");
  const payload: OrderStatusUpdatedEvent = {
    type: ORDER_STATUS_UPDATED_EVENT,
    tenantId: params.tenantId,
    orderId: params.orderId,
    customerId: params.customerId,
    status: params.status,
    previousStatus: params.previousStatus,
    salesRepId: params.salesRepId ?? null,
    updatedAt: (params.updatedAt ?? new Date()).toISOString(),
  };

  await publishTenantEvent({
    channel,
    event: ORDER_STATUS_UPDATED_EVENT,
    payload,
  });
}

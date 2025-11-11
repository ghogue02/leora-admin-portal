import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { tryGetTenantChannelName } from "@/lib/realtime/channels";
import {
  ORDER_STATUS_UPDATED_EVENT,
  type OrderStatusUpdatedEvent,
} from "@/lib/realtime/events/orders";

type Options = {
  customerId?: string | null;
  channel?: string | null;
};

export function useCustomerRealtime({ customerId, channel: providedChannel }: Options) {
  const queryClient = useQueryClient();
  const channel = useMemo(
    () => tryGetTenantChannelName(providedChannel),
    [providedChannel],
  );

  useRealtimeChannel<OrderStatusUpdatedEvent>({
    channel,
    event: ORDER_STATUS_UPDATED_EVENT,
    enabled: Boolean(channel && customerId),
    handler: async (payload) => {
      if (!customerId || payload.customerId !== customerId) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: ["customer", customerId],
      });
    },
  });
}

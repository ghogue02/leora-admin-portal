import { useMemo } from "react";
import { useRealtimeChannel } from "@/hooks/useRealtimeChannel";
import { tryGetTenantChannelName } from "@/lib/realtime/channels";
import {
  PICK_SHEET_ITEM_UPDATED_EVENT,
  PICK_SHEET_STATUS_UPDATED_EVENT,
  type PickSheetItemUpdatedEvent,
  type PickSheetStatusUpdatedEvent,
} from "@/lib/realtime/events/warehouse";

type UsePickSheetRealtimeOptions = {
  channel?: string | null;
  pickSheetId?: string | null;
  onItemUpdate?: (event: PickSheetItemUpdatedEvent) => void;
  onStatusUpdate?: (event: PickSheetStatusUpdatedEvent) => void;
};

export function usePickSheetRealtime({
  channel: providedChannel,
  pickSheetId,
  onItemUpdate,
  onStatusUpdate,
}: UsePickSheetRealtimeOptions) {
  const channel = useMemo(
    () => tryGetTenantChannelName(providedChannel),
    [providedChannel],
  );

  useRealtimeChannel<PickSheetItemUpdatedEvent>({
    channel,
    event: PICK_SHEET_ITEM_UPDATED_EVENT,
    enabled: Boolean(channel && pickSheetId),
    handler: (payload) => {
      if (!pickSheetId || payload.pickSheetId !== pickSheetId) return;
      onItemUpdate?.(payload);
    },
  });

  useRealtimeChannel<PickSheetStatusUpdatedEvent>({
    channel,
    event: PICK_SHEET_STATUS_UPDATED_EVENT,
    enabled: Boolean(channel && pickSheetId),
    handler: (payload) => {
      if (!pickSheetId || payload.pickSheetId !== pickSheetId) return;
      onStatusUpdate?.(payload);
    },
  });
}

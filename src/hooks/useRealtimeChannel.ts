import { useEffect, useRef } from "react";
import { addChannelListener } from "@/lib/realtime/browser-channel-registry";

type UseRealtimeChannelOptions<TPayload> = {
  channel: string | null;
  event: string;
  handler: (payload: TPayload) => void;
  enabled?: boolean;
};

export function useRealtimeChannel<TPayload>({
  channel,
  event,
  handler,
  enabled = true,
}: UseRealtimeChannelOptions<TPayload>) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled || !channel) {
      return;
    }

    let isActive = true;
    const removeListener = addChannelListener(channel, event, (payload) => {
      if (!isActive || typeof payload === "undefined" || payload === null) {
        return;
      }
      handlerRef.current(payload as TPayload);
    });

    return () => {
      isActive = false;
      removeListener();
    };
  }, [channel, event, enabled]);
}

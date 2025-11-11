import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserRealtimeClient } from "@/lib/realtime/client";

type ChannelEntry = {
  channel: RealtimeChannel;
  listeners: Map<string, Set<(payload: unknown) => void>>;
  subscription: Promise<RealtimeChannel>;
  refCount: number;
};

const registry = new Map<string, ChannelEntry>();

function createChannelEntry(channelName: string): ChannelEntry | null {
  const client = getBrowserRealtimeClient();
  if (!client) {
    return null;
  }

  let entry = registry.get(channelName);
  if (entry) {
    return entry;
  }

  const channel = client.channel(channelName, {
    config: {
      broadcast: { ack: false },
    },
  });

  const subscription = new Promise<RealtimeChannel>((resolve, reject) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        resolve(channel);
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(new Error(`[realtime] Channel ${channelName} failed with status ${status}`));
        return;
      }

      if (status === "CLOSED") {
        registry.delete(channelName);
      }
    });
  }).catch((error) => {
    registry.delete(channelName);
    console.warn(`[realtime] Subscription error for ${channelName}`, error);
    throw error;
  });

  entry = {
    channel,
    listeners: new Map(),
    subscription,
    refCount: 0,
  };

  registry.set(channelName, entry);
  return entry;
}

export function addChannelListener(
  channelName: string,
  event: string,
  handler: (payload: unknown) => void,
) {
  const entry = createChannelEntry(channelName);
  if (!entry) {
    return () => undefined;
  }

  entry.refCount += 1;

  let listenerSet = entry.listeners.get(event);
  if (!listenerSet) {
    listenerSet = new Set();
    entry.listeners.set(event, listenerSet);

    entry.channel.on("broadcast", { event }, (payload) => {
      const listeners = entry.listeners.get(event);
      if (!listeners || listeners.size === 0) {
        return;
      }

      const data = payload?.payload;
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.warn(`[realtime] Listener error for ${channelName}:${event}`, error);
        }
      });
    });
  }

  listenerSet.add(handler);
  entry.subscription.catch(() => undefined);

  let cleanedUp = false;
  return () => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;

    listenerSet?.delete(handler);
    if (listenerSet && listenerSet.size === 0) {
      entry.listeners.delete(event);
    }

    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      entry.subscription
        .then(() => entry.channel.unsubscribe().catch(() => undefined))
        .catch(() => undefined)
        .finally(() => {
          const client = getBrowserRealtimeClient();
          client?.removeChannel(entry.channel);
          registry.delete(channelName);
        });
    }
  };
}

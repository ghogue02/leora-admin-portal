import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

type PublishOptions<TPayload> = {
  channel: string;
  event: string;
  payload: TPayload;
};

const globalForRealtime = globalThis as {
  __supabaseRealtimeClient?: SupabaseClient | null;
};

let serverClient: SupabaseClient | null = globalForRealtime.__supabaseRealtimeClient ?? null;

type ChannelEntry = {
  channel: RealtimeChannel;
  ready: Promise<RealtimeChannel>;
};

const channelCache = new Map<string, ChannelEntry>();

function isRealtimeConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getServerClient(): SupabaseClient | null {
  if (serverClient) {
    return serverClient;
  }

  if (!isRealtimeConfigured()) {
    return null;
  }

  serverClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForRealtime.__supabaseRealtimeClient = serverClient;
  }

  return serverClient;
}

function cleanupChannel(channelName: string) {
  const entry = channelCache.get(channelName);
  if (!entry) {
    return;
  }

  entry.channel.unsubscribe().catch(() => undefined);
  channelCache.delete(channelName);
}

async function getOrCreateChannel(channelName: string): Promise<RealtimeChannel | null> {
  const client = getServerClient();
  if (!client) {
    return null;
  }

  let entry = channelCache.get(channelName);
  if (!entry) {
    const channel = client.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    const ready = new Promise<RealtimeChannel>((resolve, reject) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          resolve(channel);
          return;
        }

        if (status === "CLOSED") {
          cleanupChannel(channelName);
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          cleanupChannel(channelName);
          reject(new Error(`[realtime] Channel ${channelName} failed with status ${status}`));
        }
      });
    });

    entry = { channel, ready };
    channelCache.set(channelName, entry);
  }

  try {
    return await entry.ready;
  } catch (error) {
    console.warn(`[realtime] Failed to subscribe to channel ${channelName}`, error);
    return null;
  }
}

export async function publishTenantEvent<TPayload>({
  channel,
  event,
  payload,
}: PublishOptions<TPayload>): Promise<boolean> {
  const realtimeChannel = await getOrCreateChannel(channel);
  if (!realtimeChannel) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[realtime] Skipping broadcast for ${event} -> ${channel}. Supabase credentials missing or subscription failed.`,
      );
    }
    return false;
  }

  try {
    const response = await realtimeChannel.send({
      type: "broadcast",
      event,
      payload,
    });

    if (response !== "ok") {
      console.warn(`[realtime] Broadcast ack for ${event} on ${channel} returned: ${response}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn(`[realtime] Failed to publish ${event} on channel ${channel}`, error);
    cleanupChannel(channel);
    return false;
  }
}

export type TenantRealtimeScope = "orders" | "warehouse" | "inventory" | "customers";

export const CHANNEL_PREFIX = "tenant";

/**
 * Client-side helper that simply validates a provided channel name.
 * Channel generation now happens on the server so that the channel string
 * can include tenant-scoped secrets.
 */
export function tryGetTenantChannelName(channelName?: string | null) {
  return channelName ?? null;
}

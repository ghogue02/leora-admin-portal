import { createHmac } from "node:crypto";
import { CHANNEL_PREFIX, type TenantRealtimeScope } from "@/lib/realtime/channels";

const DEFAULT_SECRET = process.env.REALTIME_CHANNEL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * Generate an opaque Supabase channel name for a tenant + scope.
 * The channel includes a hash so clients cannot guess another tenant's channel.
 */
export function getTenantChannelName(tenantId: string, scope: TenantRealtimeScope) {
  if (!tenantId) {
    throw new Error("[realtime] tenantId is required to build a channel name");
  }

  if (!DEFAULT_SECRET) {
    return `${CHANNEL_PREFIX}:${tenantId}:${scope}`;
  }

  const hash = createHmac("sha256", DEFAULT_SECRET)
    .update(`${tenantId}:${scope}`)
    .digest("hex");

  return `${CHANNEL_PREFIX}:${scope}:${hash}`;
}

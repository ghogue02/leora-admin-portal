import { publishTenantEvent } from "@/lib/realtime/server";
import { getTenantChannelName } from "@/lib/realtime/channels.server";
import {
  INVENTORY_STOCK_CHANGED_EVENT,
  type InventoryStockChangedEvent,
} from "@/lib/realtime/events/inventory";

type StockChangedInput = {
  tenantId: string;
  inventoryId: string;
  skuId: string;
  location: string;
  onHand: number;
  allocated: number;
  updatedAt?: Date | null;
};

export async function publishInventoryStockChanged(input: StockChangedInput) {
  const channel = getTenantChannelName(input.tenantId, "inventory");
  const payload: InventoryStockChangedEvent = {
    type: INVENTORY_STOCK_CHANGED_EVENT,
    tenantId: input.tenantId,
    inventoryId: input.inventoryId,
    skuId: input.skuId,
    location: input.location,
    onHand: input.onHand,
    allocated: input.allocated,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
  };

  await publishTenantEvent({
    channel,
    event: INVENTORY_STOCK_CHANGED_EVENT,
    payload,
  });
}

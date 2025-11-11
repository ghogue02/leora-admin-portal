export const INVENTORY_STOCK_CHANGED_EVENT = "inventory.stock.changed" as const;

export type InventoryStockChangedEvent = {
  type: typeof INVENTORY_STOCK_CHANGED_EVENT;
  tenantId: string;
  inventoryId: string;
  skuId: string;
  location: string;
  onHand: number;
  allocated: number;
  updatedAt: string;
};

export type InventoryRealtimeEvent = InventoryStockChangedEvent;

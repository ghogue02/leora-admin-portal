import type { PickSheetStatus } from "@prisma/client";

export const PICK_SHEET_ITEM_UPDATED_EVENT = "warehouse.pickSheet.item.updated" as const;
export const PICK_SHEET_STATUS_UPDATED_EVENT = "warehouse.pickSheet.status.updated" as const;

export type PickSheetItemUpdatedEvent = {
  type: typeof PICK_SHEET_ITEM_UPDATED_EVENT;
  tenantId: string;
  pickSheetId: string;
  pickSheetStatus?: PickSheetStatus;
  itemId: string;
  isPicked: boolean;
  pickedAt: string | null;
  pickOrder?: number | null;
  skuId: string | null;
  quantity: number | null;
  updatedAt: string;
};

export type PickSheetStatusUpdatedEvent = {
  type: typeof PICK_SHEET_STATUS_UPDATED_EVENT;
  tenantId: string;
  pickSheetId: string;
  status: PickSheetStatus;
  completedAt: string | null;
  updatedAt: string;
};

export type WarehouseRealtimeEvent = PickSheetItemUpdatedEvent | PickSheetStatusUpdatedEvent;

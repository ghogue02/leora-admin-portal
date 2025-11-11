import type { PickSheetStatus } from "@prisma/client";
import { publishTenantEvent } from "@/lib/realtime/server";
import { getTenantChannelName } from "@/lib/realtime/channels.server";
import {
  PICK_SHEET_ITEM_UPDATED_EVENT,
  PICK_SHEET_STATUS_UPDATED_EVENT,
  type PickSheetItemUpdatedEvent,
  type PickSheetStatusUpdatedEvent,
} from "@/lib/realtime/events/warehouse";

type ItemEventInput = {
  tenantId: string;
  pickSheetId: string;
  pickSheetStatus?: PickSheetStatus;
  itemId: string;
  isPicked: boolean;
  pickedAt?: Date | null;
  pickOrder?: number | null;
  skuId?: string | null;
  quantity?: number | null;
  updatedAt?: Date | null;
};

type StatusEventInput = {
  tenantId: string;
  pickSheetId: string;
  status: PickSheetStatus;
  completedAt?: Date | null;
  updatedAt?: Date | null;
};

export async function publishPickSheetItemUpdated(input: ItemEventInput) {
  const channel = getTenantChannelName(input.tenantId, "warehouse");
  const payload: PickSheetItemUpdatedEvent = {
    type: PICK_SHEET_ITEM_UPDATED_EVENT,
    tenantId: input.tenantId,
    pickSheetId: input.pickSheetId,
    pickSheetStatus: input.pickSheetStatus,
    itemId: input.itemId,
    isPicked: input.isPicked,
    pickedAt: input.pickedAt ? input.pickedAt.toISOString() : null,
    pickOrder: input.pickOrder ?? null,
    skuId: input.skuId ?? null,
    quantity: input.quantity ?? null,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
  };

  await publishTenantEvent({
    channel,
    event: PICK_SHEET_ITEM_UPDATED_EVENT,
    payload,
  });
}

export async function publishPickSheetStatusUpdated(input: StatusEventInput) {
  const channel = getTenantChannelName(input.tenantId, "warehouse");
  const payload: PickSheetStatusUpdatedEvent = {
    type: PICK_SHEET_STATUS_UPDATED_EVENT,
    tenantId: input.tenantId,
    pickSheetId: input.pickSheetId,
    status: input.status,
    completedAt: input.completedAt ? input.completedAt.toISOString() : null,
    updatedAt: (input.updatedAt ?? new Date()).toISOString(),
  };

  await publishTenantEvent({
    channel,
    event: PICK_SHEET_STATUS_UPDATED_EVENT,
    payload,
  });
}

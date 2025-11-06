import { describe, expect, it } from "vitest";
import {
  serializeSampleFollowUp,
  type ActivitySampleItemWithActivity,
} from "@/app/api/sales/activities/_helpers";

describe("serializeSampleFollowUp", () => {
  it("serializes activity sample items with activity context", () => {
    const occurredAt = new Date("2025-01-15T14:30:00.000Z");
    const createdAt = new Date("2025-01-16T10:12:00.000Z");

    const item: ActivitySampleItemWithActivity = {
      id: "sample-item-1",
      activityId: "activity-1",
      sampleListItemId: null,
      feedback: "Customer loved the acidity balance.",
      followUpNeeded: true,
      followUpCompletedAt: null,
      createdAt,
      activity: {
        id: "activity-1",
        subject: "Tasting - Bistro 210",
        occurredAt,
        activityType: {
          id: "type-visit",
          name: "In-Person Visit",
          code: "IN_PERSON_VISIT",
        },
        customer: {
          id: "customer-123",
          name: "Bistro 210",
        },
      },
      sku: {
        id: "sku-42",
        code: "PS-CH-2024",
        size: "750ml",
        unitOfMeasure: "bottle",
        product: {
          id: "product-7",
          name: "Pinot Gris Reserve",
          brand: "Prairie Sun",
        },
      },
    };

    const serialized = serializeSampleFollowUp(item);

    expect(serialized).toEqual({
      id: "sample-item-1",
      activityId: "activity-1",
      sampleListItemId: null,
      feedback: "Customer loved the acidity balance.",
      followUpNeeded: true,
      followUpCompletedAt: null,
      createdAt: createdAt.toISOString(),
      activity: {
        id: "activity-1",
        subject: "Tasting - Bistro 210",
        occurredAt: occurredAt.toISOString(),
        activityType: {
          id: "type-visit",
          name: "In-Person Visit",
          code: "IN_PERSON_VISIT",
        },
        customer: {
          id: "customer-123",
          name: "Bistro 210",
        },
      },
      sku: {
        id: "sku-42",
        code: "PS-CH-2024",
        name: "Pinot Gris Reserve",
        brand: "Prairie Sun",
        unitOfMeasure: "bottle",
        size: "750ml",
      },
    });
  });

  it("handles missing optional relations", () => {
    const createdAt = new Date("2025-02-01T12:00:00Z");
    const item: ActivitySampleItemWithActivity = {
      id: "sample-item-2",
      activityId: "activity-2",
      sampleListItemId: "list-item-10",
      feedback: "",
      followUpNeeded: false,
      followUpCompletedAt: new Date("2025-02-05T00:00:00Z"),
      createdAt,
      activity: null,
      sku: null,
    };

    const serialized = serializeSampleFollowUp(item);
    expect(serialized.activity).toBeNull();
    expect(serialized.sku).toBeNull();
    expect(serialized.followUpCompletedAt).toBe("2025-02-05T00:00:00.000Z");
  });
});

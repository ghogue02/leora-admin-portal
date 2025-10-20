import { describe, expect, test } from "vitest";
import { serializeAddress } from "./serializer";

describe("serializeAddress", () => {
  test("returns API-safe shape", () => {
    const serialized = serializeAddress({
      id: "addr-1",
      label: "HQ",
      street1: "123 Main St",
      street2: "Suite 200",
      city: "Philadelphia",
      state: "PA",
      postalCode: "19104",
      country: "United States",
      isDefault: true,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });

    expect(serialized).toEqual({
      id: "addr-1",
      label: "HQ",
      street1: "123 Main St",
      street2: "Suite 200",
      city: "Philadelphia",
      state: "PA",
      postalCode: "19104",
      country: "United States",
      isDefault: true,
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
  });
});

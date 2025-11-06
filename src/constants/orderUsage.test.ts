import { describe, expect, it } from "vitest";
import { ORDER_USAGE_OPTIONS, isValidOrderUsage } from "./orderUsage";

describe("orderUsage helpers", () => {
  it("treats defined usage options as valid", () => {
    for (const option of ORDER_USAGE_OPTIONS) {
      expect(isValidOrderUsage(option.value)).toBe(true);
    }
  });

  it("rejects invalid or empty usage values", () => {
    expect(isValidOrderUsage(undefined)).toBe(false);
    expect(isValidOrderUsage(null)).toBe(false);
    expect(isValidOrderUsage("")).toBe(false);
    expect(isValidOrderUsage("NOT_A_USAGE")).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import { coerceBoolean, coerceInteger, coerceString } from "./parsers";

describe("coerceString", () => {
  test("trims whitespace and handles numbers", () => {
    expect(coerceString("  hello ")).toBe("hello");
    expect(coerceString(1234)).toBe("1234");
  });

  test("returns empty string for unsupported values", () => {
    expect(coerceString(null)).toBe("");
    expect(coerceString(undefined)).toBe("");
    expect(coerceString({})).toBe("");
  });
});

describe("coerceInteger", () => {
  test("parses numeric strings", () => {
    expect(coerceInteger("42")).toBe(42);
    expect(coerceInteger("  17  ")).toBe(17);
  });

  test("returns undefined for invalid inputs", () => {
    expect(coerceInteger("abc")).toBeUndefined();
    expect(coerceInteger({})).toBeUndefined();
  });

  test("truncates floating point numbers", () => {
    expect(coerceInteger(12.9)).toBe(12);
  });
});

describe("coerceBoolean", () => {
  test("handles boolean literals", () => {
    expect(coerceBoolean(true)).toBe(true);
    expect(coerceBoolean(false)).toBe(false);
  });

  test("handles string values", () => {
    expect(coerceBoolean("true")).toBe(true);
    expect(coerceBoolean(" false ")).toBe(false);
    expect(coerceBoolean("TRUE")).toBe(true);
  });

  test("handles numeric values", () => {
    expect(coerceBoolean(1)).toBe(true);
    expect(coerceBoolean(0)).toBe(false);
  });

  test("defaults to false for unrecognized input", () => {
    expect(coerceBoolean("not-a-bool")).toBe(false);
  });
});

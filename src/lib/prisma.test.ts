import { describe, expect, test, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { prisma, withTenant } from "./prisma";

describe("withTenant", () => {
  test("sets tenant context before executing callback", async () => {
    const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("$");
      expect(sql).toContain("set_config('app.current_tenant_id'");
      expect(values).toContain("tenant-test");
    });

    const fakeTx = {
      $executeRaw: executeRaw,
    } as unknown as PrismaClient;

    const transactionSpy = vi
      .spyOn(prisma, "$transaction")
      .mockImplementation(async (callback: (tx: PrismaClient) => Promise<unknown>) => {
        return callback(fakeTx);
      });

    const callback = vi.fn(async () => "ok");

    const result = await withTenant("tenant-test", async (tx) => {
      expect(tx).toBe(fakeTx);
      return callback();
    });

    expect(result).toBe("ok");
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);

    transactionSpy.mockRestore();
  });
});

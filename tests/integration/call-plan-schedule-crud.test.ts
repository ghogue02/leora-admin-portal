import { beforeEach, afterEach, afterAll, describe, expect, test } from "vitest";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "node:crypto";

describe("CARLA Schedule CRUD", () => {
  let tenantId: string;
  let userId: string;
  let callPlanId: string;
  let customerId: string;
  let tenantSlug: string;
  let userEmail: string;

  beforeEach(async () => {
    tenantSlug = `test-tenant-${randomUUID()}`;
    userEmail = `carla-user-${randomUUID()}@example.com`;

    const tenant = await prisma.tenant.create({
      data: {
        name: "Test Tenant",
        slug: tenantSlug,
      },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: userEmail,
        fullName: "Test User",
        hashedPassword: "hashed-password",
      },
    });
    userId = user.id;

    const customer = await prisma.customer.create({
      data: {
        tenantId,
        name: "Test Customer",
        accountNumber: `ACC-${randomUUID().slice(0, 8)}`,
      },
    });
    customerId = customer.id;

    const callPlan = await prisma.callPlan.create({
      data: {
        tenantId,
        userId,
        name: "Weekly Plan",
        weekNumber: 1,
        year: 2024,
        accounts: {
          create: {
            tenantId,
            customerId,
          },
        },
      },
    });
    callPlanId = callPlan.id;
  });

  afterEach(async () => {
    await prisma.callPlanSchedule.deleteMany({ where: { tenantId } });
    await prisma.callPlanAccount.deleteMany({ where: { tenantId } });
    await prisma.callPlan.deleteMany({ where: { tenantId } });
    await prisma.customer.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("should create schedule with valid data", async () => {
    const schedule = await prisma.callPlanSchedule.create({
      data: {
        tenantId,
        callPlanId,
        customerId,
        scheduledDate: new Date("2024-01-15T00:00:00Z"),
        scheduledTime: "09:00",
        duration: 30,
      },
    });

    expect(schedule).toBeDefined();
    expect(schedule.scheduledTime).toBe("09:00");
    expect(schedule.duration).toBe(30);
  });

  test("should prevent duplicate schedule (same account, date, time)", async () => {
    await prisma.callPlanSchedule.create({
      data: {
        tenantId,
        callPlanId,
        customerId,
        scheduledDate: new Date("2024-01-15T00:00:00Z"),
        scheduledTime: "09:00",
        duration: 30,
      },
    });

    await expect(
      prisma.callPlanSchedule.create({
        data: {
          tenantId,
          callPlanId,
          customerId,
          scheduledDate: new Date("2024-01-15T00:00:00Z"),
          scheduledTime: "09:00",
          duration: 30,
        },
      }),
    ).rejects.toThrowError();
  });

  test("should delete schedule by ID", async () => {
    const schedule = await prisma.callPlanSchedule.create({
      data: {
        tenantId,
        callPlanId,
        customerId,
        scheduledDate: new Date("2024-01-15T00:00:00Z"),
        scheduledTime: "09:00",
      },
    });

    await prisma.callPlanSchedule.delete({
      where: { id: schedule.id },
    });

    const deleted = await prisma.callPlanSchedule.findUnique({
      where: { id: schedule.id },
    });

    expect(deleted).toBeNull();
  });

  test("should cascade delete schedules when call plan deleted", async () => {
    await prisma.callPlanSchedule.create({
      data: {
        tenantId,
        callPlanId,
        customerId,
        scheduledDate: new Date("2024-01-15T00:00:00Z"),
        scheduledTime: "09:00",
      },
    });

    await prisma.callPlan.delete({ where: { id: callPlanId } });

    const schedules = await prisma.callPlanSchedule.findMany({
      where: { callPlanId },
    });

    expect(schedules).toHaveLength(0);
  });
});

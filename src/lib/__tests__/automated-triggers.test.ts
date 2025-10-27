import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  processSampleNoOrderTrigger,
  processFirstOrderFollowup,
  processCustomerTimingTrigger,
  processBurnRateAlert,
  getTriggerStatistics,
} from "../automated-triggers";

// Mock Prisma Client
const mockPrismaClient = {
  sampleUsage: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    findMany: jest.fn(),
  },
  customer: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  task: {
    create: jest.fn(),
  },
  triggeredTask: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
} as any;

describe("Automated Triggers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("processSampleNoOrderTrigger", () => {
    it("should create tasks for samples without orders after configured days", async () => {
      const trigger = {
        id: "trigger-1",
        tenantId: "tenant-1",
        triggerType: "SAMPLE_NO_ORDER",
        config: { daysAfter: 7, priority: "MEDIUM" },
      };

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const mockSamples = [
        {
          id: "sample-1",
          customerId: "customer-1",
          tastedAt: sevenDaysAgo,
          followedUpAt: null,
          resultedInOrder: false,
          customer: {
            id: "customer-1",
            name: "Test Customer",
            salesRepId: "rep-1",
            salesRep: {
              userId: "user-1",
              user: { id: "user-1", fullName: "Sales Rep" },
            },
          },
          sku: {
            product: { name: "Test Wine" },
          },
        },
      ];

      mockPrismaClient.sampleUsage.findMany.mockResolvedValue(mockSamples);
      mockPrismaClient.triggeredTask.findFirst.mockResolvedValue(null);
      mockPrismaClient.task.create.mockResolvedValue({ id: "task-1" });
      mockPrismaClient.triggeredTask.create.mockResolvedValue({ id: "tt-1" });
      mockPrismaClient.sampleUsage.update.mockResolvedValue({});
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await processSampleNoOrderTrigger(
        mockPrismaClient,
        trigger,
      );

      expect(result).toBe(1);
      expect(mockPrismaClient.task.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaClient.sampleUsage.update).toHaveBeenCalledWith({
        where: { id: "sample-1" },
        data: { followedUpAt: expect.any(Date) },
      });
    });

    it("should skip samples that already have triggered tasks", async () => {
      const trigger = {
        id: "trigger-1",
        tenantId: "tenant-1",
        config: { daysAfter: 7 },
      };

      mockPrismaClient.sampleUsage.findMany.mockResolvedValue([
        { id: "sample-1", customerId: "customer-1", tastedAt: new Date() },
      ]);
      mockPrismaClient.triggeredTask.findFirst.mockResolvedValue({
        id: "existing-tt",
      });

      const result = await processSampleNoOrderTrigger(
        mockPrismaClient,
        trigger,
      );

      expect(result).toBe(0);
      expect(mockPrismaClient.task.create).not.toHaveBeenCalled();
    });
  });

  describe("processFirstOrderFollowup", () => {
    it("should create tasks for first orders delivered in timeframe", async () => {
      const trigger = {
        id: "trigger-2",
        tenantId: "tenant-1",
        config: { daysAfter: 1, priority: "HIGH" },
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockOrders = [
        {
          id: "order-1",
          customerId: "customer-1",
          isFirstOrder: true,
          deliveredAt: yesterday,
          customer: {
            id: "customer-1",
            name: "New Customer",
            salesRepId: "rep-1",
            salesRep: {
              userId: "user-1",
            },
          },
        },
      ];

      mockPrismaClient.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaClient.triggeredTask.findFirst.mockResolvedValue(null);
      mockPrismaClient.task.create.mockResolvedValue({ id: "task-2" });
      mockPrismaClient.triggeredTask.create.mockResolvedValue({ id: "tt-2" });
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await processFirstOrderFollowup(mockPrismaClient, trigger);

      expect(result).toBe(1);
      expect(mockPrismaClient.task.create).toHaveBeenCalledTimes(1);
    });
  });

  describe("processCustomerTimingTrigger", () => {
    it("should create tasks for customers past doNotContactUntil date", async () => {
      const trigger = {
        id: "trigger-3",
        tenantId: "tenant-1",
        config: { priority: "MEDIUM" },
      };

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockCustomers = [
        {
          id: "customer-1",
          name: "Customer",
          doNotContactUntil: yesterday,
          salesRepId: "rep-1",
          salesRep: { userId: "user-1" },
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaClient.triggeredTask.findFirst.mockResolvedValue(null);
      mockPrismaClient.task.create.mockResolvedValue({ id: "task-3" });
      mockPrismaClient.triggeredTask.create.mockResolvedValue({ id: "tt-3" });
      mockPrismaClient.customer.update.mockResolvedValue({});
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await processCustomerTimingTrigger(
        mockPrismaClient,
        trigger,
      );

      expect(result).toBe(1);
      expect(mockPrismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: "customer-1" },
        data: { doNotContactUntil: null },
      });
    });
  });

  describe("processBurnRateAlert", () => {
    it("should create tasks for customers past reorder window", async () => {
      const trigger = {
        id: "trigger-4",
        tenantId: "tenant-1",
        config: { percentageThreshold: 20, priority: "MEDIUM" },
      };

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const twentyFiveDaysAgo = new Date();
      twentyFiveDaysAgo.setDate(twentyFiveDaysAgo.getDate() - 25);

      const mockCustomers = [
        {
          id: "customer-1",
          name: "Regular Customer",
          averageOrderIntervalDays: 20,
          lastOrderDate: thirtyDaysAgo,
          nextExpectedOrderDate: twentyFiveDaysAgo,
          salesRepId: "rep-1",
          salesRep: { userId: "user-1" },
        },
      ];

      mockPrismaClient.customer.findMany.mockResolvedValue(mockCustomers);
      mockPrismaClient.triggeredTask.findFirst.mockResolvedValue(null);
      mockPrismaClient.task.create.mockResolvedValue({ id: "task-4" });
      mockPrismaClient.triggeredTask.create.mockResolvedValue({ id: "tt-4" });
      mockPrismaClient.auditLog.create.mockResolvedValue({});

      const result = await processBurnRateAlert(mockPrismaClient, trigger);

      expect(result).toBe(1);
    });

    it("should not create tasks if within grace period", async () => {
      const trigger = {
        id: "trigger-4",
        tenantId: "tenant-1",
        config: { percentageThreshold: 20 },
      };

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrismaClient.customer.findMany.mockResolvedValue([
        {
          averageOrderIntervalDays: 20,
          nextExpectedOrderDate: tomorrow,
        },
      ]);

      const result = await processBurnRateAlert(mockPrismaClient, trigger);

      expect(result).toBe(0);
      expect(mockPrismaClient.task.create).not.toHaveBeenCalled();
    });
  });

  describe("getTriggerStatistics", () => {
    it("should calculate correct statistics", async () => {
      const mockTriggeredTasks = [
        { task: { status: "COMPLETED" } },
        { task: { status: "COMPLETED" } },
        { task: { status: "PENDING" } },
        { task: { status: "IN_PROGRESS" } },
      ];

      mockPrismaClient.triggeredTask.findMany.mockResolvedValue(
        mockTriggeredTasks,
      );

      const stats = await getTriggerStatistics(
        mockPrismaClient,
        "tenant-1",
        "trigger-1",
      );

      expect(stats).toEqual({
        totalTasksCreated: 4,
        tasksCompleted: 2,
        tasksPending: 2,
        completionRate: 50,
      });
    });

    it("should handle no tasks gracefully", async () => {
      mockPrismaClient.triggeredTask.findMany.mockResolvedValue([]);

      const stats = await getTriggerStatistics(
        mockPrismaClient,
        "tenant-1",
        "trigger-1",
      );

      expect(stats).toEqual({
        totalTasksCreated: 0,
        tasksCompleted: 0,
        tasksPending: 0,
        completionRate: 0,
      });
    });
  });
});

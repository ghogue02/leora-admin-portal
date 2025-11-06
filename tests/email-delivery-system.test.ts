/**
 * Email Delivery System Tests
 * Tests for Resend email service and cron job processing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  sendEmailWithResend,
  queueEmail,
  processPendingEmails,
  getEmailStats,
} from '@/lib/email/resend-service';

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({
        data: { id: 'mock-email-id-123' },
        error: null,
      }),
    },
  })),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    emailMessage: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

const TENANT_ID = '123e4567-e89b-12d3-a456-426614174000';
const CUSTOMER_ID = '223e4567-e89b-12d3-a456-426614174000';

describe('Email Delivery System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendEmailWithResend', () => {
    it('should send email successfully', async () => {
      const mockEmailMessage = {
        id: 'email-123',
        tenantId: TENANT_ID,
        customerId: CUSTOMER_ID,
        fromAddress: 'noreply@leora.com',
        toAddress: 'customer@example.com',
        subject: 'Test Email',
        body: '<html>Test</html>',
        status: 'SENDING',
        templateId: 'orderStatusChanged',
        metadata: {},
        createdAt: new Date(),
      };

      vi.mocked(prisma.emailMessage.create).mockResolvedValue(mockEmailMessage as any);
      vi.mocked(prisma.emailMessage.update).mockResolvedValue({
        ...mockEmailMessage,
        status: 'SENT',
        sentAt: new Date(),
        externalId: 'mock-email-id-123',
      } as any);

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Order Status Update',
        templateName: 'orderStatusChanged',
        templateData: {
          orderId: 'order-123',
          orderNumber: 'WC-2024-001',
          customerName: 'John Doe',
          previousStatus: 'SUBMITTED',
          newStatus: 'PICKED',
          orderDate: '2024-11-06',
          totalAmount: '1,250.00',
          baseUrl: 'http://localhost:3000',
        },
        tenantId: TENANT_ID,
        customerId: CUSTOMER_ID,
      });

      expect(result.success).toBe(true);
      expect(result.externalId).toBe('mock-email-id-123');
      expect(prisma.emailMessage.create).toHaveBeenCalledTimes(1);
      expect(prisma.emailMessage.update).toHaveBeenCalledTimes(1);
    });

    it('should handle email send failure', async () => {
      const Resend = (await import('resend')).Resend;
      vi.mocked(Resend).mockImplementationOnce(
        () =>
          ({
            emails: {
              send: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Invalid API key' },
              }),
            },
          }) as any
      );

      const mockEmailMessage = {
        id: 'email-123',
        status: 'SENDING',
      };

      vi.mocked(prisma.emailMessage.create).mockResolvedValue(mockEmailMessage as any);
      vi.mocked(prisma.emailMessage.update).mockResolvedValue({
        ...mockEmailMessage,
        status: 'FAILED',
      } as any);

      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test Email',
        templateName: 'orderStatusChanged',
        templateData: {
          orderId: 'order-123',
          orderNumber: 'WC-2024-001',
          customerName: 'John Doe',
          previousStatus: 'SUBMITTED',
          newStatus: 'PICKED',
          orderDate: '2024-11-06',
          totalAmount: '1,250.00',
          baseUrl: 'http://localhost:3000',
        },
        tenantId: TENANT_ID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid API key');
    });

    it('should reject unknown template names', async () => {
      const result = await sendEmailWithResend({
        to: 'customer@example.com',
        subject: 'Test Email',
        templateName: 'unknownTemplate' as any,
        templateData: {},
        tenantId: TENANT_ID,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown email template');
    });
  });

  describe('queueEmail', () => {
    it('should queue email for later sending', async () => {
      const mockEmailMessage = {
        id: 'email-queue-123',
        status: 'PENDING',
      };

      vi.mocked(prisma.emailMessage.create).mockResolvedValue(mockEmailMessage as any);

      const result = await queueEmail({
        to: 'customer@example.com',
        subject: 'Daily Summary',
        templateName: 'dailySummary',
        templateData: {
          salesRepName: 'Jane Smith',
          date: '2024-11-06',
          metrics: {
            ordersCount: 5,
            ordersTotal: '5,000.00',
            newCustomers: 2,
            activitiesCompleted: 8,
            tasksCompleted: 3,
            tasksPending: 5,
          },
          topOrders: [],
          upcomingTasks: [],
          baseUrl: 'http://localhost:3000',
        },
        tenantId: TENANT_ID,
      });

      expect(result.success).toBe(true);
      expect(result.emailId).toBe('email-queue-123');
      expect(prisma.emailMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should queue email with scheduled time', async () => {
      const scheduledFor = new Date('2024-11-07T09:00:00Z');
      const mockEmailMessage = {
        id: 'email-queue-456',
        status: 'PENDING',
        metadata: {
          scheduledFor: scheduledFor.toISOString(),
        },
      };

      vi.mocked(prisma.emailMessage.create).mockResolvedValue(mockEmailMessage as any);

      const result = await queueEmail({
        to: 'salesrep@example.com',
        subject: 'Daily Summary',
        templateName: 'dailySummary',
        templateData: {
          salesRepName: 'Jane Smith',
          date: '2024-11-06',
          metrics: {
            ordersCount: 5,
            ordersTotal: '5,000.00',
            newCustomers: 2,
            activitiesCompleted: 8,
            tasksCompleted: 3,
            tasksPending: 5,
          },
          topOrders: [],
          upcomingTasks: [],
          baseUrl: 'http://localhost:3000',
        },
        tenantId: TENANT_ID,
        scheduledFor,
      });

      expect(result.success).toBe(true);
      expect(prisma.emailMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PENDING',
            metadata: expect.objectContaining({
              scheduledFor: scheduledFor.toISOString(),
            }),
          }),
        })
      );
    });
  });

  describe('processPendingEmails', () => {
    it('should process pending emails successfully', async () => {
      const pendingEmails = [
        {
          id: 'email-1',
          fromAddress: 'noreply@leora.com',
          toAddress: 'customer1@example.com',
          subject: 'Test 1',
          body: '<html>Test 1</html>',
          status: 'PENDING',
          metadata: {},
        },
        {
          id: 'email-2',
          fromAddress: 'noreply@leora.com',
          toAddress: 'customer2@example.com',
          subject: 'Test 2',
          body: '<html>Test 2</html>',
          status: 'PENDING',
          metadata: {},
        },
      ];

      vi.mocked(prisma.emailMessage.findMany).mockResolvedValue(pendingEmails as any);
      vi.mocked(prisma.emailMessage.update).mockResolvedValue({} as any);

      const result = await processPendingEmails();

      expect(result.processed).toBe(2);
      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it('should skip future scheduled emails', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const pendingEmails = [
        {
          id: 'email-future',
          fromAddress: 'noreply@leora.com',
          toAddress: 'customer@example.com',
          subject: 'Future Email',
          body: '<html>Future</html>',
          status: 'PENDING',
          metadata: {
            scheduledFor: futureDate.toISOString(),
          },
        },
      ];

      vi.mocked(prisma.emailMessage.findMany).mockResolvedValue(pendingEmails as any);

      const result = await processPendingEmails();

      expect(result.processed).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle send failures gracefully', async () => {
      const Resend = (await import('resend')).Resend;
      vi.mocked(Resend).mockImplementationOnce(
        () =>
          ({
            emails: {
              send: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Rate limit exceeded' },
              }),
            },
          }) as any
      );

      const pendingEmails = [
        {
          id: 'email-fail',
          fromAddress: 'noreply@leora.com',
          toAddress: 'customer@example.com',
          subject: 'Test',
          body: '<html>Test</html>',
          status: 'PENDING',
          metadata: {},
        },
      ];

      vi.mocked(prisma.emailMessage.findMany).mockResolvedValue(pendingEmails as any);
      vi.mocked(prisma.emailMessage.update).mockResolvedValue({} as any);

      const result = await processPendingEmails();

      expect(result.processed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].status).toBe('failed');
    });
  });

  describe('getEmailStats', () => {
    it('should return email statistics', async () => {
      vi.mocked(prisma.emailMessage.count)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85) // sent
        .mockResolvedValueOnce(10) // pending
        .mockResolvedValueOnce(5) // failed
        .mockResolvedValueOnce(40) // opened
        .mockResolvedValueOnce(15); // clicked

      const stats = await getEmailStats(TENANT_ID);

      expect(stats).toEqual({
        total: 100,
        sent: 85,
        pending: 10,
        failed: 5,
        opened: 40,
        clicked: 15,
      });

      expect(prisma.emailMessage.count).toHaveBeenCalledTimes(6);
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date('2024-11-01');
      const endDate = new Date('2024-11-30');

      vi.mocked(prisma.emailMessage.count).mockResolvedValue(50);

      await getEmailStats(TENANT_ID, startDate, endDate);

      expect(prisma.emailMessage.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      );
    });
  });
});

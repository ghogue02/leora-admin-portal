/**
 * Integration Tests: Calendar Synchronization
 * Tests Google Calendar and Outlook integration for call plans
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  syncCallPlanToGoogleCalendar,
  syncCallPlanToOutlook,
  deleteCalendarEvent,
  updateCalendarEvent,
} from '@/lib/calendar-sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Google Calendar API
const mockGoogleCalendar = {
  events: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
};

// Mock Outlook Graph API
const mockOutlookClient = {
  api: vi.fn().mockReturnThis(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
};

vi.mock('googleapis', () => ({
  google: {
    calendar: () => mockGoogleCalendar,
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
      })),
    },
  },
}));

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: vi.fn(() => mockOutlookClient),
  },
}));

describe('Calendar Sync Integration Tests', () => {
  let testTenantId: string;
  let testUserId: string;
  let testCallPlanId: string;

  beforeEach(async () => {
    // Create test data
    const tenant = await prisma.tenant.create({
      data: {
        slug: 'test-calendar-sync',
        name: 'Test Calendar Sync',
        industry: 'test',
      },
    });
    testTenantId = tenant.id;

    const user = await prisma.salesUser.create({
      data: {
        tenantId: testTenantId,
        email: 'sales@test.com',
        fullName: 'Test Sales Rep',
        passwordHash: 'hashed',
      },
    });
    testUserId = user.id;

    const plan = await prisma.callPlan.create({
      data: {
        tenantId: testTenantId,
        userId: testUserId,
        weekStartDate: new Date('2025-10-20'),
        weekEndDate: new Date('2025-10-26'),
        status: 'active',
        accountsCount: 0,
      },
    });
    testCallPlanId = plan.id;

    // Add accounts to plan
    await prisma.callPlanAccount.createMany({
      data: [
        {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-1',
          accountName: 'High Value Account',
          priority: 1,
          objective: 'Discuss Q4 promotion',
        },
        {
          tenantId: testTenantId,
          callPlanId: testCallPlanId,
          accountId: 'account-2',
          accountName: 'Growth Account',
          priority: 2,
          objective: 'Introduce new products',
        },
      ],
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.callPlanAccount.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.callPlan.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.salesUser.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
  });

  describe('Google Calendar Sync', () => {
    it('should create calendar event for call plan', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: {
          id: 'google-event-1',
          htmlLink: 'https://calendar.google.com/event/google-event-1',
        },
      });

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('google-event-1');
      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledWith({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          summary: expect.stringContaining('Call Plan'),
          description: expect.stringContaining('High Value Account'),
          start: expect.objectContaining({
            date: '2025-10-20',
          }),
          end: expect.objectContaining({
            date: '2025-10-27', // End date is exclusive
          }),
        }),
      });
    });

    it('should include all accounts in event description', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const insertCall = mockGoogleCalendar.events.insert.mock.calls[0][0];
      const description = insertCall.requestBody.description;

      expect(description).toContain('High Value Account');
      expect(description).toContain('Discuss Q4 promotion');
      expect(description).toContain('Growth Account');
      expect(description).toContain('Introduce new products');
    });

    it('should create all-day event', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const insertCall = mockGoogleCalendar.events.insert.mock.calls[0][0];

      expect(insertCall.requestBody.start.date).toBeDefined();
      expect(insertCall.requestBody.start.dateTime).toBeUndefined();
      expect(insertCall.requestBody.end.date).toBeDefined();
    });

    it('should add reminder notifications', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        reminderMinutes: 60,
      });

      const insertCall = mockGoogleCalendar.events.insert.mock.calls[0][0];

      expect(insertCall.requestBody.reminders).toEqual({
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 60 }],
      });
    });

    it('should handle API errors gracefully', async () => {
      mockGoogleCalendar.events.insert.mockRejectedValue(
        new Error('Calendar API error')
      );

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Calendar API error');
    });

    it('should update existing calendar event', async () => {
      mockGoogleCalendar.events.update.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      const result = await updateCalendarEvent({
        provider: 'google',
        eventId: 'google-event-1',
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
      });

      expect(result.success).toBe(true);
      expect(mockGoogleCalendar.events.update).toHaveBeenCalled();
    });

    it('should delete calendar event', async () => {
      mockGoogleCalendar.events.delete.mockResolvedValue({});

      const result = await deleteCalendarEvent({
        provider: 'google',
        eventId: 'google-event-1',
        accessToken: 'mock-access-token',
      });

      expect(result.success).toBe(true);
      expect(mockGoogleCalendar.events.delete).toHaveBeenCalledWith({
        calendarId: 'primary',
        eventId: 'google-event-1',
      });
    });
  });

  describe('Outlook Calendar Sync', () => {
    it('should create Outlook calendar event', async () => {
      mockOutlookClient.post.mockResolvedValue({
        id: 'outlook-event-1',
        webLink: 'https://outlook.office.com/calendar/outlook-event-1',
      });

      const result = await syncCallPlanToOutlook({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('outlook-event-1');
      expect(mockOutlookClient.api).toHaveBeenCalledWith('/me/events');
      expect(mockOutlookClient.post).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Call Plan'),
          body: expect.objectContaining({
            content: expect.stringContaining('High Value Account'),
            contentType: 'HTML',
          }),
          start: expect.objectContaining({
            dateTime: expect.stringContaining('2025-10-20'),
            timeZone: expect.any(String),
          }),
          isAllDay: true,
        })
      );
    });

    it('should include account objectives in HTML body', async () => {
      mockOutlookClient.post.mockResolvedValue({
        id: 'outlook-event-1',
      });

      await syncCallPlanToOutlook({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
      });

      const postCall = mockOutlookClient.post.mock.calls[0][0];
      const htmlContent = postCall.body.content;

      expect(htmlContent).toContain('<ul>');
      expect(htmlContent).toContain('High Value Account');
      expect(htmlContent).toContain('Discuss Q4 promotion');
      expect(htmlContent).toContain('<li>');
    });

    it('should set event categories', async () => {
      mockOutlookClient.post.mockResolvedValue({
        id: 'outlook-event-1',
      });

      await syncCallPlanToOutlook({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
      });

      const postCall = mockOutlookClient.post.mock.calls[0][0];

      expect(postCall.categories).toContain('Sales');
      expect(postCall.categories).toContain('Call Plan');
    });

    it('should update existing Outlook event', async () => {
      mockOutlookClient.patch.mockResolvedValue({
        id: 'outlook-event-1',
      });

      const result = await updateCalendarEvent({
        provider: 'outlook',
        eventId: 'outlook-event-1',
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
      });

      expect(result.success).toBe(true);
      expect(mockOutlookClient.api).toHaveBeenCalledWith(
        '/me/events/outlook-event-1'
      );
      expect(mockOutlookClient.patch).toHaveBeenCalled();
    });

    it('should delete Outlook event', async () => {
      mockOutlookClient.delete.mockResolvedValue({});

      const result = await deleteCalendarEvent({
        provider: 'outlook',
        eventId: 'outlook-event-1',
        accessToken: 'mock-access-token',
      });

      expect(result.success).toBe(true);
      expect(mockOutlookClient.api).toHaveBeenCalledWith(
        '/me/events/outlook-event-1'
      );
      expect(mockOutlookClient.delete).toHaveBeenCalled();
    });
  });

  describe('Sync Status Tracking', () => {
    it('should store calendar event ID in call plan', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const plan = await prisma.callPlan.findUnique({
        where: { id: testCallPlanId },
      });

      expect(plan?.calendarEventId).toBe('google-event-1');
      expect(plan?.calendarProvider).toBe('google');
    });

    it('should track last sync timestamp', async () => {
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      const beforeSync = new Date();

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const plan = await prisma.callPlan.findUnique({
        where: { id: testCallPlanId },
      });

      expect(plan?.lastSyncedAt).toBeDefined();
      expect(plan?.lastSyncedAt!.getTime()).toBeGreaterThanOrEqual(
        beforeSync.getTime()
      );
    });

    it('should prevent duplicate sync', async () => {
      // First sync
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      // Second sync attempt
      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.alreadySynced).toBe(true);
      expect(mockGoogleCalendar.events.insert).toHaveBeenCalledTimes(1);
    });

    it('should allow re-sync after event deletion', async () => {
      // Initial sync
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-1' },
      });

      await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      // Delete event
      mockGoogleCalendar.events.delete.mockResolvedValue({});

      await deleteCalendarEvent({
        provider: 'google',
        eventId: 'google-event-1',
        accessToken: 'mock-access-token',
      });

      // Clear event ID from plan
      await prisma.callPlan.update({
        where: { id: testCallPlanId },
        data: { calendarEventId: null, calendarProvider: null },
      });

      // Re-sync should work
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: 'google-event-2' },
      });

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('google-event-2');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh expired Google access token', async () => {
      const mockAuth = {
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: { access_token: 'new-access-token' },
        }),
      };

      vi.mocked(require('googleapis').google.auth.OAuth2).mockReturnValue(mockAuth);

      mockGoogleCalendar.events.insert.mockRejectedValueOnce({
        code: 401,
        message: 'Invalid credentials',
      });

      mockGoogleCalendar.events.insert.mockResolvedValueOnce({
        data: { id: 'google-event-1' },
      });

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
      });

      expect(mockAuth.refreshAccessToken).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockGoogleCalendar.events.insert.mockRejectedValue(
        new Error('Network error')
      );

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid call plan ID', async () => {
      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: 'invalid-plan-id',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle permission errors', async () => {
      mockGoogleCalendar.events.insert.mockRejectedValue({
        code: 403,
        message: 'Insufficient permissions',
      });

      const result = await syncCallPlanToGoogleCalendar({
        callPlanId: testCallPlanId,
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');
    });
  });
});

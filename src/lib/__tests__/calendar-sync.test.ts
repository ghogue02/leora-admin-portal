import {
  GoogleCalendarClient,
  OutlookCalendarClient,
  CalendarSyncService,
  ErrorCategory,
} from '../calendar-sync';
import prisma from '../prisma';

// Mock dependencies
jest.mock('../prisma', () => ({
  __esModule: true,
  default: {
    integrationToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    calendarSyncMetadata: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    calendarEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../token-encryption', () => ({
  encryptToken: jest.fn((token: string) => `encrypted_${token}`),
  decryptToken: jest.fn((token: string) => token.replace('encrypted_', '')),
  isEncrypted: jest.fn((token: string) => token.startsWith('encrypted_')),
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        setCredentials: jest.fn(),
        refreshAccessToken: jest.fn(),
      })),
    },
    calendar: jest.fn(() => ({
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
      },
    })),
  },
}));

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: jest.fn(() => ({
      api: jest.fn(() => ({
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
        top: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
  },
}));

jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn(() => ({
    acquireTokenByRefreshToken: jest.fn(),
  })),
}));

describe('CalendarSyncService', () => {
  let syncService: CalendarSyncService;

  beforeEach(() => {
    syncService = new CalendarSyncService();
    jest.clearAllMocks();
  });

  describe('Token Refresh', () => {
    it('should proactively refresh token when it expires within 5 minutes', async () => {
      const expiresAt = new Date(Date.now() + 4 * 60 * 1000); // Expires in 4 minutes
      const tenantId = 'tenant-123';
      const provider = 'google' as const;

      const mockToken = {
        accessToken: 'encrypted_old-token',
        refreshToken: 'encrypted_refresh-token',
        expiresAt,
      };

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue(mockToken);
      (prisma.integrationToken.update as jest.Mock).mockResolvedValue({});
      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const { google } = require('googleapis');
      const mockRefreshAccessToken = jest.fn().mockResolvedValue({
        credentials: {
          access_token: 'new-token',
          expiry_date: Date.now() + 3600 * 1000,
        },
      });
      google.auth.OAuth2.mockReturnValue({
        setCredentials: jest.fn(),
        refreshAccessToken: mockRefreshAccessToken,
      });

      const mockCalendarList = jest.fn().mockResolvedValue({
        data: {
          items: [],
          nextSyncToken: 'token-123',
        },
      });
      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      await syncService.syncFromProvider(tenantId, 'user-123', provider);

      // Should have called refresh
      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(prisma.integrationToken.update).toHaveBeenCalled();
    });

    it('should not refresh token if it expires in more than 5 minutes', async () => {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // Expires in 10 minutes
      const tenantId = 'tenant-123';
      const provider = 'google' as const;

      const mockToken = {
        accessToken: 'encrypted_current-token',
        refreshToken: 'encrypted_refresh-token',
        expiresAt,
      };

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue(mockToken);
      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const { google } = require('googleapis');
      const mockRefreshAccessToken = jest.fn();
      google.auth.OAuth2.mockReturnValue({
        setCredentials: jest.fn(),
        refreshAccessToken: mockRefreshAccessToken,
      });

      const mockCalendarList = jest.fn().mockResolvedValue({
        data: {
          items: [],
          nextSyncToken: 'token-123',
        },
      });
      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      await syncService.syncFromProvider(tenantId, 'user-123', provider);

      // Should NOT have called refresh
      expect(mockRefreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('Delta Query Support', () => {
    it('should use sync token for incremental Google Calendar sync', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const provider = 'google' as const;
      const syncToken = 'existing-sync-token';

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue({
        syncToken,
        deltaLink: null,
      });

      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const { google } = require('googleapis');
      const mockCalendarList = jest.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'event-1',
              summary: 'Test Event',
              status: 'confirmed',
              start: { dateTime: new Date().toISOString() },
              end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
            },
          ],
          nextSyncToken: 'new-sync-token',
        },
      });

      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      await syncService.syncFromProvider(tenantId, userId, provider);

      // Should use the sync token
      expect(mockCalendarList).toHaveBeenCalledWith(
        expect.objectContaining({
          syncToken,
        })
      );
    });

    it('should use delta link for incremental Outlook sync', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const provider = 'outlook' as const;
      const deltaLink = '/me/calendar/events/delta?token=abc123';

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue({
        syncToken: null,
        deltaLink,
      });

      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const { Client } = require('@microsoft/microsoft-graph-client');
      const mockGet = jest.fn().mockResolvedValue({
        value: [
          {
            id: 'event-1',
            subject: 'Test Meeting',
            start: { dateTime: new Date().toISOString() },
            end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
          },
        ],
        '@odata.deltaLink': '/me/calendar/events/delta?token=xyz789',
      });

      const mockApi = jest.fn(() => ({
        get: mockGet,
      }));

      Client.init.mockReturnValue({
        api: mockApi,
      });

      await syncService.syncFromProvider(tenantId, userId, provider);

      // Should use the delta link
      expect(mockApi).toHaveBeenCalledWith(deltaLink);
    });

    it('should handle sync token invalidation (410 Gone) by performing full sync', async () => {
      const { google } = require('googleapis');
      let callCount = 0;

      const mockCalendarList = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call with sync token fails
          const error: any = new Error('Sync token is no longer valid');
          error.response = { status: 410 };
          throw error;
        }
        // Second call without sync token succeeds
        return Promise.resolve({
          data: {
            items: [],
            nextSyncToken: 'new-token',
          },
        });
      });

      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue({
        syncToken: 'invalid-token',
      });

      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const client = new GoogleCalendarClient('token', 'refresh');
      const result = await client.listEventsDelta('invalid-token');

      expect(callCount).toBe(2); // Should retry without sync token
      expect(result.nextSyncToken).toBe('new-token');
    });
  });

  describe('Error Handling and Rate Limiting', () => {
    it('should retry transient errors with exponential backoff', async () => {
      const { google } = require('googleapis');
      let callCount = 0;

      const mockCalendarList = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          const error: any = new Error('Network error');
          error.response = { status: 500 };
          throw error;
        }
        return Promise.resolve({
          data: {
            items: [],
            nextSyncToken: 'token',
          },
        });
      });

      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      const client = new GoogleCalendarClient('token', 'refresh');
      const result = await client.listEventsDelta();

      expect(callCount).toBe(3); // Should retry twice
      expect(result.events).toEqual([]);
    });

    it('should not retry auth errors', async () => {
      const { google } = require('googleapis');
      const mockCalendarList = jest.fn().mockImplementation(() => {
        const error: any = new Error('Invalid credentials');
        error.response = { status: 401 };
        throw error;
      });

      google.calendar.mockReturnValue({
        events: {
          list: mockCalendarList,
        },
      });

      const client = new GoogleCalendarClient('token', 'refresh');

      await expect(client.listEventsDelta()).rejects.toThrow();
      expect(mockCalendarList).toHaveBeenCalledTimes(1); // Should not retry
    });

    it('should disable sync after 5 consecutive failures', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const provider = 'google' as const;

      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue({
        consecutiveFailures: 4, // 4 previous failures
      });

      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});

      const { google } = require('googleapis');
      google.calendar.mockReturnValue({
        events: {
          list: jest.fn().mockRejectedValue(new Error('Permanent error')),
        },
      });

      await syncService.syncFromProvider(tenantId, userId, provider);

      // Should disable sync
      expect(prisma.calendarSyncMetadata.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            isActive: false, // Should be disabled
            consecutiveFailures: 5,
          }),
        })
      );
    });
  });

  describe('Sync Status and Health', () => {
    it('should return sync status for all calendars', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      (prisma.calendarSyncMetadata.findMany as jest.Mock).mockResolvedValue([
        {
          tenantId,
          userId,
          provider: 'google',
          isActive: true,
          lastSuccessfulSync: new Date(),
          consecutiveFailures: 0,
          eventsSynced: 42,
          syncDuration: 1234,
          lastError: null,
          syncToken: 'token-123',
          deltaLink: null,
        },
        {
          tenantId,
          userId,
          provider: 'outlook',
          isActive: false,
          lastSuccessfulSync: null,
          consecutiveFailures: 5,
          eventsSynced: 0,
          syncDuration: 0,
          lastError: 'Authentication failed',
          syncToken: null,
          deltaLink: null,
        },
      ]);

      const statuses = await syncService.getSyncStatus(tenantId, userId);

      expect(statuses).toHaveLength(2);
      expect(statuses[0].provider).toBe('google');
      expect(statuses[0].isActive).toBe(true);
      expect(statuses[1].provider).toBe('outlook');
      expect(statuses[1].isActive).toBe(false);
      expect(statuses[1].lastError).toBe('Authentication failed');
    });

    it('should trigger full resync by clearing delta tokens', async () => {
      const tenantId = 'tenant-123';
      const userId = 'user-123';
      const provider = 'google' as const;

      (prisma.calendarSyncMetadata.updateMany as jest.Mock).mockResolvedValue({});
      (prisma.integrationToken.findUnique as jest.Mock).mockResolvedValue({
        accessToken: 'encrypted_token',
        refreshToken: 'encrypted_refresh',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      });

      (prisma.calendarSyncMetadata.findUnique as jest.Mock).mockResolvedValue(null); // No sync token after clearing
      (prisma.calendarSyncMetadata.upsert as jest.Mock).mockResolvedValue({});
      (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);

      const { google } = require('googleapis');
      google.calendar.mockReturnValue({
        events: {
          list: jest.fn().mockResolvedValue({
            data: { items: [], nextSyncToken: 'new-token' },
          }),
        },
      });

      await syncService.triggerFullResync(tenantId, userId, provider);

      // Should clear tokens
      expect(prisma.calendarSyncMetadata.updateMany).toHaveBeenCalledWith({
        where: { tenantId, userId, provider },
        data: { syncToken: null, deltaLink: null },
      });
    });
  });
});

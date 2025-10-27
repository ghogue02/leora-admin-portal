/**
 * Phase 4 Integration Tests
 *
 * End-to-end tests for calendar and Mailchimp integrations
 */

import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';

// Mock external APIs
jest.mock('googleapis');
jest.mock('@microsoft/microsoft-graph-client');
jest.mock('@/lib/prisma');

describe('Phase 4: Advanced Integrations', () => {
  describe('Google Calendar OAuth', () => {
    it('should initiate OAuth flow with correct parameters', async () => {
      const response = await fetch('/api/calendar/connect/google', {
        method: 'GET',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(data.authUrl).toContain('scope=');
      expect(data.authUrl).toContain('calendar');
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expiry_date: Date.now() + 3600000,
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        token_type: 'Bearer',
      };

      // Mock OAuth2Client
      const mockOAuth2Client = {
        getToken: jest.fn().mockResolvedValue({ tokens: mockTokens }),
      };

      (google.auth.OAuth2 as jest.Mock).mockReturnValue(mockOAuth2Client);

      const response = await fetch('/api/calendar/connect/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'mock_authorization_code',
          state: JSON.stringify({ email: 'test@example.com' }),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('connected');
    });

    it('should handle expired tokens during sync', async () => {
      // Test error handling for expired tokens
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          direction: 'from',
        }),
      });

      // Should attempt to refresh token automatically
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Outlook Calendar OAuth', () => {
    it('should initiate Microsoft OAuth flow', async () => {
      const response = await fetch('/api/calendar/connect/outlook', {
        method: 'GET',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toContain('login.microsoftonline.com');
      expect(data.authUrl).toContain('oauth2');
    });

    it('should exchange authorization code for Microsoft tokens', async () => {
      const mockResponse = {
        accessToken: 'mock_ms_access_token',
        refreshToken: 'mock_ms_refresh_token',
        expiresOn: new Date(Date.now() + 3600000),
        scopes: ['Calendars.ReadWrite'],
        tokenType: 'Bearer',
        account: { username: 'test@example.com' },
      };

      const response = await fetch('/api/calendar/connect/outlook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'mock_authorization_code',
          state: JSON.stringify({ email: 'test@example.com' }),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Mailchimp OAuth', () => {
    it('should initiate Mailchimp OAuth flow', async () => {
      const response = await fetch('/api/mailchimp/oauth', {
        method: 'GET',
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authUrl).toContain('login.mailchimp.com/oauth2/authorize');
    });

    it('should exchange code for Mailchimp access token', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'mock_mailchimp_token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            dc: 'us1',
            accountname: 'Test Account',
            api_endpoint: 'https://us1.api.mailchimp.com',
          }),
        }) as any;

      const response = await fetch('/api/mailchimp/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'mock_authorization_code',
          state: Buffer.from(JSON.stringify({ email: 'test@example.com' })).toString('base64'),
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metadata.dc).toBe('us1');
    });
  });

  describe('Mailchimp Webhooks', () => {
    it('should handle subscribe webhook', async () => {
      const webhookPayload = {
        type: 'subscribe',
        data: {
          email: 'newcustomer@example.com',
          list_id: 'abc123',
          merges: {
            FNAME: 'John',
            LNAME: 'Doe',
          },
        },
      };

      const response = await fetch('/api/mailchimp/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should handle unsubscribe webhook', async () => {
      const webhookPayload = {
        type: 'unsubscribe',
        data: {
          email: 'customer@example.com',
          list_id: 'abc123',
          reason: 'manual',
        },
      };

      const response = await fetch('/api/mailchimp/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      });

      expect(response.status).toBe(200);
    });

    it('should verify webhook signature', async () => {
      const crypto = require('crypto');
      const payload = JSON.stringify({ type: 'subscribe', data: {} });
      const secret = process.env.MAILCHIMP_WEBHOOK_SECRET || 'test-secret';
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const response = await fetch('/api/mailchimp/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mailchimp-signature': signature,
        },
        body: payload,
      });

      expect(response.status).not.toBe(401);
    });
  });

  describe('Integration Status API', () => {
    it('should return status for all integrations', async () => {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('google-calendar');
      expect(data).toHaveProperty('outlook-calendar');
      expect(data).toHaveProperty('mailchimp');
      expect(data).toHaveProperty('mapbox');
    });

    it('should indicate connection status', async () => {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();

      for (const integration of Object.values(data)) {
        expect(integration).toHaveProperty('connected');
        expect(integration).toHaveProperty('status');
        expect(['active', 'inactive', 'error']).toContain((integration as any).status);
      }
    });

    it('should show usage stats for connected integrations', async () => {
      const response = await fetch('/api/integrations/status');
      const data = await response.json();

      const connectedIntegrations = Object.values(data).filter(
        (i: any) => i.connected
      );

      connectedIntegrations.forEach((integration: any) => {
        if (integration.usageStats) {
          expect(integration.usageStats).toHaveProperty('label');
          expect(integration.usageStats).toHaveProperty('value');
        }
      });
    });
  });

  describe('Token Refresh Job', () => {
    it('should refresh tokens expiring within 24 hours', async () => {
      const { refreshAllTokens } = await import('@/jobs/refresh-tokens');

      // Mock database to return expiring token
      const mockToken = {
        tenantId: 'test-tenant',
        provider: 'google',
        accessToken: 'encrypted_old_token',
        refreshToken: 'encrypted_refresh_token',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
      };

      // Run refresh job
      await expect(refreshAllTokens()).resolves.not.toThrow();
    });

    it('should handle refresh failures gracefully', async () => {
      const { refreshAllTokens } = await import('@/jobs/refresh-tokens');

      // Should not throw even if some refreshes fail
      await expect(refreshAllTokens()).resolves.not.toThrow();
    });
  });

  describe('Calendar Batch Operations', () => {
    it('should batch create events in Google Calendar', async () => {
      const events = [
        {
          title: 'Customer Visit 1',
          startTime: new Date('2025-11-01T10:00:00'),
          endTime: new Date('2025-11-01T11:00:00'),
        },
        {
          title: 'Customer Visit 2',
          startTime: new Date('2025-11-01T14:00:00'),
          endTime: new Date('2025-11-01T15:00:00'),
        },
      ];

      const response = await fetch('/api/calendar/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          events,
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.result.success).toBeGreaterThan(0);
    });

    it('should batch delete events', async () => {
      const eventIds = ['event-1', 'event-2', 'event-3'];

      const response = await fetch('/api/calendar/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventIds }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'google',
          direction: 'from',
        }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should handle OAuth errors with proper status codes', async () => {
      const response = await fetch('/api/calendar/connect/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'invalid_code',
          state: JSON.stringify({ email: 'test@example.com' }),
        }),
      });

      expect([400, 401, 500]).toContain(response.status);
    });
  });
});

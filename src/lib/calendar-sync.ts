import { google, calendar_v3 } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/msal-node';
import prisma from '@/lib/prisma';
import { encryptToken, decryptToken, isEncrypted } from '@/lib/token-encryption';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  provider: 'google' | 'outlook';
  externalId: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  errors: string[];
  created: number;
  updated: number;
  deleted: number;
  duration?: number;
}

export interface CalendarProvider {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  provider: 'google' | 'outlook';
}

export interface SyncMetrics {
  lastSuccessfulSync?: Date;
  consecutiveFailures: number;
  eventsSynced: number;
  syncDuration: number;
  lastError?: string;
}

export interface CalendarSyncStatus {
  id: string;
  provider: 'google' | 'outlook';
  isActive: boolean;
  lastSync?: Date;
  lastError?: string;
  consecutiveFailures: number;
  metrics: SyncMetrics;
}

// Error categorization
export enum ErrorCategory {
  TRANSIENT = 'transient', // Retry with backoff
  AUTH = 'auth', // Need re-authentication
  PERMANENT = 'permanent', // Disable sync
  RATE_LIMIT = 'rate_limit', // Backoff and retry
}

export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  shouldRetry: boolean;
  shouldDisableSync: boolean;
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

class CalendarSyncError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory,
    public provider: 'google' | 'outlook',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'CalendarSyncError';
  }
}

/**
 * Categorize errors for appropriate handling
 */
function categorizeError(error: any, provider: 'google' | 'outlook'): CategorizedError {
  const errorMessage = error?.message || String(error);
  const statusCode = error?.response?.status || error?.statusCode || error?.code;

  // Rate limiting
  if (statusCode === 429 || errorMessage.includes('rate limit')) {
    return {
      category: ErrorCategory.RATE_LIMIT,
      message: 'Rate limit exceeded',
      shouldRetry: true,
      shouldDisableSync: false,
    };
  }

  // Authentication errors
  if (
    statusCode === 401 ||
    statusCode === 403 ||
    errorMessage.includes('invalid token') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid_grant')
  ) {
    return {
      category: ErrorCategory.AUTH,
      message: 'Authentication failed - token may be expired or revoked',
      shouldRetry: false,
      shouldDisableSync: true,
    };
  }

  // Transient errors (network, 5xx, timeouts)
  if (
    statusCode >= 500 ||
    errorMessage.includes('ECONNRESET') ||
    errorMessage.includes('ETIMEDOUT') ||
    errorMessage.includes('network')
  ) {
    return {
      category: ErrorCategory.TRANSIENT,
      message: 'Temporary network or server error',
      shouldRetry: true,
      shouldDisableSync: false,
    };
  }

  // Permanent errors (invalid calendar, permissions revoked, etc.)
  if (
    statusCode === 404 ||
    errorMessage.includes('not found') ||
    errorMessage.includes('calendar deleted') ||
    errorMessage.includes('permissions')
  ) {
    return {
      category: ErrorCategory.PERMANENT,
      message: 'Calendar no longer accessible',
      shouldRetry: false,
      shouldDisableSync: true,
    };
  }

  // Default to transient for unknown errors
  return {
    category: ErrorCategory.TRANSIENT,
    message: errorMessage || 'Unknown error',
    shouldRetry: true,
    shouldDisableSync: false,
  };
}

/**
 * Exponential backoff with jitter
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoff(attemptNumber: number, baseDelay: number = 1000): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), 60000);
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return exponentialDelay + jitter;
}

/**
 * Retry operation with exponential backoff
 */
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const categorized = categorizeError(error, 'google'); // Provider doesn't matter for retry logic

      // Don't retry auth or permanent errors
      if (!categorized.shouldRetry) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }

      const delay = calculateBackoff(attempt, baseDelay);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 minutes before expiry

/**
 * Check if token needs refresh (expires within buffer period)
 */
function shouldRefreshToken(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return expiresAt.getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Ensure token is valid, refreshing proactively if needed
 */
async function ensureValidToken(
  tenantId: string,
  provider: 'google' | 'outlook',
  token: any
): Promise<string> {
  // Decrypt token first (with backward compatibility)
  const accessToken = isEncrypted(token.accessToken)
    ? await decryptToken(token.accessToken)
    : token.accessToken;

  const refreshToken = token.refreshToken
    ? isEncrypted(token.refreshToken)
      ? await decryptToken(token.refreshToken)
      : token.refreshToken
    : null;

  // Check if token needs refresh
  if (shouldRefreshToken(token.expiresAt)) {
    console.log(`Proactively refreshing ${provider} token for tenant ${tenantId}`);

    try {
      const client = provider === 'google'
        ? new GoogleCalendarClient('', refreshToken!)
        : new OutlookCalendarClient('');

      const refreshed = await retryWithBackoff(
        () => provider === 'google'
          ? (client as GoogleCalendarClient).refreshAccessToken()
          : (client as OutlookCalendarClient).refreshAccessToken(refreshToken!),
        2, // Max retries for token refresh
        500 // Shorter base delay
      );

      // Encrypt and update token in database
      const encryptedAccessToken = await encryptToken(refreshed.accessToken);
      await prisma.integrationToken.update({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
        data: {
          accessToken: encryptedAccessToken,
          expiresAt: refreshed.expiresAt,
        },
      });

      return refreshed.accessToken;
    } catch (error) {
      console.error(`Failed to refresh ${provider} token:`, error);
      throw new CalendarSyncError(
        'Token refresh failed',
        ErrorCategory.AUTH,
        provider,
        error
      );
    }
  }

  return accessToken;
}

// ============================================================================
// GOOGLE CALENDAR CLIENT
// ============================================================================

export class GoogleCalendarClient {
  private oauth2Client: any;
  private calendar: calendar_v3.Calendar;

  constructor(accessToken: string, refreshToken: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Refresh access token if expired
   */
  async refreshAccessToken(): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      return {
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
      };
    } catch (error) {
      console.error('Error refreshing Google access token:', error);
      throw new CalendarSyncError(
        'Failed to refresh Google access token',
        ErrorCategory.AUTH,
        'google',
        error
      );
    }
  }

  /**
   * List calendar events using delta sync (incremental)
   */
  async listEventsDelta(
    syncToken?: string,
    calendarId: string = 'primary'
  ): Promise<{
    events: CalendarEvent[];
    nextSyncToken: string;
    deletedEvents: string[];
  }> {
    try {
      const params: any = {
        calendarId,
        maxResults: 250,
        showDeleted: true, // Include deleted events for delta sync
      };

      // Use sync token for incremental sync, or set time range for full sync
      if (syncToken) {
        params.syncToken = syncToken;
      } else {
        params.timeMin = new Date().toISOString();
        params.timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        params.singleEvents = true;
        params.orderBy = 'startTime';
      }

      const response = await retryWithBackoff(() => this.calendar.events.list(params));

      const items = response.data.items || [];
      const deletedEvents: string[] = [];
      const activeEvents: CalendarEvent[] = [];

      items.forEach((event) => {
        if (event.status === 'cancelled') {
          deletedEvents.push(event.id!);
        } else {
          activeEvents.push({
            id: event.id!,
            title: event.summary || 'Untitled Event',
            description: event.description,
            startTime: new Date(event.start?.dateTime || event.start?.date!),
            endTime: new Date(event.end?.dateTime || event.end?.date!),
            location: event.location,
            attendees: event.attendees?.map((a) => a.email!).filter(Boolean),
            provider: 'google' as const,
            externalId: event.id!,
          });
        }
      });

      return {
        events: activeEvents,
        nextSyncToken: response.data.nextSyncToken || '',
        deletedEvents,
      };
    } catch (error: any) {
      // Handle sync token invalidation (410 Gone)
      if (error?.response?.status === 410) {
        console.log('Sync token expired, performing full sync');
        return this.listEventsDelta(undefined, calendarId);
      }
      throw error;
    }
  }

  /**
   * List calendar events within a date range (legacy method)
   */
  async listEvents(
    calendarId: string = 'primary',
    timeMin?: Date,
    timeMax?: Date
  ): Promise<CalendarEvent[]> {
    try {
      const response = await retryWithBackoff(() =>
        this.calendar.events.list({
          calendarId,
          timeMin: timeMin?.toISOString() || new Date().toISOString(),
          timeMax: timeMax?.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        })
      );

      const events = response.data.items || [];

      return events.map((event) => ({
        id: event.id!,
        title: event.summary || 'Untitled Event',
        description: event.description,
        startTime: new Date(event.start?.dateTime || event.start?.date!),
        endTime: new Date(event.end?.dateTime || event.end?.date!),
        location: event.location,
        attendees: event.attendees?.map((a) => a.email!).filter(Boolean),
        provider: 'google' as const,
        externalId: event.id!,
      }));
    } catch (error) {
      console.error('Error listing Google Calendar events:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: Omit<CalendarEvent, 'id' | 'provider' | 'externalId'>): Promise<string> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: {
            dateTime: event.startTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endTime.toISOString(),
            timeZone: 'UTC',
          },
          attendees: event.attendees?.map(email => ({ email })),
        },
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    event: Partial<Omit<CalendarEvent, 'id' | 'provider' | 'externalId'>>
  ): Promise<void> {
    try {
      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        requestBody: {
          summary: event.title,
          description: event.description,
          location: event.location,
          start: event.startTime ? {
            dateTime: event.startTime.toISOString(),
            timeZone: 'UTC',
          } : undefined,
          end: event.endTime ? {
            dateTime: event.endTime.toISOString(),
            timeZone: 'UTC',
          } : undefined,
          attendees: event.attendees?.map(email => ({ email })),
        },
      });
    } catch (error) {
      console.error('Error updating Google Calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error) {
      console.error('Error deleting Google Calendar event:', error);
      throw error;
    }
  }
}

// ============================================================================
// OUTLOOK CALENDAR CLIENT
// ============================================================================

export class OutlookCalendarClient {
  private client: Client;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;

  constructor(accessToken: string) {
    this.tenantId = process.env.OUTLOOK_TENANT_ID!;
    this.clientId = process.env.OUTLOOK_CLIENT_ID!;
    this.clientSecret = process.env.OUTLOOK_CLIENT_SECRET!;

    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Refresh access token using client credentials
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    try {
      const credential = new ClientSecretCredential(
        this.tenantId,
        this.clientId,
        this.clientSecret
      );

      const tokenResponse = await credential.getToken('https://graph.microsoft.com/.default');

      return {
        accessToken: tokenResponse.token,
        expiresAt: tokenResponse.expiresOnTimestamp
          ? new Date(tokenResponse.expiresOnTimestamp)
          : new Date(Date.now() + 3600 * 1000),
      };
    } catch (error) {
      console.error('Error refreshing Outlook access token:', error);
      throw new CalendarSyncError(
        'Failed to refresh Outlook access token',
        ErrorCategory.AUTH,
        'outlook',
        error
      );
    }
  }

  /**
   * List calendar events using delta query (incremental)
   */
  async listEventsDelta(deltaLink?: string): Promise<{
    events: CalendarEvent[];
    nextDeltaLink: string;
    deletedEvents: string[];
  }> {
    try {
      const url = deltaLink || '/me/calendar/events/delta';

      const response = await retryWithBackoff(() => this.client.api(url).get());

      const items = response.value || [];
      const deletedEvents: string[] = [];
      const activeEvents: CalendarEvent[] = [];

      items.forEach((event: any) => {
        // Check if event is deleted
        if (event['@removed']) {
          deletedEvents.push(event.id);
        } else {
          activeEvents.push({
            id: event.id,
            title: event.subject || 'Untitled Event',
            description: event.bodyPreview,
            startTime: new Date(event.start.dateTime),
            endTime: new Date(event.end.dateTime),
            location: event.location?.displayName,
            attendees: event.attendees?.map((a: any) => a.emailAddress.address),
            provider: 'outlook' as const,
            externalId: event.id,
          });
        }
      });

      return {
        events: activeEvents,
        nextDeltaLink: response['@odata.deltaLink'] || '',
        deletedEvents,
      };
    } catch (error) {
      console.error('Error with Outlook delta query:', error);
      throw error;
    }
  }

  /**
   * List calendar events within a date range (legacy method)
   */
  async listEvents(timeMin?: Date, timeMax?: Date): Promise<CalendarEvent[]> {
    try {
      let query = '/me/calendar/events?$orderby=start/dateTime';

      if (timeMin) {
        query += `&$filter=start/dateTime ge '${timeMin.toISOString()}'`;
      }
      if (timeMax) {
        query += timeMin
          ? ` and end/dateTime le '${timeMax.toISOString()}'`
          : `&$filter=end/dateTime le '${timeMax.toISOString()}'`;
      }

      const response = await retryWithBackoff(() => this.client.api(query).top(250).get());

      return response.value.map((event: any) => ({
        id: event.id,
        title: event.subject || 'Untitled Event',
        description: event.bodyPreview,
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        location: event.location?.displayName,
        attendees: event.attendees?.map((a: any) => a.emailAddress.address),
        provider: 'outlook' as const,
        externalId: event.id,
      }));
    } catch (error) {
      console.error('Error listing Outlook Calendar events:', error);
      throw error;
    }
  }

  /**
   * Create a new calendar event
   */
  async createEvent(event: Omit<CalendarEvent, 'id' | 'provider' | 'externalId'>): Promise<string> {
    try {
      const response = await this.client.api('/me/calendar/events').post({
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description || '',
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC',
        },
        location: {
          displayName: event.location || '',
        },
        attendees: event.attendees?.map(email => ({
          emailAddress: { address: email },
          type: 'required',
        })),
      });

      return response.id;
    } catch (error) {
      console.error('Error creating Outlook Calendar event:', error);
      throw error;
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(
    eventId: string,
    event: Partial<Omit<CalendarEvent, 'id' | 'provider' | 'externalId'>>
  ): Promise<void> {
    try {
      const updateData: any = {};

      if (event.title) updateData.subject = event.title;
      if (event.description !== undefined) {
        updateData.body = {
          contentType: 'text',
          content: event.description,
        };
      }
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC',
        };
      }
      if (event.location !== undefined) {
        updateData.location = { displayName: event.location };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map(email => ({
          emailAddress: { address: email },
          type: 'required',
        }));
      }

      await this.client.api(`/me/calendar/events/${eventId}`).patch(updateData);
    } catch (error) {
      console.error('Error updating Outlook Calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.client.api(`/me/calendar/events/${eventId}`).delete();
    } catch (error) {
      console.error('Error deleting Outlook Calendar event:', error);
      throw error;
    }
  }
}

// ============================================================================
// CALENDAR SYNC SERVICE
// ============================================================================

const MAX_CONSECUTIVE_FAILURES = 5;

export class CalendarSyncService {
  /**
   * Sync events from external calendar using delta queries (primary method)
   */
  async syncFromProvider(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<SyncResult> {
    // Use delta sync by default for better performance
    return this.syncFromProviderDelta(tenantId, userId, provider);
  }

  /**
   * Sync events from external calendar using delta queries
   */
  async syncFromProviderDelta(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: [],
      created: 0,
      updated: 0,
      deleted: 0,
    };

    try {
      // Get integration token
      const token = await prisma.integrationToken.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
      });

      if (!token) {
        throw new CalendarSyncError(
          `No ${provider} integration found`,
          ErrorCategory.PERMANENT,
          provider
        );
      }

      // Ensure token is valid (proactive refresh)
      const accessToken = await ensureValidToken(tenantId, provider, token);
      const refreshToken = token.refreshToken
        ? isEncrypted(token.refreshToken)
          ? await decryptToken(token.refreshToken)
          : token.refreshToken
        : null;

      // Get sync metadata (contains delta tokens)
      const syncMeta = await prisma.calendarSyncMetadata.findUnique({
        where: {
          tenantId_userId_provider: {
            tenantId,
            userId,
            provider,
          },
        },
      });

      // Get events using delta query
      const client =
        provider === 'google'
          ? new GoogleCalendarClient(accessToken, refreshToken!)
          : new OutlookCalendarClient(accessToken);

      let deltaResult;
      if (provider === 'google') {
        deltaResult = await (client as GoogleCalendarClient).listEventsDelta(
          syncMeta?.syncToken || undefined
        );
      } else {
        deltaResult = await (client as OutlookCalendarClient).listEventsDelta(
          syncMeta?.deltaLink || undefined
        );
      }

      // Process deleted events
      for (const externalId of deltaResult.deletedEvents) {
        try {
          const deleted = await prisma.calendarEvent.deleteMany({
            where: {
              tenantId,
              userId,
              // We'd need to store externalId to match properly
            },
          });
          result.deleted += deleted.count;
        } catch (error) {
          result.errors.push(`Failed to delete event ${externalId}: ${error}`);
        }
      }

      // Process active events
      const existingEvents = await prisma.calendarEvent.findMany({
        where: {
          tenantId,
          userId,
        },
      });

      const existingEventMap = new Map(existingEvents.map((e) => [e.title + e.startTime.toISOString(), e]));

      for (const extEvent of deltaResult.events) {
        try {
          const key = extEvent.title + extEvent.startTime.toISOString();
          const existing = existingEventMap.get(key);

          if (existing) {
            // Update existing event
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: extEvent.title,
                description: extEvent.description,
                startTime: extEvent.startTime,
                endTime: extEvent.endTime,
                location: extEvent.location,
              },
            });
            result.updated++;
          } else {
            // Create new event
            await prisma.calendarEvent.create({
              data: {
                tenantId,
                userId,
                title: extEvent.title,
                description: extEvent.description,
                startTime: extEvent.startTime,
                endTime: extEvent.endTime,
                location: extEvent.location,
              },
            });
            result.created++;
          }

          result.synced++;
        } catch (error) {
          result.errors.push(`Failed to sync event ${extEvent.title}: ${error}`);
        }
      }

      // Update sync metadata with new delta token
      await prisma.calendarSyncMetadata.upsert({
        where: {
          tenantId_userId_provider: {
            tenantId,
            userId,
            provider,
          },
        },
        create: {
          tenantId,
          userId,
          provider,
          syncToken: provider === 'google' ? deltaResult.nextSyncToken : null,
          deltaLink: provider === 'outlook' ? deltaResult.nextDeltaLink : null,
          lastSuccessfulSync: new Date(),
          consecutiveFailures: 0,
          eventsSynced: result.synced,
          syncDuration: Date.now() - startTime,
          isActive: true,
        },
        update: {
          syncToken: provider === 'google' ? deltaResult.nextSyncToken : null,
          deltaLink: provider === 'outlook' ? deltaResult.nextDeltaLink : null,
          lastSuccessfulSync: new Date(),
          consecutiveFailures: 0,
          eventsSynced: result.synced,
          syncDuration: Date.now() - startTime,
          lastError: null,
        },
      });

      result.duration = Date.now() - startTime;
      return result;
    } catch (error: any) {
      const categorized = categorizeError(error, provider);
      result.success = false;
      result.errors.push(categorized.message);
      result.duration = Date.now() - startTime;

      // Record failure
      await this.recordSyncFailure(tenantId, userId, provider, categorized);

      return result;
    }
  }

  /**
   * Record sync failure and potentially disable sync
   */
  private async recordSyncFailure(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook',
    error: CategorizedError
  ): Promise<void> {
    const syncMeta = await prisma.calendarSyncMetadata.findUnique({
      where: {
        tenantId_userId_provider: {
          tenantId,
          userId,
          provider,
        },
      },
    });

    const consecutiveFailures = (syncMeta?.consecutiveFailures || 0) + 1;
    const shouldDisable =
      error.shouldDisableSync || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;

    await prisma.calendarSyncMetadata.upsert({
      where: {
        tenantId_userId_provider: {
          tenantId,
          userId,
          provider,
        },
      },
      create: {
        tenantId,
        userId,
        provider,
        consecutiveFailures,
        lastError: error.message,
        isActive: !shouldDisable,
      },
      update: {
        consecutiveFailures,
        lastError: error.message,
        isActive: !shouldDisable,
      },
    });

    if (shouldDisable) {
      console.error(
        `Disabled ${provider} sync for tenant ${tenantId} after ${consecutiveFailures} failures`
      );
      // TODO: Send notification to user about disabled sync
    }
  }

  /**
   * Get sync status for all calendars
   */
  async getSyncStatus(tenantId: string, userId: string): Promise<CalendarSyncStatus[]> {
    const syncMetas = await prisma.calendarSyncMetadata.findMany({
      where: {
        tenantId,
        userId,
      },
    });

    return syncMetas.map((meta) => ({
      id: `${meta.tenantId}-${meta.userId}-${meta.provider}`,
      provider: meta.provider as 'google' | 'outlook',
      isActive: meta.isActive,
      lastSync: meta.lastSuccessfulSync || undefined,
      lastError: meta.lastError || undefined,
      consecutiveFailures: meta.consecutiveFailures,
      metrics: {
        lastSuccessfulSync: meta.lastSuccessfulSync || undefined,
        consecutiveFailures: meta.consecutiveFailures,
        eventsSynced: meta.eventsSynced,
        syncDuration: meta.syncDuration,
        lastError: meta.lastError || undefined,
      },
    }));
  }

  /**
   * Manually trigger resync (clears delta tokens for full sync)
   */
  async triggerFullResync(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<SyncResult> {
    // Clear delta tokens to force full sync
    await prisma.calendarSyncMetadata.updateMany({
      where: {
        tenantId,
        userId,
        provider,
      },
      data: {
        syncToken: null,
        deltaLink: null,
      },
    });

    return this.syncFromProviderDelta(tenantId, userId, provider);
  }

  /**
   * Re-enable disabled sync
   */
  async enableSync(tenantId: string, userId: string, provider: 'google' | 'outlook'): Promise<void> {
    await prisma.calendarSyncMetadata.updateMany({
      where: {
        tenantId,
        userId,
        provider,
      },
      data: {
        isActive: true,
        consecutiveFailures: 0,
        lastError: null,
      },
    });
  }

  /**
   * Legacy sync from provider (for backward compatibility)
   */
  async syncFromProviderLegacy(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: [],
      created: 0,
      updated: 0,
      deleted: 0,
    };

    try {
      // Get integration token
      const token = await prisma.integrationToken.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
      });

      if (!token) {
        throw new Error(`No ${provider} integration found for this user`);
      }

      // Decrypt tokens (with backward compatibility for plaintext)
      const accessToken = isEncrypted(token.accessToken)
        ? await decryptToken(token.accessToken)
        : token.accessToken;

      const refreshToken = token.refreshToken
        ? isEncrypted(token.refreshToken)
          ? await decryptToken(token.refreshToken)
          : token.refreshToken
        : null;

      // Check if token needs refresh
      let currentAccessToken = accessToken;
      if (token.expiresAt && token.expiresAt < new Date()) {
        const refreshed = await this.refreshToken(tenantId, provider, refreshToken!);
        currentAccessToken = refreshed.accessToken;
      }

      // Get events from provider
      const client = provider === 'google'
        ? new GoogleCalendarClient(currentAccessToken, refreshToken!)
        : new OutlookCalendarClient(currentAccessToken);

      const externalEvents = await client.listEvents(
        new Date(), // From now
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // Next 90 days
      );

      // Get existing events from database
      const existingEvents = await prisma.calendarEvent.findMany({
        where: {
          tenantId,
          userId,
        },
      });

      const existingEventMap = new Map(
        existingEvents.map(e => [e.id, e])
      );

      // Sync each external event
      for (const extEvent of externalEvents) {
        try {
          const existing = Array.from(existingEventMap.values()).find(
            e => e.title === extEvent.title &&
                 Math.abs(e.startTime.getTime() - extEvent.startTime.getTime()) < 60000
          );

          if (existing) {
            // Update existing event
            await prisma.calendarEvent.update({
              where: { id: existing.id },
              data: {
                title: extEvent.title,
                description: extEvent.description,
                startTime: extEvent.startTime,
                endTime: extEvent.endTime,
                location: extEvent.location,
              },
            });
            result.updated++;
            existingEventMap.delete(existing.id);
          } else {
            // Create new event
            await prisma.calendarEvent.create({
              data: {
                tenantId,
                userId,
                title: extEvent.title,
                description: extEvent.description,
                startTime: extEvent.startTime,
                endTime: extEvent.endTime,
                location: extEvent.location,
              },
            });
            result.created++;
          }

          result.synced++;
        } catch (error) {
          result.errors.push(`Failed to sync event ${extEvent.title}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      return result;
    }
  }

  /**
   * Sync events from local database to external calendar
   */
  async syncToProvider(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      errors: [],
      created: 0,
      updated: 0,
      deleted: 0,
    };

    try {
      // Get integration token
      const token = await prisma.integrationToken.findUnique({
        where: {
          tenantId_provider: {
            tenantId,
            provider,
          },
        },
      });

      if (!token) {
        throw new Error(`No ${provider} integration found for this user`);
      }

      // Decrypt tokens (with backward compatibility for plaintext)
      const accessToken = isEncrypted(token.accessToken)
        ? await decryptToken(token.accessToken)
        : token.accessToken;

      const refreshToken = token.refreshToken
        ? isEncrypted(token.refreshToken)
          ? await decryptToken(token.refreshToken)
          : token.refreshToken
        : null;

      // Check if token needs refresh
      let currentAccessToken = accessToken;
      if (token.expiresAt && token.expiresAt < new Date()) {
        const refreshed = await this.refreshToken(tenantId, provider, refreshToken!);
        currentAccessToken = refreshed.accessToken;
      }

      // Get client
      const client = provider === 'google'
        ? new GoogleCalendarClient(currentAccessToken, refreshToken!)
        : new OutlookCalendarClient(currentAccessToken);

      // Get local events
      const localEvents = await prisma.calendarEvent.findMany({
        where: {
          tenantId,
          userId,
          startTime: {
            gte: new Date(),
          },
        },
      });

      // Get external events to compare
      const externalEvents = await client.listEvents(new Date());
      const externalEventMap = new Map(
        externalEvents.map(e => [e.title + e.startTime.toISOString(), e])
      );

      // Sync each local event
      for (const localEvent of localEvents) {
        try {
          const key = localEvent.title + localEvent.startTime.toISOString();
          const externalEvent = externalEventMap.get(key);

          const eventData = {
            title: localEvent.title,
            description: localEvent.description || undefined,
            startTime: localEvent.startTime,
            endTime: localEvent.endTime,
            location: localEvent.location || undefined,
          };

          if (externalEvent) {
            // Update existing event
            await client.updateEvent(externalEvent.externalId, eventData);
            result.updated++;
          } else {
            // Create new event
            await client.createEvent(eventData);
            result.created++;
          }

          result.synced++;
        } catch (error) {
          result.errors.push(`Failed to sync event ${localEvent.title}: ${error}`);
        }
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(String(error));
      return result;
    }
  }

  /**
   * Bidirectional sync
   */
  async bidirectionalSync(
    tenantId: string,
    userId: string,
    provider: 'google' | 'outlook'
  ): Promise<{ from: SyncResult; to: SyncResult }> {
    const fromResult = await this.syncFromProvider(tenantId, userId, provider);
    const toResult = await this.syncToProvider(tenantId, userId, provider);

    return {
      from: fromResult,
      to: toResult,
    };
  }

  /**
   * Refresh OAuth token
   */
  private async refreshToken(
    tenantId: string,
    provider: 'google' | 'outlook',
    refreshToken: string
  ): Promise<{ accessToken: string; expiresAt: Date }> {
    let refreshed: { accessToken: string; expiresAt: Date };

    if (provider === 'google') {
      const client = new GoogleCalendarClient('', refreshToken);
      refreshed = await client.refreshAccessToken();
    } else {
      const client = new OutlookCalendarClient('');
      refreshed = await client.refreshAccessToken(refreshToken);
    }

    // Encrypt tokens before storing in database
    const encryptedAccessToken = await encryptToken(refreshed.accessToken);

    // Update token in database
    await prisma.integrationToken.update({
      where: {
        tenantId_provider: {
          tenantId,
          provider,
        },
      },
      data: {
        accessToken: encryptedAccessToken,
        expiresAt: refreshed.expiresAt,
      },
    });

    return refreshed;
  }
}

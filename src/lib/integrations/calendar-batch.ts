/**
 * Calendar Batch Operations
 *
 * Efficiently create, update, and delete multiple calendar events in batches.
 */

import { google, calendar_v3 } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/token-encryption';
import type { CalendarEvent } from '@prisma/client';

interface BatchEventInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  customerId?: string;
  taskId?: string;
}

interface BatchResult {
  success: number;
  failed: number;
  errors: Array<{ event: BatchEventInput; error: string }>;
}

/**
 * Batch create calendar events in Google Calendar
 */
async function batchCreateGoogleEvents(
  tenantId: string,
  userId: string,
  events: BatchEventInput[]
): Promise<BatchResult> {
  const result: BatchResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get token
    const token = await prisma.integrationToken.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'google',
        },
      },
    });

    if (!token) {
      throw new Error('Google Calendar not connected');
    }

    const accessToken = await decryptToken(token.accessToken);

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Google Calendar API supports batch requests via the batch endpoint
    // For simplicity, we'll process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (event) => {
          try {
            const googleEvent: calendar_v3.Schema$Event = {
              summary: event.title,
              description: event.description,
              location: event.location,
              start: {
                dateTime: event.startTime.toISOString(),
                timeZone: 'America/Los_Angeles',
              },
              end: {
                dateTime: event.endTime.toISOString(),
                timeZone: 'America/Los_Angeles',
              },
            };

            const response = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: googleEvent,
            });

            // Store in database
            await prisma.calendarEvent.create({
              data: {
                tenantId,
                userId,
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                provider: 'google',
                externalId: response.data.id || '',
                customerId: event.customerId,
                taskId: event.taskId,
              },
            });

            result.success++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              event,
              error: String(error),
            });
          }
        })
      );
    }
  } catch (error) {
    console.error('Batch create Google events failed:', error);
    throw error;
  }

  return result;
}

/**
 * Batch create calendar events in Outlook Calendar
 */
async function batchCreateOutlookEvents(
  tenantId: string,
  userId: string,
  events: BatchEventInput[]
): Promise<BatchResult> {
  const result: BatchResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get token
    const token = await prisma.integrationToken.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: 'outlook',
        },
      },
    });

    if (!token) {
      throw new Error('Outlook Calendar not connected');
    }

    const accessToken = await decryptToken(token.accessToken);

    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    // Microsoft Graph API supports batch requests (up to 20 per batch)
    const batchSize = 20;
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);

      // Build batch request
      const batchRequest: any = {
        requests: batch.map((event, index) => ({
          id: String(index),
          method: 'POST',
          url: '/me/events',
          body: {
            subject: event.title,
            body: {
              contentType: 'text',
              content: event.description || '',
            },
            start: {
              dateTime: event.startTime.toISOString(),
              timeZone: 'Pacific Standard Time',
            },
            end: {
              dateTime: event.endTime.toISOString(),
              timeZone: 'Pacific Standard Time',
            },
            location: {
              displayName: event.location || '',
            },
          },
        })),
      };

      try {
        const response = await client.api('/$batch').post(batchRequest);

        // Process responses
        for (let j = 0; j < response.responses.length; j++) {
          const res = response.responses[j];
          const event = batch[j];

          if (res.status >= 200 && res.status < 300) {
            // Store in database
            await prisma.calendarEvent.create({
              data: {
                tenantId,
                userId,
                title: event.title,
                description: event.description,
                startTime: event.startTime,
                endTime: event.endTime,
                location: event.location,
                provider: 'outlook',
                externalId: res.body.id,
                customerId: event.customerId,
                taskId: event.taskId,
              },
            });

            result.success++;
          } else {
            result.failed++;
            result.errors.push({
              event,
              error: res.body?.error?.message || 'Unknown error',
            });
          }
        }
      } catch (error) {
        console.error('Batch request failed:', error);
        result.failed += batch.length;
        batch.forEach((event) => {
          result.errors.push({
            event,
            error: String(error),
          });
        });
      }
    }
  } catch (error) {
    console.error('Batch create Outlook events failed:', error);
    throw error;
  }

  return result;
}

/**
 * Batch delete calendar events
 */
async function batchDeleteEvents(
  tenantId: string,
  userId: string,
  eventIds: string[]
): Promise<BatchResult> {
  const result: BatchResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get events from database
    const events = await prisma.calendarEvent.findMany({
      where: {
        id: { in: eventIds },
        tenantId,
        userId,
      },
    });

    // Group by provider
    const googleEvents = events.filter((e) => e.provider === 'google');
    const outlookEvents = events.filter((e) => e.provider === 'outlook');

    // Delete from Google Calendar
    if (googleEvents.length > 0) {
      const googleResult = await batchDeleteGoogleEvents(
        tenantId,
        googleEvents.map((e) => e.externalId)
      );
      result.success += googleResult.success;
      result.failed += googleResult.failed;
      result.errors.push(...googleResult.errors);
    }

    // Delete from Outlook Calendar
    if (outlookEvents.length > 0) {
      const outlookResult = await batchDeleteOutlookEvents(
        tenantId,
        outlookEvents.map((e) => e.externalId)
      );
      result.success += outlookResult.success;
      result.failed += outlookResult.failed;
      result.errors.push(...outlookResult.errors);
    }

    // Delete from database
    await prisma.calendarEvent.deleteMany({
      where: {
        id: { in: events.map((e) => e.id) },
      },
    });
  } catch (error) {
    console.error('Batch delete events failed:', error);
    throw error;
  }

  return result;
}

async function batchDeleteGoogleEvents(
  tenantId: string,
  externalIds: string[]
): Promise<BatchResult> {
  const result: BatchResult = { success: 0, failed: 0, errors: [] };

  try {
    const token = await prisma.integrationToken.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'google' },
      },
    });

    if (!token) throw new Error('Google Calendar not connected');

    const accessToken = await decryptToken(token.accessToken);
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await Promise.all(
      externalIds.map(async (externalId) => {
        try {
          await calendar.events.delete({
            calendarId: 'primary',
            eventId: externalId,
          });
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({ event: { externalId } as any, error: String(error) });
        }
      })
    );
  } catch (error) {
    console.error('Google batch delete failed:', error);
    throw error;
  }

  return result;
}

async function batchDeleteOutlookEvents(
  tenantId: string,
  externalIds: string[]
): Promise<BatchResult> {
  const result: BatchResult = { success: 0, failed: 0, errors: [] };

  try {
    const token = await prisma.integrationToken.findUnique({
      where: {
        tenantId_provider: { tenantId, provider: 'outlook' },
      },
    });

    if (!token) throw new Error('Outlook Calendar not connected');

    const accessToken = await decryptToken(token.accessToken);
    const client = Client.init({
      authProvider: (done) => done(null, accessToken),
    });

    // Batch delete (up to 20 per batch)
    const batchSize = 20;
    for (let i = 0; i < externalIds.length; i += batchSize) {
      const batch = externalIds.slice(i, i + batchSize);

      const batchRequest: any = {
        requests: batch.map((externalId, index) => ({
          id: String(index),
          method: 'DELETE',
          url: `/me/events/${externalId}`,
        })),
      };

      const response = await client.api('/$batch').post(batchRequest);

      for (const res of response.responses) {
        if (res.status >= 200 && res.status < 300) {
          result.success++;
        } else {
          result.failed++;
          result.errors.push({
            event: { externalId: batch[parseInt(res.id)] } as any,
            error: res.body?.error?.message || 'Unknown error',
          });
        }
      }
    }
  } catch (error) {
    console.error('Outlook batch delete failed:', error);
    throw error;
  }

  return result;
}

export {
  batchCreateGoogleEvents,
  batchCreateOutlookEvents,
  batchDeleteEvents,
  type BatchEventInput,
  type BatchResult,
};

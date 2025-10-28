/**
 * Mock: Google Calendar API
 * Provides mock implementation for testing calendar sync
 */

export class MockGoogleCalendar {
  private events: Map<string, any> = new Map();
  private nextEventId = 1;

  events = {
    insert: async (params: any) => {
      const eventId = `google-event-${this.nextEventId++}`;
      const event = {
        id: eventId,
        summary: params.requestBody.summary,
        description: params.requestBody.description,
        start: params.requestBody.start,
        end: params.requestBody.end,
        reminders: params.requestBody.reminders,
        htmlLink: `https://calendar.google.com/calendar/event?eid=${eventId}`,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      };

      this.events.set(eventId, event);
      return { data: event };
    },

    update: async (params: any) => {
      const event = this.events.get(params.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const updated = {
        ...event,
        ...params.requestBody,
        updated: new Date().toISOString(),
      };

      this.events.set(params.eventId, updated);
      return { data: updated };
    },

    delete: async (params: any) => {
      const event = this.events.get(params.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      this.events.delete(params.eventId);
      return {};
    },

    get: async (params: any) => {
      const event = this.events.get(params.eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      return { data: event };
    },

    list: async (params: any) => {
      const events = Array.from(this.events.values());
      return {
        data: {
          items: events,
          nextPageToken: null,
        },
      };
    },
  };

  reset() {
    this.events.clear();
    this.nextEventId = 1;
  }

  getEvent(eventId: string) {
    return this.events.get(eventId);
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }
}

export class MockGoogleAuth {
  private credentials: any = {};

  setCredentials(credentials: any) {
    this.credentials = credentials;
  }

  async refreshAccessToken() {
    return {
      credentials: {
        access_token: 'refreshed-access-token',
        expiry_date: Date.now() + 3600000, // 1 hour
      },
    };
  }

  getAccessToken() {
    return {
      token: this.credentials.access_token,
    };
  }
}

export function createMockGoogleCalendar() {
  return new MockGoogleCalendar();
}

export function createMockGoogleAuth() {
  return new MockGoogleAuth();
}

/**
 * Mock: Microsoft Graph API (Outlook)
 * Provides mock implementation for testing Outlook calendar sync
 */

export class MockOutlookGraphClient {
  private events: Map<string, any> = new Map();
  private nextEventId = 1;
  private currentPath = '';

  api(path: string) {
    this.currentPath = path;
    return this;
  }

  async post(data: any) {
    const eventId = `outlook-event-${this.nextEventId++}`;
    const event = {
      id: eventId,
      subject: data.subject,
      body: data.body,
      start: data.start,
      end: data.end,
      isAllDay: data.isAllDay,
      categories: data.categories,
      webLink: `https://outlook.office.com/calendar/view/week/${eventId}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: new Date().toISOString(),
    };

    this.events.set(eventId, event);
    return event;
  }

  async patch(data: any) {
    const eventId = this.extractEventIdFromPath();
    const event = this.events.get(eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    const updated = {
      ...event,
      ...data,
      lastModifiedDateTime: new Date().toISOString(),
    };

    this.events.set(eventId, updated);
    return updated;
  }

  async delete() {
    const eventId = this.extractEventIdFromPath();
    const event = this.events.get(eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    this.events.delete(eventId);
    return {};
  }

  async get() {
    const eventId = this.extractEventIdFromPath();

    if (eventId) {
      const event = this.events.get(eventId);
      if (!event) {
        throw new Error('Event not found');
      }
      return event;
    }

    // List all events
    return {
      value: Array.from(this.events.values()),
    };
  }

  private extractEventIdFromPath(): string {
    const match = this.currentPath.match(/\/me\/events\/([^/]+)/);
    return match ? match[1] : '';
  }

  reset() {
    this.events.clear();
    this.nextEventId = 1;
    this.currentPath = '';
  }

  getEvent(eventId: string) {
    return this.events.get(eventId);
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }
}

export function createMockOutlookClient() {
  return new MockOutlookGraphClient();
}

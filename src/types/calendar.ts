import { z } from "zod";

// ============================================================================
// CALENDAR EVENT TYPES
// ============================================================================

export const createCalendarEventSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  eventType: z.enum(["tasting", "visit", "meeting", "call"]).optional(),
  customerId: z.string().uuid().optional(),
  location: z.string().max(500).optional(),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  eventType: z.enum(["tasting", "visit", "meeting", "call"]).optional(),
  customerId: z.string().uuid().optional(),
  location: z.string().max(500).optional(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

// Response Types
export interface CalendarEvent {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  eventType: string | null;
  customerId: string | null;
  location: string | null;
  createdAt: string;
  // Related data from joins
  customerName?: string;
  accountNumber?: string;
}

export interface CalendarEventWithCustomer extends CalendarEvent {
  customer?: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string | null;
  };
}

// Drag and Drop Types
export interface DraggableAccountData {
  id: string;
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  accountType: string | null;
  priority: string;
  objective: string | null;
  lastOrderDate: string | null;
  location: string | null;
  isScheduled?: boolean;
  scheduledEventId?: string;
}

export interface DropResult {
  start: Date;
  end: Date;
  allDay: boolean;
}

// Calendar Filter Types
export interface CalendarFilters {
  showScheduled: boolean;
  showUnscheduled: boolean;
  eventTypes: string[];
  priorities: string[];
  accountTypes: string[];
}

// FullCalendar Event Extension
export interface FullCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    eventType?: string;
    customerId?: string;
    customerName?: string;
    accountNumber?: string;
    description?: string;
    location?: string;
  };
}

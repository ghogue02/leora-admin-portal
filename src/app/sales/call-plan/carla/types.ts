import type { DraggableAccountData } from "@/types/calendar";

export type ContactOutcome =
  | "NOT_ATTEMPTED"
  | "LEFT_MESSAGE"
  | "SPOKE_WITH_CONTACT"
  | "IN_PERSON_VISIT"
  | "EMAIL_SENT"
  | "YES"
  | "NO"
  | null;

export type CarlaScheduleCustomer = {
  id: string;
  name: string;
  accountNumber: string | null;
  territory: string | null;
  city: string | null;
  state: string | null;
  priority: string | null;
  accountType: string | null;
  lastOrderDate: string | null;
};

export type CarlaScheduleEvent = {
  id: string;
  customerId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  googleEventId?: string | null;
  outlookEventId?: string | null;
  customer: CarlaScheduleCustomer;
};

export type CarlaTerritoryBlock = {
  id: string;
  territory: string;
  dayOfWeek: number;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

export type CarlaUnscheduledAccount = {
  callPlanAccountId: string;
  customerId: string;
  customerName: string;
  accountNumber: string | null;
  territory: string | null;
  city: string | null;
  state: string | null;
  priority: string | null;
  accountType: string | null;
  objective: string | null;
  lastOrderDate: string | null;
};

export type CarlaScheduleResponse = {
  callPlanId: string;
  schedules: CarlaScheduleEvent[];
  unscheduledAccounts: CarlaUnscheduledAccount[];
  territoryBlocks: CarlaTerritoryBlock[];
};

export type CarlaExternalCalendarEventSource = "google" | "outlook";

export type CarlaExternalCalendarEvent = {
  id: string;
  title?: string | null;
  start: string;
  end: string;
  location?: string | null;
  source: CarlaExternalCalendarEventSource;
  isAllDay?: boolean;
};

export type CarlaCalendarEventsResponse = {
  events?: CarlaExternalCalendarEvent[];
  error?: string;
};

export type CarlaSelectedAccount = {
  id: string;
  name?: string;
  accountNumber?: string | null;
  city?: string | null;
  state?: string | null;
  lastOrderDate?: string | null;
  contactOutcome?: ContactOutcome;
  contactedAt?: string | null;
  objective?: string | null;
  objectives?: string | null;
  notes?: string | null;
  customer?: {
    id: string;
    customerName: string;
    accountNumber?: string | null;
    phone?: string | null;
    lastOrderDate?: string | null;
    annualRevenue?: number | null;
    priority?: "A" | "B" | "C";
    addresses?: Array<{
      address1?: string | null;
      city?: string | null;
      state?: string | null;
      zipCode?: string | null;
    }>;
  };
} & Partial<DraggableAccountData>;

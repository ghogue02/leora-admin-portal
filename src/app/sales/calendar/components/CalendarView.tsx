"use client";

import { useState, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, DateSelectArg, EventClickArg } from "@fullcalendar/core";
import { DraggableAccountData, CalendarEvent } from "@/types/calendar";
import { useToast } from "@/hooks/use-toast";

interface CalendarViewProps {
  events: CalendarEvent[];
  onEventCreate: (start: Date, end: Date, accountData?: DraggableAccountData) => Promise<void>;
  onEventUpdate: (eventId: string, start: Date, end: Date) => Promise<void>;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarView({
  events,
  onEventCreate,
  onEventUpdate,
  onEventClick,
}: CalendarViewProps) {
  const { toast } = useToast();
  const calendarRef = useRef<FullCalendar>(null);
  const [draggedAccount, setDraggedAccount] = useState<DraggableAccountData | null>(null);

  // Convert CalendarEvent to FullCalendar EventInput
  const calendarEvents: EventInput[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    start: new Date(event.startTime),
    end: new Date(event.endTime),
    backgroundColor: getEventColor(event.eventType),
    borderColor: getEventColor(event.eventType),
    extendedProps: {
      eventType: event.eventType,
      customerId: event.customerId,
      customerName: event.customerName,
      accountNumber: event.accountNumber,
      description: event.description,
      location: event.location,
    },
  }));

  // Event color based on type
  function getEventColor(eventType: string | null): string {
    switch (eventType) {
      case "tasting":
        return "#8b5cf6"; // purple
      case "visit":
        return "#3b82f6"; // blue
      case "meeting":
        return "#10b981"; // green
      case "call":
        return "#f59e0b"; // amber
      default:
        return "#6b7280"; // gray
    }
  }

  // Handle external account drop onto calendar
  const handleDrop = useCallback(
    async (info: any) => {
      const accountData = draggedAccount;
      if (!accountData) return;

      const start = info.date;
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

      try {
        await onEventCreate(start, end, accountData);
        toast({
          title: "Event Created",
          description: `Scheduled ${accountData.customerName}`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create event",
          variant: "destructive",
        });
      }
    },
    [draggedAccount, onEventCreate, toast]
  );

  // Handle event resize/move
  const handleEventChange = useCallback(
    async (info: any) => {
      try {
        await onEventUpdate(info.event.id, info.event.start, info.event.end);
        toast({
          title: "Event Updated",
          description: "Event time has been updated",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update event",
          variant: "destructive",
        });
        info.revert();
      }
    },
    [onEventUpdate, toast]
  );

  // Handle event click
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const event = events.find((e) => e.id === info.event.id);
      if (event) {
        onEventClick(event);
      }
    },
    [events, onEventClick]
  );

  // Handle date selection (clicking on empty slot)
  const handleDateSelect = useCallback(
    async (selectInfo: DateSelectArg) => {
      try {
        await onEventCreate(selectInfo.start, selectInfo.end);
        selectInfo.view.calendar.unselect();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create event",
          variant: "destructive",
        });
      }
    },
    [onEventCreate, toast]
  );

  return (
    <div className="h-full bg-white rounded-lg shadow-sm p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
        events={calendarEvents}
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        droppable={true}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        eventClick={handleEventClick}
        select={handleDateSelect}
        drop={handleDrop}
        slotMinTime="08:00:00"
        slotMaxTime="18:00:00"
        allDaySlot={false}
        height="100%"
        eventContent={(arg) => (
          <div className="p-1 overflow-hidden">
            <div className="font-semibold text-xs truncate">{arg.event.title}</div>
            {arg.event.extendedProps.customerName && (
              <div className="text-xs opacity-90 truncate">
                {arg.event.extendedProps.customerName}
              </div>
            )}
            {arg.event.extendedProps.location && (
              <div className="text-xs opacity-75 truncate">
                {arg.event.extendedProps.location}
              </div>
            )}
          </div>
        )}
        eventDidMount={(info) => {
          // Store dragged account data for drop handler
          info.el.addEventListener("dragstart", () => {
            setDraggedAccount(null);
          });
        }}
      />
    </div>
  );
}

// Export helper to set dragged account from parent
export function useDraggedAccount() {
  const [draggedAccount, setDraggedAccount] = useState<DraggableAccountData | null>(null);
  return { draggedAccount, setDraggedAccount };
}

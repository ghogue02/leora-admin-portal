"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarView } from "./components/CalendarView";
import { CallPlanSidebar } from "./components/CallPlanSidebar";
import { DraggableAccountData, CalendarEvent } from "@/types/calendar";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function CalendarPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<DraggableAccountData[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [draggedAccount, setDraggedAccount] = useState<DraggableAccountData | null>(null);

  // Fetch call plan accounts
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch active call plan accounts
        const accountsRes = await fetch("/api/call-plans/active/accounts");
        if (!accountsRes.ok) throw new Error("Failed to fetch accounts");
        const accountsData = await accountsRes.json();

        // Fetch calendar events
        const eventsRes = await fetch("/api/calendar/events");
        if (!eventsRes.ok) throw new Error("Failed to fetch events");
        const eventsData = await eventsRes.json();

        // Mark accounts as scheduled if they have events
        const eventCustomerIds = new Set(
          eventsData.events.map((e: CalendarEvent) => e.customerId).filter(Boolean)
        );

        const accountsWithSchedule = accountsData.accounts.map((account: any) => ({
          id: account.id,
          customerId: account.customerId,
          customerName: account.customerName,
          accountNumber: account.accountNumber,
          accountType: account.accountType,
          priority: account.priority,
          objective: account.objective,
          lastOrderDate: account.lastOrderDate,
          location: account.location,
          isScheduled: eventCustomerIds.has(account.customerId),
        }));

        setAccounts(accountsWithSchedule);
        setEvents(eventsData.events);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load calendar data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [toast]);

  // Handle event creation
  const handleEventCreate = useCallback(
    async (start: Date, end: Date, accountData?: DraggableAccountData) => {
      try {
        const eventData = {
          title: accountData
            ? `Visit: ${accountData.customerName}`
            : "New Event",
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          eventType: "visit",
          customerId: accountData?.customerId,
          location: accountData?.location,
          description: accountData?.objective,
        };

        const response = await fetch("/api/calendar/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(eventData),
        });

        if (!response.ok) throw new Error("Failed to create event");

        const newEvent = await response.json();
        setEvents((prev) => [...prev, newEvent]);

        // Update account scheduled status
        if (accountData) {
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.customerId === accountData.customerId
                ? { ...acc, isScheduled: true, scheduledEventId: newEvent.id }
                : acc
            )
          );
        }
      } catch (error) {
        console.error("Error creating event:", error);
        throw error;
      }
    },
    []
  );

  // Handle event update
  const handleEventUpdate = useCallback(async (eventId: string, start: Date, end: Date) => {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to update event");

      const updatedEvent = await response.json();
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));
    } catch (error) {
      console.error("Error updating event:", error);
      throw error;
    }
  }, []);

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // TODO: Open event details modal
    console.log("Event clicked:", event);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((account: DraggableAccountData) => {
    setDraggedAccount(account);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0">
        <CallPlanSidebar accounts={accounts} onDragStart={handleDragStart} />
      </div>

      {/* Calendar */}
      <div className="flex-1 p-4">
        <CalendarView
          events={events}
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventClick={handleEventClick}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { Draggable, DropArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { format, differenceInMinutes } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarClock, RotateCw, AlertCircle } from "lucide-react";
import { DraggableAccount } from "@/app/sales/calendar/components/DraggableAccount";
import type { DraggableAccountData } from "@/types/calendar";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

type ScheduleEvent = {
  id: string;
  customerId: string;
  scheduledDate: string;
  scheduledTime: string;
  duration: number;
  googleEventId?: string | null;
  outlookEventId?: string | null;
  customer: {
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
};

type TerritoryBlock = {
  id: string;
  territory: string;
  dayOfWeek: number;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
};

type UnscheduledAccount = {
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

interface DragDropCalendarProps {
  callPlanId?: string;
  weekStart: Date;
  refreshKey: number;
}

type CalendarEventInput = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    customerId: string;
    territory: string | null;
  };
};

function combineDateAndTime(dateIso: string, time: string) {
  const date = new Date(dateIso);
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getDayOfWeek(date: Date) {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function parseTimeToMinutes(time?: string | null) {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  return hours * 60 + minutes;
}

function getPriorityColor(priority: string | null | undefined) {
  switch (priority) {
    case "HIGH":
      return "#f87171";
    case "MEDIUM":
      return "#fbbf24";
    case "LOW":
      return "#34d399";
    default:
      return "#60a5fa";
  }
}

function getTerritoryColor(territory: string | null | undefined) {
  if (!territory) return "#60a5fa";
  let hash = 0;
  for (let i = 0; i < territory.length; i += 1) {
    hash = territory.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}deg 55% 65%)`;
}

type PlannerAccount = DraggableAccountData & { territory?: string | null };

export default function DragDropCalendar({ callPlanId, weekStart, refreshKey }: DragDropCalendarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [schedules, setSchedules] = useState<ScheduleEvent[]>([]);
  const [unscheduledAccounts, setUnscheduledAccounts] = useState<UnscheduledAccount[]>([]);
  const [territoryBlocks, setTerritoryBlocks] = useState<TerritoryBlock[]>([]);
  const [googleCalendarEvents, setGoogleCalendarEvents] = useState<any[]>([]);
  const calendarRef = useRef<FullCalendar>(null);

  const weekRangeLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 4);
    return `${format(weekStart, "MMM d")} – ${format(end, "MMM d")}`;
  }, [weekStart]);

  const fetchSchedule = useCallback(async () => {
    if (!callPlanId) {
      setSchedules([]);
      setUnscheduledAccounts([]);
      return;
    }

    setIsLoading(true);
    try {
      const weekStartParam = format(weekStart, "yyyy-MM-dd");
      const response = await fetch(
        `/api/sales/call-plan/carla/schedule?callPlanId=${callPlanId}&weekStart=${weekStartParam}`,
        {
          credentials: "include",
          headers: tenantHeaders,
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load schedule (${response.status})`);
      }

      const data = await response.json();
      setSchedules(data.schedules ?? []);
      setUnscheduledAccounts(data.unscheduledAccounts ?? []);
      setTerritoryBlocks(data.territoryBlocks ?? []);
    } catch (error) {
      console.error("[DragDropCalendar] fetchSchedule", error);
      toast.error("Unable to load schedule");
      setSchedules([]);
      setUnscheduledAccounts([]);
      setTerritoryBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [callPlanId, weekStart]);

  // Fetch Google Calendar events for conflict detection
  const fetchGoogleCalendarEvents = useCallback(async () => {
    if (!callPlanId) return;

    try {
      const weekStartParam = format(weekStart, "yyyy-MM-dd");
      console.log("[DragDropCalendar] Fetching Google Calendar events for week:", weekStartParam);

      const response = await fetch(
        `/api/sales/call-plan/carla/calendar/events?weekStart=${weekStartParam}`,
        {
          credentials: "include",
          headers: tenantHeaders,
        }
      );

      console.log("[DragDropCalendar] Google events response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[DragDropCalendar] ✅ Received", data.events?.length || 0, "Google Calendar events");
        console.log("[DragDropCalendar] Events:", data.events);
        setGoogleCalendarEvents(data.events || []);
      } else {
        console.error("[DragDropCalendar] Failed to fetch Google events:", response.status);
      }
    } catch (error) {
      console.error("[DragDropCalendar] Failed to fetch Google Calendar events:", error);
    }
  }, [callPlanId, weekStart]);

  useEffect(() => {
    fetchSchedule();
    fetchGoogleCalendarEvents();
  }, [fetchSchedule, fetchGoogleCalendarEvents, refreshKey]);

  const calendarEvents: CalendarEventInput[] = useMemo(() => {
    const carlaEvents = schedules.map((schedule) => {
      const start = combineDateAndTime(schedule.scheduledDate, schedule.scheduledTime);
      const end = new Date(start.getTime() + schedule.duration * 60 * 1000);
      const title = schedule.customer.accountNumber
        ? `${schedule.customer.name} (#${schedule.customer.accountNumber})`
        : schedule.customer.name;

      const color = schedule.customer.territory
        ? getTerritoryColor(schedule.customer.territory)
        : getPriorityColor(schedule.customer.priority);

      return {
        id: schedule.id,
        title,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          customerId: schedule.customerId,
          territory: schedule.customer.territory,
          source: "carla",
        },
      };
    });

    // Add Google Calendar events (show as conflicts)
    const googleEvents = googleCalendarEvents
      .filter((event: any) => {
        // Filter out CARLA-created events (we already show those)
        const isCarlaEvent = schedules.some(s => s.googleEventId === event.id);
        return !isCarlaEvent;
      })
      .map((event: any) => {
        // Parse Google Calendar time correctly (it's in ISO format with timezone)
        let startTime = new Date(event.start);
        let endTime = new Date(event.end);

        // If Google returns UTC time, we need to display it in local time
        // FullCalendar will handle timezone display automatically

        return {
          id: `google-${event.id}`,
          title: `🔒 ${event.title}`,
          start: startTime,
          end: endTime,
          backgroundColor: "#dc2626", // Red for conflicts
          borderColor: "#dc2626",
          editable: false, // Can't edit Google Calendar events from CARLA
          extendedProps: {
            source: "google",
            isConflict: true,
            originalStart: event.start,
            originalEnd: event.end,
          },
        };
      });

    return [...carlaEvents, ...googleEvents];
  }, [schedules, googleCalendarEvents]);

  const draggableAccounts: PlannerAccount[] = useMemo(() => {
    return unscheduledAccounts.map((account) => ({
      id: account.callPlanAccountId,
      customerId: account.customerId,
      customerName: account.customerName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      priority: account.priority ?? "MEDIUM",
      objective: account.objective,
      lastOrderDate: account.lastOrderDate,
      location:
        account.city && account.state ? `${account.city}, ${account.state}` : null,
      territory: account.territory,
      isScheduled: false,
    }));
  }, [unscheduledAccounts]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const draggables: Draggable[] = [];

    draggableAccounts.forEach((account) => {
      const draggableEl = document.getElementById(`draggable-account-${account.id}`);

      if (draggableEl && !account.isScheduled) {
        const payload = {
          id: account.id,
          customerId: account.customerId,
          customerName: account.customerName,
          priority: account.priority ?? "MEDIUM",
          accountType: account.accountType ?? "ACTIVE",
          accountNumber: account.accountNumber ?? null,
          location: account.location ?? null,
          objective: account.objective ?? "",
          territory: account.territory ?? null,
          lastOrderDate: account.lastOrderDate ?? null,
          isScheduled: account.isScheduled ?? false,
        };

        draggableEl.setAttribute("data-account", JSON.stringify(payload));
        const draggable = new Draggable(draggableEl, {
          eventData: {
            id: account.customerId,
            title: account.customerName,
            duration: { minutes: 30 },
            extendedProps: {
              customerId: account.customerId,
              territory: account.territory ?? null,
              priority: account.priority,
            },
          },
        });
        draggables.push(draggable);
      }
    });

    return () => {
      draggables.forEach((draggable) => draggable.destroy());
    };
  }, [draggableAccounts]);

  const blocksByDay = useMemo(() => {
    const map = new Map<number, TerritoryBlock[]>();
    territoryBlocks.forEach((block) => {
      if (!map.has(block.dayOfWeek)) {
        map.set(block.dayOfWeek, []);
      }
      map.get(block.dayOfWeek)?.push(block);
    });
    return map;
  }, [territoryBlocks]);

  const isSlotAllowed = useCallback(
    (territory: string | null | undefined, start: Date) => {
      const dayOfWeek = getDayOfWeek(start);
      const blocksForDay = blocksByDay.get(dayOfWeek);

      if (!blocksForDay || blocksForDay.length === 0) {
        return true;
      }

      if (!territory) {
        return false;
      }

      const matchingBlock = blocksForDay.find((block) => block.territory === territory);
      if (!matchingBlock) {
        return false;
      }

      if (matchingBlock.allDay) {
        return true;
      }

      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const blockStart = parseTimeToMinutes(matchingBlock.startTime);
      const blockEnd = parseTimeToMinutes(matchingBlock.endTime);

      if (blockStart === null || blockEnd === null) {
        return true;
      }

      return startMinutes >= blockStart && startMinutes < blockEnd;
    },
    [blocksByDay],
  );

  // Auto-sync with debouncing - MUST BE DEFINED BEFORE HANDLERS
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const triggerAutoSync = useCallback(async () => {
    if (!callPlanId) return;

    // Clear existing timer
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    // Debounce: wait 2 seconds after last change
    syncTimerRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const response = await fetch("/api/sales/call-plan/carla/calendar/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...tenantHeaders },
          credentials: "include",
          body: JSON.stringify({
            callPlanId,
            weekStart: weekStart.toISOString(),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.eventCount > 0) {
            toast.success(`Auto-synced ${data.eventCount} events to calendar`, {
              duration: 2000,
            });
            // Refresh Google Calendar events to show any new conflicts
            fetchGoogleCalendarEvents();
          }
        } else {
          // Silently fail for auto-sync (user can manually sync if needed)
          console.log("[AutoSync] Calendar sync skipped or failed");
        }
      } catch (error) {
        console.error("[AutoSync] Error:", error);
        // Don't show error toast for auto-sync failures
      } finally {
        setIsSyncing(false);
      }
    }, 2000); // 2 second debounce
  }, [callPlanId, weekStart, fetchGoogleCalendarEvents]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const persistCreate = useCallback(
    async (account: PlannerAccount, start: Date) => {
      if (!callPlanId) {
        toast.error("Create a call plan for this week before scheduling");
        return;
      }

      if (!isSlotAllowed(account.territory ?? null, start)) {
        toast.error("Territory is not assigned for this time slot");
        return;
      }

      const payload = {
        callPlanId,
        customerId: account.customerId,
        scheduledDate: format(start, "yyyy-MM-dd"),
        scheduledTime: format(start, "HH:mm"),
        duration: 30,
      };

      const response = await fetch("/api/sales/call-plan/carla/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "unable to create schedule");
      }
    },
    [callPlanId, isSlotAllowed],
  );

  const persistUpdate = useCallback(async (scheduleId: string, start: Date, end?: Date | null) => {
    const payload: Record<string, unknown> = {
      scheduledDate: format(start, "yyyy-MM-dd"),
      scheduledTime: format(start, "HH:mm"),
    };

    if (end) {
      const minutes = Math.max(15, differenceInMinutes(end, start) || 30);
      payload.duration = Math.ceil(minutes / 15) * 15;
    }

    const response = await fetch(`/api/sales/call-plan/carla/schedule/${scheduleId}` ,{
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...tenantHeaders },
      body: JSON.stringify(payload),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "unable to update schedule");
    }
  }, []);

  const handleExternalDrop = useCallback(
    async (info: DropArg) => {
      console.log("[DragDrop] External drop event", {
        date: info.date?.toISOString?.() ?? info.date,
        allDay: info.allDay,
        draggedElementId: info.draggedEl?.id,
        draggedClasses: info.draggedEl?.className,
      });

      const accountJson = info.draggedEl?.dataset?.account;
      if (!accountJson) {
        console.error("[DragDrop] ❌ Missing data-account attribute", {
          elementPreview: info.draggedEl?.outerHTML?.substring(0, 200) ?? "<unknown>",
        });
        toast.error("Drag-drop error: account data missing. Check console.");
        return;
      }

      let accountPayload: PlannerAccount | null = null;
      try {
        accountPayload = JSON.parse(accountJson) as PlannerAccount;
        console.log("[DragDrop] ✅ Parsed account", accountPayload);
      } catch (error) {
        console.error("[DragDrop] ❌ JSON parse error", error);
        toast.error("Invalid account data");
        return;
      }

      if (!accountPayload?.customerId) {
        console.error("[DragDrop] ❌ Missing customerId in payload", accountPayload);
        toast.error("Account missing required data");
        return;
      }

      if (!info.date) {
        console.error("[DragDrop] ❌ Drop info missing date", info);
        toast.error("Unable to determine drop time");
        return;
      }

      if (!isSlotAllowed(accountPayload.territory ?? null, info.date)) {
        toast.error("Territory is blocked for this slot");
        return;
      }

      try {
        await persistCreate(accountPayload, info.date);
        toast.success(`Scheduled ${accountPayload.customerName}`);
        await fetchSchedule();
        triggerAutoSync(); // Auto-sync after creating schedule
      } catch (error: any) {
        toast.error(error.message ?? "Failed to add schedule");
      }
    },
    [fetchSchedule, isSlotAllowed, persistCreate, triggerAutoSync],
  );

  const handleEventChange = useCallback(
    async (info: any) => {
      try {
        const territory = info.event.extendedProps?.territory ?? null;
        if (!isSlotAllowed(territory, info.event.start)) {
          toast.error("Territory is blocked for this slot");
          info.revert();
          return;
        }
        await persistUpdate(info.event.id, info.event.start, info.event.end);
        toast.success("Schedule updated");
        await fetchSchedule();
        triggerAutoSync(); // Auto-sync after updating schedule
      } catch (error: any) {
        toast.error(error.message ?? "Unable to reschedule");
        info.revert();
      }
    },
    [fetchSchedule, isSlotAllowed, persistUpdate, triggerAutoSync],
  );

  const handleEventClick = useCallback(
    async (info: EventClickArg) => {
      const scheduleId = info.event.id;
      const accountName = info.event.title;

      if (
        !window.confirm(
          `Remove ${accountName} from this time slot?\n\nThe account will return to your unscheduled list.`,
        )
      ) {
        return;
      }

      try {
        const response = await fetch(`/api/sales/call-plan/carla/schedule/${scheduleId}`, {
          method: "DELETE",
          headers: tenantHeaders,
          credentials: "include",
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error ?? "Failed to delete schedule");
        }

        toast.success(`${accountName} removed from schedule`);
        await fetchSchedule();
        triggerAutoSync(); // Auto-sync after deleting schedule
      } catch (error) {
        console.error("[DragDropCalendar] handleEventClick DELETE", error);
        toast.error(error instanceof Error ? error.message : "Unable to remove account");
      }
    },
    [fetchSchedule, triggerAutoSync],
  );

  const handleReload = useCallback(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  if (!callPlanId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-700">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Schedule Planner
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          Select accounts for this week to create a call plan before scheduling specific times.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <CalendarClock className="h-5 w-5" />
          Weekly Schedule Planner
        </CardTitle>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            {weekRangeLabel}
          </Badge>
          {isSyncing && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 animate-pulse">
              Syncing...
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleReload}>
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Drag Accounts</h3>
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">
                  {draggableAccounts.length} unscheduled
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Drag accounts into the calendar to assign a 30-minute visit. Drag scheduled events to move them.
              </p>
            </div>

            {googleCalendarEvents.length > 0 && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-red-600"></div>
                  <p className="text-xs font-medium text-red-900">
                    🔒 Google Calendar Conflicts
                  </p>
                </div>
                <p className="mt-1 text-xs text-red-700">
                  Red events are from your Google Calendar. Avoid scheduling over these times.
                </p>
              </div>
            )}

            <ScrollArea className="h-[420px] rounded-md border border-slate-100 p-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, idx) => (
                    <Skeleton key={idx} className="h-24 rounded-md" />
                  ))}
                </div>
              ) : draggableAccounts.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  All selected accounts are scheduled for this week.
                </div>
              ) : (
                <div className="space-y-2">
                  {draggableAccounts.map((account) => (
                    <DraggableAccount
                      key={account.id}
                      account={account}
                      onDragStart={() => {}}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Active Territory Blocks
              </h4>
              {territoryBlocks.length === 0 ? (
                <p className="text-xs text-slate-500">No territory blocks set for this week.</p>
              ) : (
                <div className="space-y-2">
                  {territoryBlocks.map((block) => (
                    <div key={block.id} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">{block.territory}</span>
                      <Badge
                        variant="outline"
                        style={{ backgroundColor: getTerritoryColor(block.territory) }}
                        className="border-transparent text-slate-600"
                      >
                        Day {block.dayOfWeek}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="relative min-h-[520px] overflow-hidden rounded-lg border border-slate-200">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                <div className="space-y-3 text-center">
                  <Skeleton className="mx-auto h-10 w-10 rounded-full" />
                  <p className="text-sm text-gray-600">Loading weekly schedule…</p>
                </div>
              </div>
            )}

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              timeZone="America/New_York"
              headerToolbar={{
                left: "",
                center: "",
                right: "",
              }}
              height="auto"
              firstDay={1}
              slotMinTime="08:00:00"
              slotMaxTime="18:00:00"
              slotDuration="00:30:00"
              snapDuration="00:30:00"
              allDaySlot={false}
              weekends={false}
              events={calendarEvents}
              editable
              droppable
              eventDurationEditable
              eventDrop={handleEventChange}
              eventResize={handleEventChange}
              eventClick={handleEventClick}
              drop={handleExternalDrop}
              longPressDelay={500}
              eventLongPressDelay={500}
              selectLongPressDelay={500}
              slotLabelFormat={{
                hour: "numeric",
                minute: "2-digit",
                meridiem: "short",
              }}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: "08:00",
                endTime: "18:00",
              }}
              eventContent={(arg) => (
                <div className="p-2 text-xs text-white">
                  <div className="font-semibold leading-tight">{arg.event.title}</div>
                  {arg.event.extendedProps.territory && (
                    <div className="opacity-80">{arg.event.extendedProps.territory}</div>
                  )}
                </div>
              )}
            />
            <style jsx global>{`
              .fc-timegrid-slot.fc-dragging {
                background-color: rgba(59, 130, 246, 0.1);
                border: 2px dashed #3b82f6;
              }
            `}</style>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

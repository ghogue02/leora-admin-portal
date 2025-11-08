"use client";

import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import type { EnrichedCallPlanTask } from "@/lib/call-plan/enrich-tasks.server";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

type DayPlan = {
  date: Date;
  activities: PlannedActivity[];
};

type PlannedActivity = {
  id?: string;
  customerId: string;
  customerName: string;
  activityType: string;
  activityTypeId?: string | null;
  activityTypeLabel: string;
  notes?: string | null;
  completed: boolean;
  estimatedDuration?: number;
};

type WeeklyCallPlanGridProps = {
  weekStart: Date;
  callPlan: {
    tasks: EnrichedCallPlanTask[];
  } | null;
  onRefresh?: () => void;
};

const WEEKDAYS = [
  { name: "Monday", short: "Mon" },
  { name: "Tuesday", short: "Tue" },
  { name: "Wednesday", short: "Wed" },
  { name: "Thursday", short: "Thu" },
  { name: "Friday", short: "Fri" },
];

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  "in-person-visit": "bg-blue-100 text-blue-800 border-blue-300",
  "tasting": "bg-purple-100 text-purple-800 border-purple-300",
  "phone-call": "bg-green-100 text-green-800 border-green-300",
  "email": "bg-gray-100 text-gray-800 border-gray-300",
  "text": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "public-event": "bg-pink-100 text-pink-800 border-pink-300",
  other: "bg-slate-100 text-slate-800 border-slate-300",
};

export default function WeeklyCallPlanGrid({
  weekStart,
  callPlan,
  onRefresh,
}: WeeklyCallPlanGridProps) {
  const [activeDropDay, setActiveDropDay] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Build days array
  const days: DayPlan[] = WEEKDAYS.map((_, index) => ({
    date: addDays(weekStart, index),
    activities: [], // Will be populated from callPlan
  }));

  // Populate activities from callPlan if exists
  if (callPlan?.tasks) {
    callPlan.tasks.forEach((task) => {
      const taskDate = new Date(task.dueAt);
      const dayIndex = days.findIndex((day) => isSameDay(day.date, taskDate));
      if (dayIndex !== -1) {
        const activityKey = task.activityTypeKey || task.activityType || "other";
        const activityLabel =
          task.activityTypeLabel ||
          task.activityTypeName ||
          activityKey.replace(/-/g, " ");
        days[dayIndex].activities.push({
          id: task.id,
          customerId: task.customerId,
          customerName: task.customer?.name || "Unknown",
          activityType: activityKey,
          activityTypeId: task.activityTypeId ?? null,
          activityTypeLabel: activityLabel,
          notes: task.description ?? task.notes ?? null,
          completed: task.status === "COMPLETED",
        });
      }
    });
  }

  const handleDragOverDay = (index: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (activeDropDay !== index) {
      setActiveDropDay(index);
    }
  };

  const handleDragLeaveDay = (index: number) => {
    if (activeDropDay === index) {
      setActiveDropDay(null);
    }
  };

  const handleDropOnDay = async (index: number, event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActiveDropDay(null);
    if (isSubmitting) {
      return;
    }

    const raw = event.dataTransfer.getData("application/json");
    if (!raw) {
      toast.error("Unable to read account data");
      return;
    }

    let payload: { customerId?: string; customerName?: string; objective?: string };
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      console.error("[WeeklyCallPlanGrid] Failed to parse drag payload", error);
      toast.error("Invalid account payload");
      return;
    }

    if (!payload.customerId) {
      toast.error("Missing customer information");
      return;
    }

    const targetDate = new Date(days[index].date);
    targetDate.setHours(10, 0, 0, 0);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sales/call-plan/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...tenantHeaders,
        },
        credentials: "include",
        body: JSON.stringify({
          customerId: payload.customerId,
          dueAt: targetDate.toISOString(),
          title: `${payload.customerName ?? "Customer"} - Planned Activity`,
          description: payload.objective ?? undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Unable to schedule activity");
      }

      toast.success(`Added ${payload.customerName ?? "customer"} to ${format(targetDate, "EEE, MMM d")}`);
      onRefresh?.();
    } catch (error) {
      console.error("[WeeklyCallPlanGrid] handleDropOnDay", error);
      toast.error(error instanceof Error ? error.message : "Failed to create activity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  const getTotalActivities = () => {
    return days.reduce((sum, day) => sum + day.activities.length, 0);
  };

  const getCompletedActivities = () => {
    return days.reduce(
      (sum, day) => sum + day.activities.filter((a) => a.completed).length,
      0
    );
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Grid Header */}
        <div className="grid grid-cols-5 border-b border-gray-200 bg-gray-50">
          {WEEKDAYS.map((weekday, index) => {
            const day = days[index];
            const today = isToday(day.date);

            return (
              <div
                key={weekday.name}
                className={`border-r border-gray-200 p-4 last:border-r-0 ${
                  today ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        today ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {weekday.name}
                    </p>
                    <p className="text-xs text-gray-500">{format(day.date, "MMM d")}</p>
                  </div>
                  {day.activities.length > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                      {day.activities.length}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grid Body */}
        <div className="grid grid-cols-5">
          {days.map((day, index) => {
            const today = isToday(day.date);

            const isActiveTarget = activeDropDay === index;
            return (
              <div
                key={index}
                className={`min-h-[400px] border-r border-gray-200 p-3 last:border-r-0 ${
                  today ? "bg-blue-50/30" : ""
                } ${isActiveTarget ? "border-blue-400 bg-blue-50/40" : ""}`}
                onDragOver={(event) => handleDragOverDay(index, event)}
                onDragLeave={() => handleDragLeaveDay(index)}
                onDrop={(event) => handleDropOnDay(index, event)}
              >
                {/* Activities List */}
                <div className="space-y-2">
                  {day.activities.map((activity) => {
                    const colorClass =
                      ACTIVITY_TYPE_COLORS[activity.activityType] ||
                      "bg-gray-100 text-gray-800 border-gray-300";

                    return (
                      <div
                        key={activity.id}
                        className={`rounded-md border p-2 text-xs ${colorClass} ${
                          activity.completed ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 h-3.5 w-3.5 rounded border border-gray-400" />
                          <div className="flex-1">
                            <p
                              className={`font-semibold ${
                                activity.completed ? "line-through" : ""
                              }`}
                            >
                              {activity.customerName}
                            </p>
                            <p className="text-xs opacity-75">
                              {activity.activityTypeLabel}
                            </p>
                            {activity.notes && (
                              <p className="mt-1 text-xs opacity-75">{activity.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

        {/* Grid Footer - Stats */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-600">Total Activities:</span>{" "}
                <span className="font-semibold text-gray-900">{getTotalActivities()}</span>
              </div>
              <div>
                <span className="text-gray-600">Completed:</span>{" "}
                <span className="font-semibold text-green-600">{getCompletedActivities()}</span>
              </div>
              <div>
                <span className="text-gray-600">Pending:</span>{" "}
                <span className="font-semibold text-orange-600">
                  {getTotalActivities() - getCompletedActivities()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}

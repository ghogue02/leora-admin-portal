"use client";

import { useEffect, useMemo, useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ActivityEntryModal, { ActivityData } from "../carla/components/ActivityEntryModal";
import type { EnrichedCallPlanTask } from "@/lib/call-plan/enrich-tasks.server";

const tenantHeaders = {
  "x-tenant-slug": process.env.NEXT_PUBLIC_TENANT_SLUG ?? "well-crafted",
};

const WEEKDAYS = [
  { name: "Monday", short: "Mon", isWeekend: false },
  { name: "Tuesday", short: "Tue", isWeekend: false },
  { name: "Wednesday", short: "Wed", isWeekend: false },
  { name: "Thursday", short: "Thu", isWeekend: false },
  { name: "Friday", short: "Fri", isWeekend: false },
  { name: "Saturday", short: "Sat", isWeekend: true },
  { name: "Sunday", short: "Sun", isWeekend: true },
];

const GRID_COLUMN_STYLE = {
  gridTemplateColumns: "repeat(5, minmax(0, 1fr)) minmax(0, 0.85fr)",
};

const OBJECTIVE_OPTIONS = [
  { label: "Tasting Appt", value: "tasting", activityTypeCode: "tasting", colorKey: "green" },
  { label: "Visit", value: "visit", activityTypeCode: "visit", colorKey: "blue" },
  { label: "Email", value: "email", activityTypeCode: "email", colorKey: "purple" },
  { label: "Call", value: "call", activityTypeCode: "call", colorKey: "purple" },
  { label: "Text", value: "text", activityTypeCode: "text", colorKey: "purple" },
  { label: "Public Event", value: "public-event", activityTypeCode: "event", colorKey: "red" },
  { label: "Cold Call", value: "cold-call", activityTypeCode: "call", colorKey: "yellow" },
  { label: "Other", value: "other", activityTypeCode: "visit", colorKey: "slate" },
] as const;

type ObjectiveValue = (typeof OBJECTIVE_OPTIONS)[number]["value"];

type ObjectiveColorKey = "green" | "blue" | "purple" | "yellow" | "red" | "slate";

const OBJECTIVE_COLOR_LOOKUP = OBJECTIVE_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.colorKey }),
  {} as Record<ObjectiveValue, ObjectiveColorKey>
);

const OBJECTIVE_COLOR_STYLES: Record<
  ObjectiveColorKey,
  {
    cardBorder: string;
    cardBg: string;
    pill: string;
    buttonActive: string;
    buttonInactive: string;
  }
> = {
  green: {
    cardBorder: "border-green-200",
    cardBg: "bg-green-50/40",
    pill: "bg-green-600 text-white",
    buttonActive: "bg-green-600 text-white hover:bg-green-700",
    buttonInactive: "border-green-200 text-green-700 hover:bg-green-50",
  },
  blue: {
    cardBorder: "border-blue-200",
    cardBg: "bg-blue-50/40",
    pill: "bg-blue-600 text-white",
    buttonActive: "bg-blue-600 text-white hover:bg-blue-700",
    buttonInactive: "border-blue-200 text-blue-700 hover:bg-blue-50",
  },
  purple: {
    cardBorder: "border-purple-200",
    cardBg: "bg-purple-50/40",
    pill: "bg-purple-600 text-white",
    buttonActive: "bg-purple-600 text-white hover:bg-purple-700",
    buttonInactive: "border-purple-200 text-purple-700 hover:bg-purple-50",
  },
  yellow: {
    cardBorder: "border-amber-300",
    cardBg: "bg-amber-50/40",
    pill: "bg-amber-500 text-white",
    buttonActive: "bg-amber-500 text-white hover:bg-amber-600",
    buttonInactive: "border-amber-300 text-amber-700 hover:bg-amber-50",
  },
  red: {
    cardBorder: "border-red-200",
    cardBg: "bg-red-50/40",
    pill: "bg-red-600 text-white",
    buttonActive: "bg-red-600 text-white hover:bg-red-700",
    buttonInactive: "border-red-200 text-red-700 hover:bg-red-50",
  },
  slate: {
    cardBorder: "border-gray-200",
    cardBg: "bg-white",
    pill: "bg-slate-600 text-white",
    buttonActive: "bg-slate-600 text-white hover:bg-slate-700",
    buttonInactive: "border-gray-300 text-gray-700 hover:bg-gray-100",
  },
};

const getObjectiveTheme = (value: ObjectiveValue | null) => {
  if (!value) {
    return OBJECTIVE_COLOR_STYLES.slate;
  }
  const key = OBJECTIVE_COLOR_LOOKUP[value] ?? "slate";
  return OBJECTIVE_COLOR_STYLES[key];
};

const ACTIVITY_TYPE_CODE_MAP: Record<string, string> = {
  MEETING: "visit",
  PHONE: "call",
  EMAIL: "email",
  TASK: "visit",
};

type DayPlan = {
  date: Date;
  activities: PlannedActivity[];
};

type PlannedActivity = {
  id: string;
  customerId?: string | null;
  customerName: string;
  activityType: string;
  activityTypeLabel: string;
  notes?: string | null;
  completed: boolean;
  planObjective: string | null;
  planNotes: string | null;
};

type WeeklyCallPlanGridProps = {
  weekStart: Date;
  callPlan: {
    tasks: EnrichedCallPlanTask[];
  } | null;
  onRefresh?: () => void;
};

export default function WeeklyCallPlanGrid({
  weekStart,
  callPlan,
  onRefresh,
}: WeeklyCallPlanGridProps) {
  const [activeDropDay, setActiveDropDay] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [objectiveOverrides, setObjectiveOverrides] = useState<Record<string, string | null>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [taskUpdating, setTaskUpdating] = useState<Set<string>>(new Set());
  const [completingTasks, setCompletingTasks] = useState<Set<string>>(new Set());
  const [reopeningTasks, setReopeningTasks] = useState<Set<string>>(new Set());
  const [activityModalTask, setActivityModalTask] = useState<PlannedActivity | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(new Set());

  useEffect(() => {
    setObjectiveOverrides({});
    setNoteDrafts({});
    setExpandedActivities(new Set());
  }, [callPlan]);

  // Build days array
  const days: DayPlan[] = WEEKDAYS.map((_, index) => ({
    date: addDays(weekStart, index),
    activities: [],
  }));

  // Populate activities from callPlan if exists
  if (callPlan?.tasks) {
    callPlan.tasks.forEach((task) => {
      if (!task.dueAt) {
        return;
      }
      const taskDate = new Date(task.dueAt);
      const dayIndex = days.findIndex((day) => isSameDay(day.date, taskDate));
      if (dayIndex !== -1) {
        const activityKey = task.activityTypeKey || task.activityType || "other";
        const activityLabel =
          task.activityTypeLabel || task.activityTypeName || activityKey.replace(/-/g, " ");
        days[dayIndex].activities.push({
          id: task.id,
          customerId: task.customerId,
          customerName: task.customer?.name || "Unknown",
          activityType: activityKey,
          activityTypeLabel: activityLabel,
          notes: task.description ?? task.notes ?? null,
          completed: task.status === "COMPLETED",
          planObjective: task.planObjective ?? null,
          planNotes: task.planNotes ?? null,
        });
      }
    });
  }

  const getObjectiveValue = (activity: PlannedActivity) =>
    objectiveOverrides[activity.id] ?? activity.planObjective ?? null;

  const getNoteValue = (activity: PlannedActivity) =>
    noteDrafts[activity.id] ?? activity.planNotes ?? "";

  const setNoteDraftValue = (activityId: string, value: string) => {
    setNoteDrafts((prev) => ({
      ...prev,
      [activityId]: value,
    }));
  };

  const reopenTask = async (taskId: string) => {
    const response = await fetch(`/api/sales/tasks/${taskId}/uncomplete`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Unable to reopen task");
    }
  };

  const toggleExpanded = (activityId: string) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  };

  const updateTaskPlan = async (
    taskId: string,
    updates: { planObjective?: string | null; planNotes?: string | null }
  ) => {
    setTaskUpdating((prev) => new Set(prev).add(taskId));
    try {
      const response = await fetch(`/api/sales/call-plan/tasks/${taskId}/plan`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...tenantHeaders,
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "Unable to save changes");
      }

      return true;
    } catch (error) {
      console.error("[WeeklyCallPlanGrid] updateTaskPlan", error);
      toast.error(error instanceof Error ? error.message : "Failed to save changes");
      return false;
    } finally {
      setTaskUpdating((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleReopenTask = async (activity: PlannedActivity) => {
    setReopeningTasks((prev) => new Set(prev).add(activity.id));
    try {
      await reopenTask(activity.id);
      toast.success("Task reopened. You can now edit and re-complete it.");
      onRefresh?.();
    } catch (error) {
      console.error("[WeeklyCallPlanGrid] handleReopenTask", error);
      toast.error(error instanceof Error ? error.message : "Unable to reopen task");
    } finally {
      setReopeningTasks((prev) => {
        const next = new Set(prev);
        next.delete(activity.id);
        return next;
      });
    }
  };

  const logActivityRequest = async ({
    customerId,
    activityTypeCode,
    subject,
    notes,
  }: {
    customerId: string;
    activityTypeCode: string;
    subject: string;
    notes?: string;
  }) => {
    const response = await fetch("/api/sales/activities", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      credentials: "include",
      body: JSON.stringify({
        activityTypeCode,
        customerId,
        subject,
        notes,
        occurredAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Failed to log activity");
    }
  };

  const markTaskComplete = async (taskId: string, notes?: string | null) => {
    const response = await fetch(`/api/sales/tasks/${taskId}/complete`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...tenantHeaders,
      },
      credentials: "include",
      body: JSON.stringify({ notes: notes ?? undefined }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "Unable to mark task complete");
    }
  };

  const handleObjectiveSelect = async (activity: PlannedActivity, value: ObjectiveValue) => {
    const previous = getObjectiveValue(activity);
    setObjectiveOverrides((prev) => ({ ...prev, [activity.id]: value }));
    const success = await updateTaskPlan(activity.id, { planObjective: value });
    if (!success) {
      setObjectiveOverrides((prev) => ({
        ...prev,
        [activity.id]: previous ?? null,
      }));
    }
  };

  const handleNoteBlur = async (activity: PlannedActivity) => {
    const draftValue = getNoteValue(activity);
    const baseline = activity.planNotes ?? "";
    if (draftValue.trim() === baseline.trim()) {
      return;
    }
    const success = await updateTaskPlan(activity.id, { planNotes: draftValue.trim() || null });
    if (!success) {
      setNoteDraftValue(activity.id, baseline);
    }
  };

  const handleMarkComplete = async (activity: PlannedActivity) => {
    if (activity.completed) {
      toast.info("This activity is already completed");
      return;
    }
    if (!activity.customerId) {
      toast.error("Customer information missing");
      return;
    }

    const selectedObjective = getObjectiveValue(activity);
    if (!selectedObjective) {
      toast.error("Select an objective before marking complete");
      return;
    }

    const objectiveMeta = OBJECTIVE_OPTIONS.find((option) => option.value === selectedObjective);
    if (!objectiveMeta) {
      toast.error("Objective not recognized");
      return;
    }

    const notesValue = getNoteValue(activity);

    setCompletingTasks((prev) => new Set(prev).add(activity.id));
    try {
      await logActivityRequest({
        customerId: activity.customerId,
        activityTypeCode: objectiveMeta.activityTypeCode,
        subject: `${objectiveMeta.label} - ${activity.customerName}`,
        notes: notesValue,
      });

      await markTaskComplete(activity.id, notesValue);
      toast.success("Activity completed and logged");
      onRefresh?.();
    } catch (error) {
      console.error("[WeeklyCallPlanGrid] handleMarkComplete", error);
      toast.error(error instanceof Error ? error.message : "Unable to complete activity");
    } finally {
      setCompletingTasks((prev) => {
        const next = new Set(prev);
        next.delete(activity.id);
        return next;
      });
    }
  };

  const handleActivityModalSave = async (data: ActivityData) => {
    if (!activityModalTask) {
      return;
    }

    const activityTypeCode = ACTIVITY_TYPE_CODE_MAP[data.activityType] ?? "visit";
    await logActivityRequest({
      customerId: data.customerId,
      activityTypeCode,
      subject: `${data.activityType} - ${activityModalTask.customerName}`,
      notes: data.description,
    });
    await markTaskComplete(activityModalTask.id, data.description);
    onRefresh?.();
  };

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
      toast.error("Drag payload missing customer reference");
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
          planNotes: payload.objective ?? null,
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

  const totalActivities = useMemo(() => {
    return days.reduce((sum, day) => sum + day.activities.length, 0);
  }, [days]);

  const completedActivities = useMemo(() => {
    return days.reduce(
      (sum, day) => sum + day.activities.filter((a) => a.completed).length,
      0
    );
  }, [days]);

  const renderActivities = (day: DayPlan) => {
    if (day.activities.length === 0) {
      return (
        <p className="text-xs text-gray-400">
          Drag a customer from the Weekly Call Plan to schedule an activity.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {day.activities.map((activity) => {
          const objective = getObjectiveValue(activity);
          const noteValue = getNoteValue(activity);
          const isTaskBusy = taskUpdating.has(activity.id);
          const isCompleting = completingTasks.has(activity.id);
          const isCustomerMissing = !activity.customerId;
          const isReopening = reopeningTasks.has(activity.id);
          const isExpanded = expandedActivities.has(activity.id);
          const needsObjective = !objective;
          const needsLog = !activity.completed;
          const objectiveLabel =
            OBJECTIVE_OPTIONS.find((option) => option.value === objective)?.label ?? "Not set";
          const objectiveTheme = getObjectiveTheme(objective);

          return (
            <div
              key={activity.id}
              className={cn(
                "rounded-md border p-3 text-xs transition",
                activity.completed ? "opacity-85" : "",
                objectiveTheme.cardBg,
                objectiveTheme.cardBorder,
                needsObjective || needsLog ? "ring-1 ring-amber-200" : "",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => toggleExpanded(activity.id)}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {activity.customerName}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500">
                    {format(day.date, "EEE, MMM d")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {activity.completed && (
                    <span className="rounded bg-green-200 px-2 py-0.5 text-[10px] font-semibold text-green-800">
                      Completed
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition ${
                      isExpanded ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 font-semibold",
                    needsObjective ? "bg-amber-100 text-amber-700" : objectiveTheme.pill,
                  )}
                >
                  {needsObjective ? "Objective Needed" : objectiveLabel}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                    needsLog ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {needsLog ? "Not Logged" : "Logged"}
                </span>
              </div>

              {!isExpanded && activity.notes && (
                <p className="mt-3 line-clamp-2 text-[11px] text-gray-700">
                  {activity.notes}
                </p>
              )}

              {isExpanded && activity.notes && (
                <p className="mt-3 text-[11px] text-gray-700">{activity.notes}</p>
              )}

              {isExpanded && (
                <>
                  <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase text-gray-600">
                  Objective
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {OBJECTIVE_OPTIONS.map((option) => {
                    const optionTheme = OBJECTIVE_COLOR_STYLES[option.colorKey];
                    const isSelected = objective === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-2 text-[11px] border",
                          isSelected ? optionTheme.buttonActive : optionTheme.buttonInactive,
                        )}
                        disabled={(activity.completed && !isReopening) || isTaskBusy || isSubmitting}
                        onClick={() => handleObjectiveSelect(activity, option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

                  <div className="mt-3 space-y-1">
                    <label className="text-[11px] font-semibold uppercase text-gray-600">
                      Notes
                    </label>
                    <Textarea
                      value={noteValue}
                      onChange={(event) => setNoteDraftValue(activity.id, event.target.value)}
                      onBlur={() => handleNoteBlur(activity)}
                      rows={3}
                      disabled={(activity.completed && !isReopening) || isTaskBusy || isSubmitting}
                      className="resize-none text-xs"
                      placeholder="Add context or reminders"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleMarkComplete(activity)}
                      disabled={
                        activity.completed ||
                        isTaskBusy ||
                        isSubmitting ||
                        isCompleting ||
                        isCustomerMissing
                      }
                    >
                      {isCompleting ? "Saving…" : "Mark as Complete"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={activity.completed || isCustomerMissing}
                      onClick={() => {
                        if (isCustomerMissing) {
                          toast.error("Customer information missing for this activity");
                          return;
                        }
                        setActivityModalTask(activity);
                      }}
                    >
                      Log Activity
                    </Button>
                    {activity.completed && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isTaskBusy || isSubmitting || isReopening}
                        onClick={() => handleReopenTask(activity)}
                      >
                        {isReopening ? "Reopening…" : "Reopen for Edits"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        {/* Grid Header */}
        <div className="grid border-b border-gray-200 bg-gray-50" style={GRID_COLUMN_STYLE}>
          {WEEKDAYS.slice(0, 5).map((weekday, index) => {
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

          <div className="border-r border-gray-200 last:border-r-0">
            {WEEKDAYS.slice(5).map((weekday, offset) => {
              const dayIndex = 5 + offset;
              const day = days[dayIndex];
              const today = isToday(day.date);
              return (
                <div
                  key={weekday.name}
                  className={`p-3 ${offset === 0 ? "border-b border-gray-200" : ""} ${
                    today ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p
                        className={`text-xs font-semibold ${
                          today ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {weekday.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {format(day.date, "MMM d")}
                      </p>
                    </div>
                    {day.activities.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                        {day.activities.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Body */}
        <div className="grid" style={GRID_COLUMN_STYLE}>
          {days.slice(0, 5).map((day, index) => {
            const today = isToday(day.date);
            const isActiveTarget = activeDropDay === index;

            return (
              <div
                key={index}
                className={`min-h-[460px] border-r border-gray-200 p-3 last:border-r-0 transition ${
                  today ? "bg-blue-50/30" : ""
                } ${isActiveTarget ? "border-blue-400 bg-blue-50/40" : ""}`}
                onDragOver={(event) => handleDragOverDay(index, event)}
                onDragLeave={() => handleDragLeaveDay(index)}
                onDrop={(event) => handleDropOnDay(index, event)}
              >
                {renderActivities(day)}
              </div>
            );
          })}

          <div className="border-r border-gray-200 last:border-r-0">
            {days.slice(5).map((day, offset) => {
              const dayIndex = 5 + offset;
              const today = isToday(day.date);
              const isActiveTarget = activeDropDay === dayIndex;
              return (
                <div
                  key={`weekend-day-${dayIndex}`}
                  className={`min-h-[220px] p-3 transition ${
                    offset === 0 ? "border-b border-gray-200" : ""
                  } ${today ? "bg-blue-50/30" : ""} ${
                    isActiveTarget ? "border border-blue-400 bg-blue-50/40" : ""
                  }`}
                  onDragOver={(event) => handleDragOverDay(dayIndex, event)}
                  onDragLeave={() => handleDragLeaveDay(dayIndex)}
                  onDrop={(event) => handleDropOnDay(dayIndex, event)}
                >
                  {renderActivities(day)}
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Footer - Stats */}
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-gray-600">Total Activities:</span>{" "}
              <span className="font-semibold text-gray-900">{totalActivities}</span>
            </div>
            <div>
              <span className="text-gray-600">Completed:</span>{" "}
              <span className="font-semibold text-green-600">{completedActivities}</span>
            </div>
            <div>
              <span className="text-gray-600">Pending:</span>{" "}
              <span className="font-semibold text-orange-600">
                {totalActivities - completedActivities}
              </span>
            </div>
          </div>
        </div>
      </div>

      <ActivityEntryModal
        isOpen={Boolean(activityModalTask)}
        onClose={() => setActivityModalTask(null)}
        customerId={activityModalTask?.customerId ?? ""}
        customerName={activityModalTask?.customerName ?? ""}
        onSave={handleActivityModalSave}
      />
    </>
  );
}

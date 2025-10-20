"use client";

import { useState } from "react";
import { format, addDays, isSameDay } from "date-fns";
import AddActivityModal from "./AddActivityModal";

type DayPlan = {
  date: Date;
  activities: PlannedActivity[];
};

type PlannedActivity = {
  id?: string;
  customerId: string;
  customerName: string;
  activityType: string;
  activityTypeId: string;
  notes?: string;
  completed: boolean;
  estimatedDuration?: number;
};

type WeeklyCallPlanGridProps = {
  weekStart: Date;
  callPlan: any;
  onUpdate: () => void;
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
};

export default function WeeklyCallPlanGrid({
  weekStart,
  callPlan,
  onUpdate,
}: WeeklyCallPlanGridProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Build days array
  const days: DayPlan[] = WEEKDAYS.map((_, index) => ({
    date: addDays(weekStart, index),
    activities: [], // Will be populated from callPlan
  }));

  // Populate activities from callPlan if exists
  if (callPlan?.tasks) {
    callPlan.tasks.forEach((task: any) => {
      const taskDate = new Date(task.dueAt);
      const dayIndex = days.findIndex((day) => isSameDay(day.date, taskDate));
      if (dayIndex !== -1) {
        days[dayIndex].activities.push({
          id: task.id,
          customerId: task.customerId,
          customerName: task.customer?.name || "Unknown",
          activityType: task.activityType || "visit",
          activityTypeId: task.activityTypeId,
          notes: task.description,
          completed: task.status === "COMPLETED",
        });
      }
    });
  }

  const handleAddActivity = (day: Date) => {
    setSelectedDay(day);
    setIsAddModalOpen(true);
  };

  const handleToggleComplete = async (activityId: string, completed: boolean) => {
    try {
      const endpoint = completed
        ? `/api/sales/tasks/${activityId}/uncomplete`
        : `/api/sales/tasks/${activityId}/complete`;

      const response = await fetch(endpoint, {
        method: "PUT",
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error updating activity:", error);
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

            return (
              <div
                key={index}
                className={`min-h-[400px] border-r border-gray-200 p-3 last:border-r-0 ${
                  today ? "bg-blue-50/30" : ""
                }`}
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
                          <input
                            type="checkbox"
                            checked={activity.completed}
                            onChange={() =>
                              activity.id && handleToggleComplete(activity.id, activity.completed)
                            }
                            className="mt-0.5 cursor-pointer"
                          />
                          <div className="flex-1">
                            <p
                              className={`font-semibold ${
                                activity.completed ? "line-through" : ""
                              }`}
                            >
                              {activity.customerName}
                            </p>
                            <p className="text-xs capitalize opacity-75">
                              {activity.activityType.replace("-", " ")}
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

                {/* Add Activity Button */}
                <button
                  onClick={() => handleAddActivity(day.date)}
                  className="mt-3 w-full rounded-md border-2 border-dashed border-gray-300 py-3 text-xs font-medium text-gray-500 transition hover:border-blue-400 hover:text-blue-600"
                >
                  + Add Activity
                </button>
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

      {/* Add Activity Modal */}
      {isAddModalOpen && selectedDay && (
        <AddActivityModal
          selectedDate={selectedDay}
          onClose={() => {
            setIsAddModalOpen(false);
            setSelectedDay(null);
          }}
          onSuccess={() => {
            setIsAddModalOpen(false);
            setSelectedDay(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}

'use client';

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import Link from "next/link";

type Activity = {
  id: string;
  time: string;
  title: string;
  customer: string | null;
  customerId: string | null;
  type: "visit" | "tasting" | "call" | "event";
  status: "pending" | "in_progress";
  description: string | null;
};

type CalendarDay = {
  date: string;
  dayName: string;
  dayOfMonth: string;
  month: string;
  activities: Activity[];
};

type CalendarData = {
  days: CalendarDay[];
  totalActivities: number;
};

const ACTIVITY_TYPE_CONFIG = {
  visit: {
    label: "Visit",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    dotColor: "bg-blue-500",
  },
  tasting: {
    label: "Tasting",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    dotColor: "bg-purple-500",
  },
  call: {
    label: "Call",
    color: "bg-green-100 text-green-800 border-green-200",
    dotColor: "bg-green-500",
  },
  event: {
    label: "Event",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    dotColor: "bg-yellow-500",
  },
};

export default function UpcomingCalendar() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sales/calendar/upcoming?days=10");
      if (response.ok) {
        const calendarData = await response.json();
        setData(calendarData);
      }
    } catch (error) {
      console.error("Error loading calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Calendar</h3>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-24 rounded bg-slate-200"></div>
              <div className="mt-2 h-16 rounded bg-slate-100"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Upcoming Calendar</h3>
        <p className="mt-2 text-sm text-gray-600">Unable to load calendar</p>
      </section>
    );
  }

  const daysWithActivities = data.days.filter((day) => day.activities.length > 0);

  return (
    <>
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Upcoming Calendar</h3>
              <p className="text-xs text-gray-500">Next 7-10 days of scheduled activities</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {data.totalActivities} activities
              </span>
              <Link
                href="/sales/call-plan"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Add Activity
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6">
          {daysWithActivities.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-600">No upcoming activities scheduled</p>
              <Link
                href="/sales/call-plan"
                className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Plan your week
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {daysWithActivities.map((day) => (
                <div key={day.date}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-gray-900">{day.dayName}</span>
                      <span className="text-sm text-gray-500">
                        {day.month} {day.dayOfMonth}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <div className="space-y-2">
                    {day.activities.map((activity) => {
                      const config = ACTIVITY_TYPE_CONFIG[activity.type];
                      const activityTime = activity.time !== "00:00" ? activity.time : null;

                      return (
                        <button
                          key={activity.id}
                          onClick={() => setSelectedActivity(activity)}
                          className="w-full text-left transition hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                            <div className={`mt-1 h-2 w-2 rounded-full ${config.dotColor}`}></div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    {activityTime && (
                                      <span className="text-sm font-semibold text-gray-900">
                                        {activityTime}
                                      </span>
                                    )}
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}
                                    >
                                      {config.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 font-medium text-gray-900">{activity.title}</p>
                                  {activity.customer && (
                                    <Link
                                      href={`/sales/customers/${activity.customerId}`}
                                      className="mt-1 inline-block text-sm text-blue-600 hover:text-blue-700"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {activity.customer}
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-600">Visits</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-600">Tastings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Calls</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Events</span>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Details Modal */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedActivity.title}
                </h3>
                <div className="mt-2 space-y-2 text-sm">
                  {selectedActivity.time !== "00:00" && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Time:</span>
                      <span className="text-gray-900">{selectedActivity.time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Type:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ACTIVITY_TYPE_CONFIG[selectedActivity.type].color
                      }`}
                    >
                      {ACTIVITY_TYPE_CONFIG[selectedActivity.type].label}
                    </span>
                  </div>
                  {selectedActivity.customer && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Customer:</span>
                      <Link
                        href={`/sales/customers/${selectedActivity.customerId}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {selectedActivity.customer}
                      </Link>
                    </div>
                  )}
                  {selectedActivity.description && (
                    <div>
                      <span className="font-medium text-gray-700">Notes:</span>
                      <p className="mt-1 text-gray-600">{selectedActivity.description}</p>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="ml-4 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <Link
                href="/sales/call-plan"
                className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                View in Call Plan
              </Link>
              <button
                onClick={() => setSelectedActivity(null)}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

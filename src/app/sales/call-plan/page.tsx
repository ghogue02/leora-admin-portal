"use client";

import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks } from "date-fns";
import WeeklyCallPlanGrid from "./sections/WeeklyCallPlanGrid";
import CallPlanStats from "./sections/CallPlanStats";

export default function CallPlanPage() {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday
  );
  const [callPlan, setCallPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCallPlan();
  }, [currentWeekStart]);

  const loadCallPlan = async () => {
    setLoading(true);
    try {
      const weekStart = format(currentWeekStart, "yyyy-MM-dd");
      const response = await fetch(`/api/sales/call-plan?weekStart=${weekStart}`);

      if (response.ok) {
        const data = await response.json();
        setCallPlan(data);
      } else {
        setCallPlan(null);
      }
    } catch (error) {
      console.error("Error loading call plan:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const handleThisWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  const isCurrentWeek =
    startOfWeek(new Date(), { weekStartsOn: 1 }).getTime() === currentWeekStart.getTime();

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      {/* Header */}
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
              Call Planning
            </p>
            <h1 className="text-3xl font-semibold text-gray-900">Weekly Call Plan</h1>
            <p className="mt-1 text-sm text-gray-600">
              Plan and track customer visits and activities for the week
            </p>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <button
            onClick={handlePreviousWeek}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Previous Week
          </button>

          <div className="flex-1 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
            </p>
            {isCurrentWeek && (
              <p className="text-xs font-medium text-blue-600">Current Week</p>
            )}
          </div>

          <button
            onClick={handleNextWeek}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next Week →
          </button>

          {!isCurrentWeek && (
            <button
              onClick={handleThisWeek}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              This Week
            </button>
          )}
        </div>
      </header>

      {/* Stats */}
      {callPlan && <CallPlanStats callPlan={callPlan} />}

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading call plan...</p>
          </div>
        </div>
      ) : (
        <WeeklyCallPlanGrid
          weekStart={currentWeekStart}
          callPlan={callPlan}
          onUpdate={loadCallPlan}
        />
      )}

      {/* Activity Weighting Guide */}
      <div className="rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
        <h3 className="text-sm font-semibold text-gray-900">Activity Balance Guide</h3>
        <p className="mt-2 text-sm text-gray-600">
          Aim for a balanced mix of activity types each week. Industry best practices suggest:
        </p>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="rounded-md bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500">In-Person Visits</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">40-50%</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Tastings/Events</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">20-30%</p>
          </div>
          <div className="rounded-md bg-white p-3 shadow-sm">
            <p className="text-xs font-medium text-gray-500">Electronic Contact</p>
            <p className="mt-1 text-2xl font-bold text-gray-600">20-30%</p>
          </div>
        </div>
      </div>
    </main>
  );
}

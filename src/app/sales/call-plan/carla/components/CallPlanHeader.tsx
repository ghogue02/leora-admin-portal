"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface CallPlanHeaderProps {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  selectedCount: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onCreatePlan: () => void;
  onExportPDF: () => void;
  onSelectAccounts?: () => void;
  calendarSyncButton?: ReactNode;
}

export default function CallPlanHeader({
  weekStart,
  weekEnd,
  isCurrentWeek,
  selectedCount,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
  onCreatePlan,
  onExportPDF,
  onSelectAccounts,
  calendarSyncButton,
}: CallPlanHeaderProps) {
  const isUnderTarget = selectedCount < 30;

  const getCounterColor = () => (isUnderTarget ? "text-red-600" : "text-green-600");
  const getCounterBgColor = () => (isUnderTarget ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200");

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            CARLA - Call Routing & List Assignment
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">Account Selection</h1>
          <p className="mt-1 text-sm text-gray-600">
            Build your weekly call plan. Aim for at least 30 accounts to stay in rhythm.
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {calendarSyncButton}
          {onSelectAccounts && (
            <Button
              onClick={onSelectAccounts}
              variant="default"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Select Accounts
            </Button>
          )}

          <Button
            onClick={onExportPDF}
            variant="outline"
            disabled={selectedCount === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>

          <Button
            onClick={onCreatePlan}
            disabled={selectedCount === 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Save Plan
          </Button>
        </div>
      </div>

      {/* Compact Week Navigation & Selection Counter */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        {/* Compact Week Navigation */}
        <div className="flex items-center gap-1">
          <Button
            onClick={onPreviousWeek}
            variant="outline"
            size="sm"
            className="h-8 px-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 px-3">
            <Calendar className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-900">
              {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              {isCurrentWeek && <span className="ml-2 text-xs font-normal text-green-600">(Current Week)</span>}
            </span>
          </div>

          <Button
            onClick={onNextWeek}
            variant="outline"
            size="sm"
            className="h-8 px-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {!isCurrentWeek && (
            <Button onClick={onThisWeek} size="sm" className="h-8 ml-1">
              This Week
            </Button>
          )}
        </div>

        {/* Selection Counter with Color Coding */}
        <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${getCounterBgColor()}`}>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-600">Accounts Selected</p>
            <p className={`text-3xl font-bold ${getCounterColor()}`}>
              {selectedCount}
            </p>
            {isUnderTarget ? (
              <p className="text-xs text-red-600 mt-0.5">Add more accounts (target 30+)</p>
            ) : (
              <p className="text-xs text-green-600 mt-0.5">Ready for the week</p>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

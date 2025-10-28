"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, Plus, ChevronLeft, ChevronRight } from "lucide-react";

interface CallPlanHeaderProps {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  selectedCount: number;
  maxAccounts: number;
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
  maxAccounts,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
  onCreatePlan,
  onExportPDF,
  onSelectAccounts,
  calendarSyncButton,
}: CallPlanHeaderProps) {
  const isAtLimit = selectedCount >= maxAccounts;

  // Color coding based on account count
  const getCounterColor = () => {
    if (selectedCount < 60) return "text-red-600";
    if (selectedCount < 70) return "text-yellow-600";
    return "text-green-600";
  };

  const getCounterBgColor = () => {
    if (selectedCount < 60) return "bg-red-50 border-red-200";
    if (selectedCount < 70) return "bg-yellow-50 border-yellow-200";
    return "bg-green-50 border-green-200";
  };

  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
            CARLA - Call Routing & List Assignment
          </p>
          <h1 className="text-3xl font-semibold text-gray-900">Account Selection</h1>
          <p className="mt-1 text-sm text-gray-600">
            Select up to {maxAccounts} accounts for your weekly call plan
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

      {/* Week Navigation & Selection Counter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {/* Week Navigation */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onPreviousWeek}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center gap-2 px-4">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">
                    {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
                  </p>
                  {isCurrentWeek && (
                    <Badge variant="secondary" className="mt-1">
                      Current Week
                    </Badge>
                  )}
                </div>
              </div>

              <Button
                onClick={onNextWeek}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isCurrentWeek && (
                <Button onClick={onThisWeek} size="sm">
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
                  <span className="text-lg font-normal text-gray-500"> / {maxAccounts}</span>
                </p>
                {selectedCount < 60 && selectedCount > 0 && (
                  <p className="text-xs text-red-600 mt-0.5">Below target (60-75)</p>
                )}
                {selectedCount >= 60 && selectedCount < 70 && (
                  <p className="text-xs text-yellow-600 mt-0.5">Good progress</p>
                )}
                {selectedCount >= 70 && selectedCount <= 75 && (
                  <p className="text-xs text-green-600 mt-0.5">✓ Target range</p>
                )}
              </div>

              {isAtLimit && (
                <Badge variant="destructive">
                  Limit Reached
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </header>
  );
}

"use client";

import { CheckCircle, Phone, Users, Circle } from "lucide-react";
import type { WeeklyProgressData, RepProgress } from "../types";

interface WeeklyProgressProps {
  progress: WeeklyProgressData;
  repProgress?: RepProgress[];
  isManagementView?: boolean;
}

export default function WeeklyProgress({
  progress,
  repProgress,
  isManagementView = false,
}: WeeklyProgressProps) {
  const totalAccounts = progress.totalAccounts ?? 0;
  const totalReached = progress.contactedCount + progress.visitedCount;
  const safePercentage = (count: number) =>
    totalAccounts > 0 ? Math.round((count / totalAccounts) * 100) : 0;
  const rawProgress = Number.isFinite(progress.percentComplete)
    ? Math.round(progress.percentComplete)
    : safePercentage(totalReached);
  const progressPercentage = Math.min(100, Math.max(0, rawProgress));
  const contactedPercentage = safePercentage(progress.contactedCount);
  const visitedPercentage = safePercentage(progress.visitedCount);
  const notReachedPercentage = safePercentage(progress.notReachedCount);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {isManagementView ? "Team Progress" : "Weekly Progress"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {totalReached}
          </span>
          <span className="text-sm text-gray-500">
            / {totalAccounts} accounts
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Completion</span>
          <span className="font-semibold text-blue-600">{progressPercentage}%</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {/* Contacted (X) */}
        <div className="rounded-lg bg-blue-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Phone className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium uppercase tracking-wide text-blue-700">
              Contacted
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-blue-900">
              {progress.contactedCount}
            </span>
            <span className="text-sm text-blue-600">X</span>
          </div>
          <p className="mt-1 text-xs text-blue-700">
            {contactedPercentage}% of total
          </p>
        </div>

        {/* Visited (Y) */}
        <div className="rounded-lg bg-green-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium uppercase tracking-wide text-green-700">
              Visited
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-green-900">
              {progress.visitedCount}
            </span>
            <span className="text-sm text-green-600">Y</span>
          </div>
          <p className="mt-1 text-xs text-green-700">
            {visitedPercentage}% of total
          </p>
        </div>

        {/* Not Reached */}
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Circle className="h-5 w-5 text-gray-600" />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-700">
              Not Reached
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900">
              {progress.notReachedCount}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-700">
            {notReachedPercentage}% remaining
          </p>
        </div>
      </div>

      {/* Management View - Team Progress */}
      {isManagementView && repProgress && repProgress.length > 0 && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">
            Sales Rep Performance
          </h4>
          <div className="space-y-3">
            {repProgress.map((rep) => (
              <div
                key={rep.repId}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{rep.repName}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {rep.progress.contactedCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {rep.progress.visitedCount}
                    </span>
                    <span className="text-gray-500">
                      / {rep.progress.totalAccounts} accounts
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">
                    {Math.round(rep.progress.percentComplete)}%
                  </div>
                  <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${rep.progress.percentComplete}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {progressPercentage === 100 && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-100 p-3 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span className="text-sm font-medium">
            Week completed! All accounts have been contacted.
          </span>
        </div>
      )}
    </div>
  );
}

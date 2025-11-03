"use client";

import { CheckCircle, Phone, Users, Circle, Mail, MessageCircle } from "lucide-react";
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
  const totalReached =
    (progress.inPersonCount ?? 0) +
    (progress.phoneCount ?? 0) +
    (progress.emailCount ?? 0) +
    (progress.textCount ?? 0);
  const safePercentage = (count: number) =>
    totalAccounts > 0 ? Math.round((count / totalAccounts) * 100) : 0;
  const rawProgress = Number.isFinite(progress.percentComplete)
    ? Math.round(progress.percentComplete)
    : safePercentage(totalReached);
  const progressPercentage = Math.min(100, Math.max(0, rawProgress));
  const inPersonPercentage = safePercentage(progress.inPersonCount);
  const phonePercentage = safePercentage(progress.phoneCount);
  const emailPercentage = safePercentage(progress.emailCount);
  const textPercentage = safePercentage(progress.textCount);
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

      {/* Horizontal Stacked Bar Chart */}
      <div className="space-y-3">
        {/* Stacked Bar */}
        <div className="flex h-12 w-full overflow-hidden rounded-full border border-gray-300 shadow-sm">
          {inPersonPercentage > 0 && (
            <div
              className="bg-green-500 transition-all hover:bg-green-600"
              style={{ width: `${inPersonPercentage}%` }}
              title={`In-Person: ${progress.inPersonCount} (${inPersonPercentage}%)`}
            />
          )}
          {phonePercentage > 0 && (
            <div
              className="bg-blue-500 transition-all hover:bg-blue-600"
              style={{ width: `${phonePercentage}%` }}
              title={`Phone: ${progress.phoneCount} (${phonePercentage}%)`}
            />
          )}
          {emailPercentage > 0 && (
            <div
              className="bg-indigo-500 transition-all hover:bg-indigo-600"
              style={{ width: `${emailPercentage}%` }}
              title={`Email: ${progress.emailCount} (${emailPercentage}%)`}
            />
          )}
          {textPercentage > 0 && (
            <div
              className="bg-purple-500 transition-all hover:bg-purple-600"
              style={{ width: `${textPercentage}%` }}
              title={`Text: ${progress.textCount} (${textPercentage}%)`}
            />
          )}
          {notReachedPercentage > 0 && (
            <div
              className="bg-gray-400 transition-all hover:bg-gray-500"
              style={{ width: `${notReachedPercentage}%` }}
              title={`Not Reached: ${progress.notReachedCount} (${notReachedPercentage}%)`}
            />
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-5">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-green-500" />
            <span className="font-medium text-gray-900">In-Person:</span>
            <span className="text-gray-600">{progress.inPersonCount} ({inPersonPercentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-blue-500" />
            <span className="font-medium text-gray-900">Phone:</span>
            <span className="text-gray-600">{progress.phoneCount} ({phonePercentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-indigo-500" />
            <span className="font-medium text-gray-900">Email:</span>
            <span className="text-gray-600">{progress.emailCount} ({emailPercentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-purple-500" />
            <span className="font-medium text-gray-900">Text:</span>
            <span className="text-gray-600">{progress.textCount} ({textPercentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-gray-400" />
            <span className="font-medium text-gray-900">Not Reached:</span>
            <span className="text-gray-600">{progress.notReachedCount} ({notReachedPercentage}%)</span>
          </div>
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
                      <Users className="h-3 w-3 text-green-600" />
                      {rep.progress.inPersonCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-blue-600" />
                      {rep.progress.phoneCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 text-indigo-600" />
                      {rep.progress.emailCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-purple-600" />
                      {rep.progress.textCount}
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
